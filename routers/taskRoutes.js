const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const Task = require('../models/Task');
const { requireAuth } = require('../middleware/auth');


// Create Task
router.post('/add', requireAuth, async (req, res) => {
  try {
    const task = new Task({ ...req.body, userId: req.user._id }); // Assign task to current user
    await task.save();
    res.status(201).json(task);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


// Get All Tasks for the logged-in user
router.get('/', requireAuth, async (req, res) => {
  const tasks = await Task.find({ userId: req.user._id }); // Fetch only user-specific tasks
  res.json(tasks);
});

// Get Single Task by ID for the logged-in user
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.user._id });
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found or access denied' });
    }
    
    res.json(task);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update Task
router.put('/:id', requireAuth, async (req, res) => {
  try {
    // Only allow users to update their own tasks
    const updatedTask = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id }, // Ensure task belongs to user
      req.body, 
      { new: true }
    );
    
    if (!updatedTask) {
      return res.status(404).json({ error: 'Task not found or access denied' });
    }
    
    res.json(updatedTask);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete Task
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    // Only allow users to delete their own tasks
    const deletedTask = await Task.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    
    if (!deletedTask) {
      return res.status(404).json({ error: 'Task not found or access denied' });
    }
    
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;