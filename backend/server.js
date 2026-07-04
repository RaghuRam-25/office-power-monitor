const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors'); // CORS প্যাকেজ ইম্পোর্ট
require('dotenv').config();

// ইমপোর্টস
const { seedDevices, startSimulator } = require('./simulator/deviceSimulator');
const { startAlertSystem } = require('./bot/alertSystem'); 
const discordClient = require('./bot/discordBot'); 
const Device = require('./models/Device');
const NotificationLog = require('./models/NotificationLog'); // 🆕 নোটিফিকেশন লগ মডেল ইম্পোর্ট

const app = express();
const server = http.createServer(app);

// 🛡️ ১. এক্সপ্রেস অ্যাপের জন্য CORS এবং JSON মিডলওয়্যার সেটআপ
app.use(cors({ origin: "*" })); // ফ্রন্টএন্ড যাতে অনায়াসে ডেটা অ্যাক্সেস করতে পারে
app.use(express.json());

// ⚡ ২. সকেট ডট আইও সেটআপ
const io = new Server(server, {
  cors: { origin: "*" }
});

// --- API ROUTES ---

// 📋 API: ড্যাশবোর্ড প্রথমবার লোড হলে সব ডেটা নেওয়ার জন্য
app.get('/api/devices', async (req, res) => {
  try {
    const devices = await Device.find();
    res.json(devices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔄 🔹 নতুন এপিআই: ফ্রন্টএন্ড থেকে ডিভাইসের সুইচ অন/অফ (টগল) করার জন্য
app.post('/api/devices/:deviceId/toggle', async (req, res) => {
  try {
    const { deviceId } = req.params;
    
    // ডাটাবেজ থেকে ডিভাইসটি খোঁজা (id অথবা deviceId ফিল্ড দিয়ে)
    const device = await Device.findOne({ $or: [{ id: deviceId }, { deviceId: deviceId }] });
    
    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    const nextStatus = device.status === 'on' ? 'off' : 'on';
    device.status = nextStatus;
    device.lastChanged = new Date();
    await device.save();

    const payload = {
      ...device.toObject(),
      id: device.deviceId,
      deviceId: device.deviceId,
      status: nextStatus === 'on',
      power_watt: device.powerDraw,
      last_changed: device.lastChanged.toISOString(),
      room: device.room,
    };

    io.emit('deviceUpdate', payload);

    res.json({ success: true, device: payload });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📋 🆕 নতুন API: ডিসকর্ড নোটিফিকেশন হিস্ট্রি পাওয়ার জন্য (সর্বশেষ ১০টি লগ সর্ট হয়ে আসবে)
app.get('/api/discord-logs', async (req, res) => {
  try {
    console.log('📋 Fetching Discord logs from database...');
    const logs = await NotificationLog.find().sort({ timestamp: -1 }).limit(10);
    console.log(`✅ Found ${logs.length} Discord logs`);
    
    // Database documents কে plain objects এ convert করা
    const logsData = logs.map(log => ({
      _id: log._id.toString(),
      message: log.message,
      timestamp: log.timestamp.toISOString(),
      channelId: log.channelId
    }));
    
    res.json(logsData);
  } catch (err) {
    console.error('❌ Error fetching Discord logs:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// --- DATABASE CONNECTION & SERVER START ---
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("🔹 MongoDB Connected...");
    
    // ডাটাবেজে ডিভাইস সিড করা (না থাকলে)
    await seedDevices(); 
    
    // লাইভ ডাটা সিমুলেটর চালু করা
    startSimulator(io);  
    
    // 🤖 ডিসকর্ড বট রেডি হওয়ার পর অ্যালার্ট সিস্টেম চালু করা
    discordClient.once('ready', () => {
      console.log(`🤖 Discord Bot logged in as ${discordClient.user.tag}`);
      // discordClient এর পাশাপাশি সকেট io ইনস্ট্যান্সটিও পাস করা হলো
      startAlertSystem(discordClient, io); 
    });

    // ডিসকর্ড বট লগইন করা
    await discordClient.login(process.env.DISCORD_TOKEN);
    
    // এক্সপ্রেস ও সকেট সার্ভার লিসেন করা
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch(err => console.log("DB Connection Error:", err));