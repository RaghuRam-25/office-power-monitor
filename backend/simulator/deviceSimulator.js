const Device = require('../models/Device');

// ১. ১৮টি প্রাথমিক ডিভাইস ডেটাবেজে ইনসার্ট করার ফাংশন
const seedDevices = async () => {
  const count = await Device.countDocuments();
  if (count === 0) {
    const rooms = ['Drawing Room', 'Work Room 1', 'Work Room 2'];
    const initialDevices = [];

    rooms.forEach(room => {
      // ৩টি করে লাইট
      for (let i = 1; i <= 3; i++) {
        initialDevices.push({
          deviceId: `${room.replace(/\s+/g, '')}_Light${i}`,
          name: `Light ${i}`,
          room: room,
          status: 'off',
          powerDraw: 15, // ১৫ ওয়াট
          lastChanged: new Date()
        });
      }
      // ২টি করে ফ্যান
      for (let i = 1; i <= 2; i++) {
        initialDevices.push({
          deviceId: `${room.replace(/\s+/g, '')}_Fan${i}`,
          name: `Fan ${i}`,
          room: room,
          status: 'off',
          powerDraw: 60, // ৬০ ওয়াট
          lastChanged: new Date()
        });
      }
    });

    await Device.insertMany(initialDevices);
    console.log("✅ 18 Devices seeded into the database successfully!");
  }
};

// ২. র্যান্ডম স্টেট চেঞ্জার (সিমুলেটর)
const startSimulator = (io) => {
  setInterval(async () => {
    try {
      const devices = await Device.find();
      if (devices.length === 0) return;

      const randomDevice = devices[Math.floor(Math.random() * devices.length)];
      const nextStatus = randomDevice.status === 'on' ? 'off' : 'on';

      randomDevice.status = nextStatus;
      randomDevice.lastChanged = new Date();
      await randomDevice.save();

      console.log(`[Simulator] ${randomDevice.room} - ${randomDevice.name} turned ${nextStatus}`);

      // ⚡ সকেটের মাধ্যমে ফ্রন্টএন্ডে রিয়েল-টাইম ব্রডকাস্ট
      io.emit('deviceUpdate', randomDevice);

    } catch (err) {
      console.error("Simulator Error:", err);
    }
  }, 10000); 
};

module.exports = { seedDevices, startSimulator };