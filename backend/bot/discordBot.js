const { Client, GatewayIntentBits } = require('discord.js');
const Device = require('../models/Device');
const { getHumanizedResponse } = require('./aiHelper');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ----------------------------------------------------
// ব্যাকগ্রাউন্ড অটো-অ্যালার্ট ফাংশন (আপনার কাস্টম অ্যালার্ট ফরম্যাট অনুযায়ী)
// ----------------------------------------------------
async function checkOffHoursDevices() {
  try {
    const currentHour = new Date().getHours();
    
    // অফিস টাইম সকাল ৯টা থেকে সন্ধ্যা ৫টা (৯ থেকে ১৭)। এর বাইরে হলে অ্যালার্ট ট্রিগার হবে।
    const isOutsideHours = currentHour < 9 || currentHour >= 17;

    if (isOutsideHours) {
      // অফ-আওয়ারে কোন কোন ডিভাইস এখনও ON আছে তা ডাটাবেজ থেকে খোঁজা
      const activeDevices = await Device.find({ 
        $or: [{ status: 'on' }, { status: true }] 
      });

      if (activeDevices.length > 0) {
        const channelId = process.env.DISCORD_CHANNEL_ID;
        if (!channelId) {
          console.warn("⚠️ Warning: DISCORD_CHANNEL_ID missing in .env file!");
          return;
        }

        const channel = await client.channels.fetch(channelId);
        if (!channel) return;

        // রুমের জন্য নির্দিষ্ট ইমোজি ম্যাপিং
        const roomEmojis = {
          'Drawing Room': '🛋️',
          'Work Room 1': '💻',
          'Work Room 2': '🚀'
        };

        // ডিভাইসগুলোকে রুম অনুযায়ী গ্রুপ করা হচ্ছে
        const groupedRooms = {};
        activeDevices.forEach(d => {
          if (!groupedRooms[d.room]) groupedRooms[d.room] = [];
          groupedRooms[d.room].push(d);
        });

        // আপনার রিকোয়ারমেন্ট অনুযায়ী হুবহু টেক্সট ফরম্যাট তৈরি করা
        const reportLines = Object.entries(groupedRooms).map(([roomName, devices]) => {
          const emoji = roomEmojis[roomName] || '🏢';
          
          const deviceStrings = devices.map(d => {
            const deviceIcon = d.name.includes('Fan') ? '🌀' : '💡';
            return `• ${d.name}: Running for 2+ hours ${deviceIcon}`;
          }).join('\n');

          return `${emoji} **${roomName}**\n${deviceStrings}`;
        });

        // সম্পূর্ণ মেসেজ বডি একসাথে জোড়া দেওয়া
        const finalAlertMessage = [
          '📢 **Urgent System Alerts Report**',
          '🚨 **Status: Urgent Alerts Triggered!**',
          '',
          ...reportLines
        ].join('\n');

        // ডিসকর্ড চ্যানেলে অটোমেটিক মেসেজ পাঠানো
        await channel.send(finalAlertMessage);
      }
    }
  } catch (error) {
    console.error("❌ Background Alert Error:", error);
  }
}

client.once('ready', () => {
  console.log(`🤖 Discord Bot logged in as ${client.user.tag}!`);

  // বট রান হওয়ার পর প্রতি ৫ মিনিটে (৩০০,০০০ মিলিসেকেন্ড) একবার স্বয়ংক্রিয়ভাবে ব্যাকগ্রাউন্ড চেক করবে
  setInterval(checkOffHoursDevices, 5 * 60 * 1000);
  
  // বট চালু হওয়ার সাথে সাথেই প্রথমবার একবার রান করবে
  checkOffHoursDevices(); 
});

client.on('messageCreate', async (message) => {
  // বট নিজে মেসেজ দিলে বা ! দিয়ে শুরু না হলে ইগনোর করবে
  if (message.author.bot || !message.content.startsWith('!')) return;

  const args = message.content.slice(1).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  try {
    // ----------------------------------------------------
    // ১. !status কমান্ড: সব রুমের ওভারভিউ
    // ----------------------------------------------------
    if (command === 'status') {
      const devices = await Device.find();
      
      const roomEmojis = {
        'Drawing Room': '🛋️',
        'Work Room 1': '💻',
        'Work Room 2': '🚀'
      };

      const roomSummary = {};
      devices.forEach(d => {
        if (!roomSummary[d.room]) roomSummary[d.room] = { fansOn: 0, lightsOn: 0 };
        if (d.status === 'on' || d.status === true) {
          if (d.name.includes('Fan')) roomSummary[d.room].fansOn++;
          if (d.name.includes('Light')) roomSummary[d.room].lightsOn++;
        }
      });

      const summaryLines = Object.entries(roomSummary).map(([room, info]) => {
        const emoji = roomEmojis[room] || '🏢';
        return `${emoji} ${room}: ${info.fansOn} fan ON, ${info.lightsOn} lights ON.`;
      });

      const formattedReply = [
        '📢 **Current office status:**',
        ...summaryLines
      ].join('\n');

      return message.reply(formattedReply);
    }

    // ----------------------------------------------------
    // ২. !room <room_name> কমান্ড
    // ----------------------------------------------------
    if (command === 'room') {
      const roomInput = args.join(' ').toLowerCase();
      let targetRoom = "";

      if (roomInput.includes('draw')) targetRoom = "Drawing Room";
      else if (roomInput.includes('1')) targetRoom = "Work Room 1";
      else if (roomInput.includes('2')) targetRoom = "Work Room 2";
      else {
        return message.reply("Sir, please specify the room correctly (e.g., `!room drawing`, `!room work 1`, `!room work 2`).");
      }

      const roomDevices = await Device.find({ room: targetRoom }) || [];

      const deviceLines = roomDevices.map((device) => {
        const isDeviceOn = device.status === 'on' || device.status === true;
        const statusStr = isDeviceOn ? '**ON**' : '**OFF**';
        
        const rawDate = device.lastChanged || device.last_changed;
        const lastChangedTime = rawDate
          ? new Date(rawDate).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })
          : 'Unknown';
          
        return `• ${device.name}: ${statusStr} (Last changes: ${lastChangedTime})`;
      });

      const formattedRoomReply = [
        `🏢 **${targetRoom}-List of devices:**`,
        ...deviceLines,
      ].join('\n');

      return message.reply(formattedRoomReply);
    }

    // ----------------------------------------------------
    // ৩. !usage কমান্ড: পাওয়ার ড্র রিপোর্ট
    // ----------------------------------------------------
    if (command === 'usage') {
      const devices = await Device.find();
      
      let totalPowerNow = 0;
      devices.forEach(d => {
        if (d.status === 'on' || d.status === true) {
          totalPowerNow += (d.powerDraw || d.consumption || 0);
        }
      });

      const estimatedKWhPerHour = (totalPowerNow / 1000).toFixed(2); 

      const usageReply = [
        '⚡ **Power Consumption Report:**',
        `• Total electricity consumption at the moment: **${totalPowerNow}W**`,
        `• Estimated usage per hour at current rate: **${estimatedKWhPerHour} kWh**`,
      ].join('\n');

      return message.reply(usageReply);
    }

  } catch (err) {
    console.error("Bot Command Error:", err);
    message.reply("Oops! Something went wrong behind the scenes while checking the devices.");
  }
});

module.exports = client;