require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
// const jwt = require('jsonwebtoken'); // REMOVED: jwt import
const Task = require('./Task');
const User = require('./User');
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

// -- Auth Routes (Will be removed in next step) --
app.post('/api/users/register', async (req, res) => {
  // DEBUG: Log the entire request body
  console.log('Received registration request with body:', req.body);

  const { username, password } = req.body;
  console.log('Register attempt for username:', username);
  console.log('Received password length:', password ? password.length : 0);

  try {
    const userExists = await User.findOne({ username });
    if (userExists) {
      console.log('User already exists:', username);
      return res.status(400).json({ message: 'User already exists' });
    }

    console.log('Attempting to create new user:', username);
    const user = await User.create({ username, password });
    console.log('User created in DB, ID:', user._id);

    res.status(201).json({
      _id: user._id,
      username: user.username,
      // token: generateToken(user._id), // This line will cause an error now as generateToken is removed
    });
    console.log('Registration successful, token generated for user:', user._id);
  } catch (error) {
    console.error('Registration failed for user:', username, 'Error:', error.message);
    console.error('Full error object:', error);
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/users/login', async (req, res) => {
  const { username, password } = req.body;
  console.log('Login attempt for username:', username); // DEBUG: Add for login too
  try {
    const user = await User.findOne({ username });
    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        username: user.username,
        // token: generateToken(user._id), // This line will cause an error now as generateToken is removed
      });
      console.log('Login successful for user:', user._id); // DEBUG: Login success
    } else {
      console.log('Invalid login attempt for username:', username); // DEBUG: Invalid login
      res.status(401).json({ message: 'Invalid username or password' });
    }
  } catch (error) {
    console.error('Login failed for user:', username, 'Error:', error.message); // DEBUG: Login error
    res.status(500).json({ message: error.message });
  }
});

// -- User Profile Routes (Will be removed or modified in later steps) --
app.get('/api/users/profile', /* protect, */ (req, res) => { // 'protect' will be removed in a later step
  // const { _id, username } = req.user; // req.user will be undefined without protect
  // res.json({ _id, username });
  res.status(404).json({ message: 'User profiles no longer supported' }); // Temporary response
});

app.put('/api/users/profile', /* protect, */ async (req, res) => { // 'protect' will be removed in a later step
  // const { username, password } = req.body;
  // try {
  //   const user = await User.findById(req.user._id); // req.user will be undefined without protect
  //   // ... rest of profile update logic ...
  // } catch (error) {
  //   res.status(500).json({ message: error.message });
  // }
  res.status(404).json({ message: 'User profiles no longer supported' }); // Temporary response
});

// -- Task Routes (Will be modified in later steps) --
app.get('/api/tasks', protect, async (req, res) => { // 'protect' will be removed in a later step
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

app.post('/api/tasks', protect, async (req, res) => { // 'protect' will be removed in a later step
  const { title, description, dueDate } = req.body;
  const task = new Task({
    title,
    description,
    dueDate,
    user: req.user._id, // Assign task to logged-in user (will be removed in a later step)
  });
  try {
    const newTask = await task.save();
    res.status(201).json(newTask);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.put('/api/tasks/:id', protect, async (req, res) => { // 'protect' will be removed in a later step
  try {
    const { id } = req.params;
    const { title, description, status, dueDate } = req.body;
    const task = await Task.findOne({ _id: id, user: req.user._id }); // User check will be removed
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

app.delete('/api/tasks/:id', protect, async (req, res) => { // 'protect' will be removed in a later step
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user._id }); // User check will be removed
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
