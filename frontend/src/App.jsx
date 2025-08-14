import { useState, useEffect } from 'react';
import './App.css';

function App() {
  // REMOVED: Authentication states
  // const [user, setUser] = useState(null);
  // const [token, setToken] = useState(localStorage.getItem('token') || null);
  // const [isRegistering, setIsRegistering] = useState(false);
  // const [authUsername, setAuthUsername] = useState('');
  // const [authPassword, setAuthPassword] = useState('');

  // Task states (keep these)
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState(''); // Corrected: Use useState('')
  const [dueDate, setDueDate] = useState('');     // Corrected: Use useState('')
  const [editingTask, setEditingTask] = useState(null);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [editedDueDate, setEditedDueDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortOption, setSortOption] = useState('createdAt:desc');
  const [view, setView] = useState('tasks'); // Controls main view: 'tasks' or 'profile'

  // Notification state (keep these, but adjust related logic later)
  const [notifiedTasks, setNotifiedTasks] = useState(new Set()); // Stores IDs of tasks for which a notification has already been shown

  // Define the backend URL dynamically (keep this)
  const BACKEND_URL = import.meta.env.VITE_REACT_APP_BACKEND_URL || 'http://localhost:5000';

  // --- Fetching Data ---
  const fetchTasks = (status = 'all', sort = 'createdAt:desc') => {
    // REMOVED: if (!token) return;

    let url = `${BACKEND_URL}/api/tasks`; // Updated URL
    const params = [];
    if (status !== 'all') {
      params.push(`status=${status}`);
    }
    if (sort) {
      params.push(`sortBy=${sort}`);
    }
    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }

    fetch(url, {
      method: 'GET',
      headers: {
        // 'Authorization': `Bearer ${token}` // This will be removed in a later step
      }
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to fetch tasks');
        }
        return response.json();
      })
      .then(data => {
        setTasks(data);
        checkAndNotifyDueTasks(data);
      })
      .catch(error => console.error('Error fetching tasks:', error));
  };

  // REMOVED: fetchProfile function
  // const fetchProfile = async () => { /* ... */ };

  // Effect to fetch tasks (profile fetch removed)
  useEffect(() => {
    // REMOVED: if (token) { fetchProfile(); }
    fetchTasks(filterStatus, sortOption); // Always fetch tasks, no auth dependency
  }, [filterStatus, sortOption]); // token removed from dependency array

  // --- Notification Logic --- (Keep these, but ensure they don't depend on auth)
  const requestNotificationPermission = () => {
    if (!('Notification' in window)) {
      console.warn('This browser does not support desktop notification');
      return;
    }

    if (Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          console.log('Notification permission granted.');
        } else {
          console.warn('Notification permission denied.');
        }
      });
    }
  };

  const checkAndNotifyDueTasks = (currentTasks) => {
    if (Notification.permission !== 'granted') {
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    currentTasks.forEach(task => {
      if (task.status === 'pending' && task.dueDate && !notifiedTasks.has(task._id)) {
        const taskDueDate = new Date(task.dueDate);
        taskDueDate.setHours(0, 0, 0, 0);

        if (taskDueDate.getTime() <= today.getTime()) {
          new Notification('Task Due!', {
            body: `${task.title} is due today or overdue.`,
            icon: 'https://placehold.co/40x40/000/fff?text=T'
          });
          setNotifiedTasks(prev => new Set(prev).add(task._id));
        }
      }
    });
  };

  // --- REMOVED: Authentication Handlers ---
  // const handleAuthSubmit = async (e) => { /* ... */ };
  // const handleLogout = () => { /* ... */ };

  // --- Task Handlers --- (Will be modified in later steps to remove auth headers)
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title || !description) {
      alert('Title and Description are required.');
      return;
    }

    fetch(`${BACKEND_URL}/api/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 'Authorization': `Bearer ${token}` // This will be removed in a later step
      },
      body: JSON.stringify({ title, description, dueDate }),
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to add task');
        }
        return response.json();
      })
      .then(newTask => {
        setTasks([...tasks, newTask]);
        setTitle('');
        setDescription('');
        setDueDate('');
      })
      .catch(error => console.error('Error adding task:', error));
  };

  const handleDelete = async (id) => {
    try {
      await fetch(`${BACKEND_URL}/api/tasks/${id}`, {
        method: 'DELETE',
        headers: {
          // 'Authorization': `Bearer ${token}` // This will be removed in a later step
        }
      });
      fetchTasks(filterStatus, sortOption);
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Failed to delete task.');
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await fetch(`${BACKEND_URL}/api/tasks/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          // 'Authorization': `Bearer ${token}` // This will be removed in a later step
        },
        body: JSON.stringify({ status }),
      });
      fetchTasks(filterStatus, sortOption);
    } catch (error) {
      console.error('Error updating task status:', error);
      alert('Failed to update task status.');
    }
  };

  const handleEdit = (task) => {
    setEditingTask(task._id);
    setEditedTitle(task.title);
    setEditedDescription(task.description);
    setEditedDueDate(task.dueDate ? task.dueDate.split('T')[0] : '');
  };

  const handleSaveEdit = async (id) => {
    try {
      await fetch(`${BACKEND_URL}/api/tasks/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          // 'Authorization': `Bearer ${token}` // This will be removed in a later step
        },
        body: JSON.stringify({
          title: editedTitle,
          description: editedDescription,
          dueDate: editedDueDate,
          status: tasks.find(task => task._id === id).status
        }),
      });
      fetchTasks(filterStatus, sortOption);
      setEditingTask(null);
    } catch (error) {
      console.error('Error saving edit:', error);
      alert('Failed to save task edits.');
    }
  };

  // --- REMOVED: Profile Handlers ---
  // const handleProfileUpdate = async (e) => { /* ... */ };

  // --- Conditional Rendering (Simplified) ---
  // REMOVED: if (!token) block
  // The app will now always render the main task view directly.
  return (
    <div className="App">
      <header>
        <h1>Full-Stack Task App (No Auth)</h1> {/* Updated title for clarity */}
        <nav>
          {/* REMOVED: Profile and Logout buttons */}
          <button onClick={() => setView('tasks')}>All Tasks</button> {/* Modified text for clarity */}
          {/* We'll re-evaluate if we need a profile view later, but for now it's gone. */}
        </nav>
      </header>
      {/* Directly render tasks view */}
      {renderTasksView()}
      {/* REMOVED: Conditional rendering for profile view */}
    </div>
  );

  // --- Render Functions for Different Views --- (Profile view will be removed)
  function renderTasksView() {
    return (
      <>
        <div className="create-task">
          <h2>Create New Task</h2>
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Task Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="Task Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
            <label htmlFor="due-date-input">Due Date (optional):</label>
            <input
              id="due-date-input"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
            <button type="submit">Add Task</button>
          </form>
        </div>
        <div className="your-tasks">
          <h2>All Tasks</h2> {/* Updated title for clarity */}
          <div className="controls">
            <div className="filters">
              <button onClick={() => setFilterStatus('all')}>All</button>
              <button onClick={() => setFilterStatus('pending')}>Pending</button>
              <button onClick={() => setFilterStatus('completed')}>Completed</button>
            </div>
            <div className="sorters">
              <label htmlFor="sort-by">Sort By:</label>
              <select id="sort-by" onChange={(e) => setSortOption(e.target.value)} value={sortOption}>
                <option value="createdAt:desc">Newest</option>
                <option value="createdAt:asc">Oldest</option>
                <option value="dueDate:asc">Due Date (Asc)</option>
                <option value="dueDate:desc">Due Date (Desc)</option>
                <option value="title:asc">Title (A-Z)</option>
                <option value="title:desc">Title (Z-A)</option>
              </select>
            </div>
          </div>
          {tasks.length === 0 ? (
            <p>No tasks found.</p>
          ) : (
            <ul>
              {tasks.map(task => (
                <li key={task._id} className={task.status === 'completed' ? 'completed' : ''}>
                  {editingTask === task._id ? (
                    // Edit mode for a task
                    <div>
                      <input
                        type="text"
                        value={editedTitle}
                        onChange={(e) => setEditedTitle(e.target.value)}
                      />
                      <input
                        type="text"
                        value={editedDescription}
                        onChange={(e) => setEditedDescription(e.target.value)}
                      />
                      <input
                        type="date"
                        value={editedDueDate}
                        onChange={(e) => setEditedDueDate(e.target.value)}
                      />
                      <button onClick={() => handleSaveEdit(task._id)}>Save</button>
                      <button onClick={() => setEditingTask(null)}>Cancel</button>
                    </div>
                  ) : (
                    // Display mode for a task
                    <div>
                      <h3>{task.title}</h3>
                      <p>{task.description}</p>
                      <p>Status: {task.status}</p>
                      {task.dueDate && <p>Due Date: {new Date(task.dueDate).toLocaleDateString()}</p>}
                      <button onClick={() => handleDelete(task._id)}>Delete</button>
                      {task.status !== 'completed' && (
                        <button onClick={() => handleUpdateStatus(task._id, 'completed')}>Complete</button>
                      )}
                      <button onClick={() => handleEdit(task)}>Edit</button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </>
    );
  }

  // REMOVED: renderProfileView function
  // function renderProfileView() { /* ... */ }
}

export default App;
