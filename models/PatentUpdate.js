const mongoose = require('mongoose');

const PatentUpdateSchema = new mongoose.Schema({
  profileImage: String,
  code: { type: String, required: true },
  type: { type: String, required: true },
  isForInstructor: { type: Boolean, required: true, default: false },
  isForTrainer: { type: Boolean, required: true, default: false },
  description: { type: String, required: true },
  cost: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.model('PatentUpdate', PatentUpdateSchema);