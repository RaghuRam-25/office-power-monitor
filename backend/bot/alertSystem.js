const Device = require('../models/Device');
const { getHumanizedResponse } = require('./aiHelper');
const NotificationLog = require('../models/NotificationLog'); // 🆕 নতুন মডেল ইম্পোর্ট

let ioInstance = null;

async function checkAlerts(client) {
  try {
    const devices = await Device.find();
    const currentHour = new Date().getHours();
    const isAfterHours = currentHour >= 17 || currentHour < 9;

    const alerts = [];

    devices.forEach((device) => {
      if (device.status === 'on' || device.status === true) {
        if (isAfterHours) {
          alerts.push({
            type: 'After Hours',
            device: `${device.room} - ${device.name}`,
            info: 'Device is running outside shift hours.',
          });
        }

        if (device.lastChanged || device.last_changed) {
          const rawDate = device.lastChanged || device.last_changed;
          const hoursRunning = (new Date() - new Date(rawDate)) / (1000 * 60 * 60);
          if (hoursRunning >= 2) {
            alerts.push({
              type: 'Continuous Usage',
              device: `${device.room} - ${device.name}`,
              info: `Running continuously for more than ${Math.floor(hoursRunning)} hours.`,
            });
          }
        }
      }
    });

    if (alerts.length > 0) {
      console.log(`🚨 Triggered ${alerts.length} alerts. Processing with AI...`);

      const rawText = `Alerts: ${JSON.stringify(alerts)}`;
      const aiMessage = await getHumanizedResponse(rawText);

      if (ioInstance) {
        ioInstance.emit('newAlerts', {
          success: true,
          alerts: alerts,
          aiSummary: aiMessage
        });
      }

      const channelId = process.env.DISCORD_CHANNEL_ID;
      if (channelId && client) {
        try {
          const channel = await client.channels.fetch(channelId);
          if (channel) {
            await channel.send(`📢 **System Alert**\n${aiMessage}`);
            
            // 🆕 ডিসকর্ডে পাঠানোর পর ডাটাবেজে লগ সেভ করা
            const log = new NotificationLog({
              message: aiMessage,
              channelId: channelId,
              timestamp: new Date()
            });
            const savedLog = await log.save();
            console.log('💾 Discord log saved to DB with ID:', savedLog._id.toString());

            // 🆕 সকেটের মাধ্যমে ফ্রন্টএন্ডকে জানানো যে নতুন নোটিফিকেশন লগ এসেছে
            if (ioInstance) {
              // MongoDB document কে plain object এ convert করা
              const logObject = {
                _id: savedLog._id.toString(),
                message: savedLog.message,
                timestamp: savedLog.timestamp.toISOString(),
                channelId: savedLog.channelId
              };
              console.log('📡 Emitting newDiscordLog event to all clients with message:', logObject.message.substring(0, 50) + '...');
              ioInstance.emit('newDiscordLog', logObject);
              console.log('✅ newDiscordLog event sent successfully');
            } else {
              console.warn('⚠️ ioInstance not available, cannot emit to clients');
            }

            console.log('✅ Discord notification sent and logged successfully');
          } else {
            console.warn('⚠️ Discord channel not found:', channelId);
          }
        } catch (channelError) {
          console.error('❌ Error fetching Discord channel:', channelError.message);
        }
      } else {
        console.warn('⚠️ No Discord channel configured or client unavailable');
      }
    } else {
      if (ioInstance) {
        ioInstance.emit('newAlerts', { success: true, alerts: [], aiSummary: "" });
      }
    }
  } catch (error) {
    console.error('❌ Error in alert system:', error);
  }
}

function startAlertSystem(client, io) {
  if (io) ioInstance = io;
  console.log('📋 Alert system started. Checking every 60 seconds...');
  setInterval(() => checkAlerts(client), 60000);
  checkAlerts(client);
}

module.exports = { startAlertSystem };