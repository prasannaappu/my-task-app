require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); // Keep this line
const jwt = require('jsonwebtoken');
const Task = require('./Task');
const User = require('./User');
const { protect } = require('./authMiddleware');
// const multer = require('multer'); // Removed multer import
// const path = require('path'); // Removed path import
const app = express();
const PORT = process.env.PORT || 5000;

// TEMPORARY DEBUG: Log the JWT_SECRET being used
console.log('Backend JWT_SECRET (from process.env):', process.env.JWT_SECRET);
// You might also want to log its length to check for extra spaces:
console.log('JWT_SECRET length:', process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0);

app.use(express.json());

// Explicit CORS configuration
const corsOptions = {
  origin: 'https://my-task-app-frontend-live.vercel.app', // Your Vercel frontend URL
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true, // Allow cookies to be sent
  optionsSuccessStatus: 204 // Some legacy browsers (IE11, various SmartTVs) choke on 200
};
app.use(cors(corsOptions)); // Use the explicit options

// app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Removed static serving of uploads

mongoose.connect(process.env.DATABASE_URL)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB...', err));

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1h' });
};

// -- Multer configuration for file uploads (Removed) --
/*
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });
*/

// -- Auth Routes --
app.post('/api/users/register', async (req, res) => {
  const { username, password } = req.body;
  console.log('Register attempt for username:', username); // DEBUG: Log incoming username
  console.log('Received password length:', password ? password.length : 0); // DEBUG: Log password length

  try {
    const userExists = await User.findOne({ username });
    if (userExists) {
      console.log('User already exists:', username); // DEBUG: Log if user exists
      return res.status(400).json({ message: 'User already exists' });
    }

    console.log('Attempting to create new user:', username); // DEBUG: Before user creation
    const user = await User.create({ username, password }); // This triggers the pre('save') hook for hashing
    console.log('User created in DB, ID:', user._id); // DEBUG: After successful user creation

    res.status(201).json({
      _id: user._id,
      username: user.username,
      token: generateToken(user._id),
    });
    console.log('Registration successful, token generated for user:', user._id); // DEBUG: Success path
  } catch (error) {
    console.error('Registration failed for user:', username, 'Error:', error.message); // DEBUG: Log specific error
    console.error('Full error object:', error); // DEBUG: Log full error object for more detail
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/users/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        username: user.username,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid username or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// -- User Profile Routes --
app.get('/api/users/profile', protect, (req, res) => {
  const { _id, username } = req.user; // Corrected: Removed extra '}'
  res.json({ _id, username });
});

app.put('/api/users/profile', protect, /* upload.single('profilePicture'), */ async (req, res) => { // Removed multer middleware
  const { username, password } = req.body;
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.username = username || user.username;
      if (password) {
        user.password = password;
      }
      // if (req.file) { // Removed profilePicture handling
      //   user.profilePicture = `/uploads/${req.file.filename}`;
      // }
      const updatedUser = await user.save();
      res.json({
        _id: updatedUser._id,
        username: updatedUser.username,
        // profilePicture: updatedUser.profilePicture, // Removed profilePicture
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// -- Task Routes (Protected) --
app.get('/api/tasks', protect, async (req, res) => {
  try {
    const { status, sortBy } = req.query;
    let filter = { user: req.user._id };
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

app.post('/api/tasks', protect, async (req, res) => {
  const { title, description, dueDate } = req.body;
  const task = new Task({
    title,
    description,
    dueDate,
    user: req.user._id, // Assign task to logged-in user
  });
  try {
    const newTask = await task.save();
    res.status(201).json(newTask);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.put('/api/tasks/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, dueDate } = req.body;
    const task = await Task.findOne({ _id: id, user: req.user._id });
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

app.delete('/api/tasks/:id', protect, async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user._id });
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
