import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Layout.css'; // We will create this CSS file next

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-layout">
      {/* 1. Left Side Navigation Bar */}
      <nav className="sidebar">
        <div className="sidebar-header">
          <h2>Smart Attend</h2>
        </div>
        <ul className="sidebar-nav">
          <li>
            <Link to="/dashboard">Dashboard</Link>
          </li>
          {/* We'll add these links in future steps */}
          {/* <li>
            <Link to="/sessions">Sessions</Link>
          </li>
          <li>
            <Link to="/manage-users">Manage Users</Link>
          </li> */}
        </ul>
      </nav>

      {/* 2. Main Content Area */}
      <div className="app-main">
        {/* Top Header Bar */}
        <header className="app-header">
          <div className="user-info">
            {/* Show user's email or a default */}
            <span>{user ? user.email : 'Welcome!'}</span>
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </div>
        </header>

        {/* This is where the actual page (like Dashboard) will be rendered */}
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;

