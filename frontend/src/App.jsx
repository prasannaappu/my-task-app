import { useState, useEffect } from 'react';
import './App.css';

function App() {
  // Define the backend URL dynamically
  // In development, it will use 'http://localhost:5000'.
  // In production, it will use the URL defined in your .env.production file (VITE_REACT_APP_BACKEND_URL).
  const BACKEND_URL = import.meta.env.VITE_REACT_APP_BACKEND_URL || 'http://localhost:5000';

  // Authentication states
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');

  // Task states
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [editingTask, setEditingTask] = useState(null);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [editedDueDate, setEditedDueDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortOption, setSortOption] = useState('createdAt:desc');
  const [view, setView] = useState('tasks'); // Controls main view: 'tasks' or 'profile'

  // Notification state
  const [notifiedTasks, setNotifiedTasks] = useState(new Set()); // Stores IDs of tasks for which a notification has already been shown

  // --- Fetching Data ---
  const fetchTasks = (status = 'all', sort = 'createdAt:desc') => {
    if (!token) return;

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
        'Authorization': `Bearer ${token}`
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

  const fetchProfile = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/users/profile`, { // Updated URL
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }
      const data = await response.json();
      setUser(data);
      setAuthUsername(data.username);
    } catch (error) {
      console.error('Error fetching profile:', error);
      if (error.message.includes('token')) {
        handleLogout();
      }
    }
  };

  useEffect(() => {
    if (token) {
      fetchProfile();
      fetchTasks(filterStatus, sortOption);
    }
  }, [token, filterStatus, sortOption]);

  // --- Notification Logic ---
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

  // --- Authentication Handlers ---
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    const url = isRegistering
      ? `${BACKEND_URL}/api/users/register` // Updated URL
      : `${BACKEND_URL}/api/users/login`;   // Updated URL

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: authUsername, password: authPassword }),
      });
      const data = await response.json();
      if (data.token) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setUser(data);
        setAuthPassword('');
        setView('tasks');
        requestNotificationPermission();
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Auth error:', error);
      alert('Authentication failed. Please try again.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setTasks([]);
    setNotifiedTasks(new Set());
    setView('tasks');
  };

  // --- Task Handlers ---
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title || !description) {
      alert('Title and Description are required.');
      return;
    }

    fetch(`${BACKEND_URL}/api/tasks`, { // Updated URL
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
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
      await fetch(`${BACKEND_URL}/api/tasks/${id}`, { // Updated URL
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
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
      await fetch(`${BACKEND_URL}/api/tasks/${id}`, { // Updated URL
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
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
      await fetch(`${BACKEND_URL}/api/tasks/${id}`, { // Updated URL
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
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

  // --- Profile Handlers ---
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      const updateData = {
        username: authUsername,
      };
      if (authPassword) {
        updateData.password = authPassword;
      }

      const response = await fetch(`${BACKEND_URL}/api/users/profile`, { // Updated URL
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData),
      });
      if (!response.ok) {
        throw new Error('Failed to update profile');
      }
      const data = await response.json();
      setUser(data);
      alert('Profile updated successfully!');
      setAuthPassword('');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please check your inputs.');
    }
  };

  // --- Conditional Rendering ---
  if (!token) {
    return (
      <div className="App">
        <h1>Full-Stack Task App</h1> {/* Remember to change this title in App.jsx */}
        <div className="auth-form">
          <h2>{isRegistering ? 'Register' : 'Login'}</h2>
          <form onSubmit={handleAuthSubmit}>
            <input
              type="text"
              placeholder="Username"
              value={authUsername}
              onChange={(e) => setAuthUsername(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              required
            />
            <button type="submit">{isRegistering ? 'Register' : 'Login'}</button>
          </form>
          <button onClick={() => setIsRegistering(!isRegistering)}>
            {isRegistering ? 'Already have an account? Login' : 'Need an account? Register'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <header>
        <h1>Full-Stack Task App</h1> {/* Remember to change this title in App.jsx */}
        <nav>
          <button onClick={() => setView('tasks')}>My Tasks</button>
          <button onClick={() => setView('profile')}>Profile</button>
          <button onClick={handleLogout}>Logout</button>
        </nav>
      </header>
      {view === 'tasks' ? renderTasksView() : renderProfileView()}
    </div>
  );

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
          <h2>Your Tasks</h2>
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

  function renderProfileView() {
    return (
      <div className="profile-container">
        <h2>User Profile</h2>
        <form onSubmit={handleProfileUpdate}>
          <div className="form-group">
            <label htmlFor="username">Username:</label>
            <input
              type="text"
              id="username"
              value={authUsername}
              onChange={(e) => setAuthUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">New Password:</label>
            <input
              type="password"
              id="password"
              placeholder="Leave blank to keep current password"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
            />
          </div>
          <button type="submit">Update Profile</button>
        </form>
      </div>
    );
  }
}

export default App;
