require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
// const jwt = require('jsonwebtoken'); // REMOVED: jwt import
const Task = require('./Task');
const User = require('./User'); // User model is still imported, but its methods like matchPassword won't be used by server.js anymore
// const { protect } = require('./authMiddleware'); // REMOVED: protect import
const app = express();
const PORT = process.env.PORT || 5000;

// Removed TEMPORARY DEBUG: Log the JWT_SECRET being used
// console.log('Backend JWT_SECRET (from process.env):', process.env.JWT_SECRET);
// console.log('JWT_SECRET length:', process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0);

app.use(express.json());

// Explicit CORS configuration (keeping this for frontend access)
const corsOptions = {
  origin: 'https://my-task-app-frontend-live.vercel.app', // Your Vercel frontend URL
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 204
};
app.use(cors(corsOptions)); // Use the explicit options

mongoose.connect(process.env.DATABASE_URL)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB...', err));

// REMOVED: generateToken function
// const generateToken = (id) => {
//   return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1h' });
// };

// -- Auth Routes (Completely Removed) --
// app.post('/api/users/register', async (req, res) => { /* ... */ });
// app.post('/api/users/login', async (req, res) => { /* ... */ });

// -- User Profile Routes (Completely Removed as they relied on authentication) --
// app.get('/api/users/profile', protect, (req, res) => { /* ... */ });
// app.put('/api/users/profile', protect, async (req, res) => { /* ... */ });

// -- Task Routes (Now Unprotected and Global) --
// Tasks will no longer be associated with a specific user as authentication is removed.
// They will operate on a global level.
app.get('/api/tasks', async (req, res) => { // REMOVED: protect middleware
  try {
    const { status, sortBy } = req.query;
    let filter = {}; // Filter is now global, not by user
    if (status) {
      filter.status = status;
    }
    let sort = {};
    if (sortBy) {
      const parts = sortBy.split(':');
      sort[parts[0]] = parts[1] === 'desc' ? -1 : 1;
    } else {
      sort.createdAt = -1;
    }
    const tasks = await Task.find(filter).sort(sort);
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/tasks', async (req, res) => { // REMOVED: protect middleware
  const { title, description, dueDate } = req.body;
  const task = new Task({
    title,
    description,
    dueDate,
    // user: req.user._id, // REMOVED: user assignment
  });
  try {
    const newTask = await task.save();
    res.status(201).json(newTask);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.put('/api/tasks/:id', async (req, res) => { // REMOVED: protect middleware
  try {
    const { id } = req.params;
    const { title, description, status, dueDate } = req.body;
    // const task = await Task.findOne({ _id: id, user: req.user._id }); // REMOVED: user check
    const task = await Task.findById(id); // Find task by ID only
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    const updatedTask = await Task.findByIdAndUpdate(
      id,
      { title, description, status, dueDate },
      { new: true }
    );
    res.json(updatedTask);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.delete('/api/tasks/:id', async (req, res) => { // REMOVED: protect middleware
  try {
    // const task = await Task.findOne({ _id: req.params.id, user: req.user._id }); // REMOVED: user check
    const task = await Task.findById(req.params.id); // Find task by ID only
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    await task.deleteOne();
    res.json({ message: 'Task deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
