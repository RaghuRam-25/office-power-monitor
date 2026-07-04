const mongoose = require('mongoose');

const NotificationLogSchema = new mongoose.Schema({
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  channelId: { type: String }
});

module.exports = mongoose.model('NotificationLog', NotificationLogSchema);