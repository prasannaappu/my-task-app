require('dotenv').config();
const express = require('express');
const app = express();
const PORT = process.env.PORT || 5000;

// Import and use cors middleware to allow cross-origin requests
const cors = require('cors');
app.use(cors());

// Use express.json() to parse incoming JSON payloads
app.use(express.json());

// Dummy data for our tasks
const tasks = [
  { id: 1, title: 'Learn Node.js', description: 'Complete an online course on Node.js.', status: 'in-progress' },
  { id: 2, title: 'Build a React App', description: 'Create a simple frontend for the task app.', status: 'pending' },
  { id: 3, title: 'Deploy to a server', description: 'Get the app running online.', status: 'pending' },
];

// Route to get all tasks
app.get('/api/tasks', (req, res) => {
  res.json(tasks);
});

// Route to create a new task
app.post('/api/tasks', (req, res) => {
  const newTask = req.body;
  // Assign a new ID (in a real app, this would be handled by a database)
  newTask.id = tasks.length + 1;
  newTask.status = 'pending'; // Set default status
  tasks.push(newTask);
  res.status(201).json(newTask); // 201 Created status code
});

// A simple root route
app.get('/', (req, res) => {
  res.send('Welcome to the Task App API');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});