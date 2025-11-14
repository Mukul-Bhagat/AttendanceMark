import React from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Layout.css';

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get page title based on current route
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/dashboard') return 'Dashboard';
    if (path.startsWith('/sessions')) return 'Sessions';
    if (path === '/scan') return 'Scan QR Code';
    if (path === '/my-attendance') return 'My Attendance';
    if (path.startsWith('/manage-users')) return 'Manage Users';
    return 'Dashboard';
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-layout">
      {/* 1. Left Side Navigation Bar */}
      <nav className="sidebar">
        <div className="sidebar-header">
          <div className="logo-container">
            <div className="logo-icon">📅</div>
            <h2>Smart Attend</h2>
          </div>
        </div>
        <ul className="sidebar-nav">
          <li>
            <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'active' : ''}>
              <span className="nav-icon">🏠</span>
              <span className="nav-text">Dashboard</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/sessions" className={({ isActive }) => isActive ? 'active' : ''}>
              <span className="nav-icon">📋</span>
              <span className="nav-text">Sessions</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/scan" className={({ isActive }) => isActive ? 'active' : ''}>
              <span className="nav-icon">📷</span>
              <span className="nav-text">Scan QR</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/my-attendance" className={({ isActive }) => isActive ? 'active' : ''}>
              <span className="nav-icon">📊</span>
              <span className="nav-text">My Attendance</span>
            </NavLink>
          </li>
          {/* <li>
            <NavLink to="/manage-users" className={({ isActive }) => isActive ? 'active' : ''}>
              <span className="nav-icon">👥</span>
              <span className="nav-text">Manage Users</span>
            </NavLink>
          </li> */}
        </ul>
        <div className="sidebar-footer">
          <div className="user-profile-mini">
            <div className="user-avatar">
              {user ? user.profile.firstName[0].toUpperCase() : 'U'}
            </div>
            <div className="user-details-mini">
              <div className="user-name-mini">
                {user ? `${user.profile.firstName} ${user.profile.lastName}` : 'User'}
              </div>
              <div className="user-role-mini">{user?.role || 'Guest'}</div>
            </div>
          </div>
        </div>
      </nav>

      {/* 2. Main Content Area */}
      <div className="app-main">
        {/* Top Header Bar */}
        <header className="app-header">
          <div className="header-left">
            <h3 className="page-title">{getPageTitle()}</h3>
          </div>
          <div className="user-info">
            <div className="user-details">
              <div className="user-name">{user ? `${user.profile.firstName} ${user.profile.lastName}` : 'Welcome!'}</div>
              <div className="user-email">{user ? user.email : ''}</div>
            </div>
            <button onClick={handleLogout} className="logout-button">
              <span className="logout-icon">🚪</span>
              <span>Logout</span>
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

