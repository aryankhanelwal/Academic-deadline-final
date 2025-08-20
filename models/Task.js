// backend/models/Task.js
const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  taskid: { type: String, unique: true, default: () => 'TASK-' + Date.now().toString().slice(-6) }, // Generate unique task ID
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Reference to the user who created the task
  title: { type: String, required: true },
  category: { type: String },
  date: { type: Date },
  notes: { type: String },
  isPriority: { type: Boolean, default: false },
  isRecurring: { type: Boolean, default: false }
}, {
  timestamps: true // Automatically manage createdAt and updatedAt fields
});

module.exports = mongoose.model('Task', taskSchema);