const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  deviceId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  room: { type: String, required: true, enum: ['Drawing Room', 'Work Room 1', 'Work Room 2'] },
  status: { type: String, required: true, enum: ['on', 'off'], default: 'off' },
  powerDraw: { type: Number, required: true }, // Wattage যখন ON থাকবে
  lastChanged: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Device', deviceSchema);