import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState({ title: '', description: '' });

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/tasks');
      const data = await response.json();
      setTasks(data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewTask({ ...newTask, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await fetch('http://localhost:5000/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newTask),
      });
      // After adding a new task, refetch the list to update the display
      fetchTasks();
      // Clear the form fields
      setNewTask({ title: '', description: '' });
    } catch (error) {
      console.error('Error adding new task:', error);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Full-Stack Task App</h1>
      </header>
      <main>
        <h2>Create New Task</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="title"
            placeholder="Task Title"
            value={newTask.title}
            onChange={handleInputChange}
            required
          />
          <textarea
            name="description"
            placeholder="Task Description"
            value={newTask.description}
            onChange={handleInputChange}
            required
          />
          <button type="submit">Add Task</button>
        </form>
        <hr />
        <h2>Your Tasks</h2>
        {tasks.length === 0 ? (
          <p>No tasks found.</p>
        ) : (
          <ul>
            {tasks.map((task) => (
              <li key={task.id}>
                <h3>{task.title}</h3>
                <p>{task.description}</p>
                <p>Status: {task.status}</p>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

export default App;