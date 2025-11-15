import React from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Layout.css';

const Layout: React.FC = () => {
  const { user, logout, isSuperAdmin, isCompanyAdmin, isManager, isSessionAdmin, isEndUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get page title based on current route
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/dashboard') return 'Dashboard';
    if (path.startsWith('/sessions')) return 'Sessions';
    if (path === '/scan') return 'Scan QR Code';
    if (path === '/my-attendance') return 'My Attendance';
    if (path === '/reports') return 'Attendance Report';
    if (path === '/manage-staff') return 'Manage Staff';
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
          
          {/* Sessions - visible to all authenticated users */}
          <li>
            <NavLink to="/sessions" className={({ isActive }) => isActive ? 'active' : ''}>
              <span className="nav-icon">📋</span>
              <span className="nav-text">Sessions</span>
            </NavLink>
          </li>
          
          {/* Create Session - for SuperAdmin, CompanyAdmin, Manager, and SessionAdmin */}
          {(isSuperAdmin || isCompanyAdmin || isManager || isSessionAdmin) && (
            <li>
              <NavLink to="/sessions/create" className={({ isActive }) => isActive ? 'active' : ''}>
                <span className="nav-icon">➕</span>
                <span className="nav-text">Create Session</span>
              </NavLink>
            </li>
          )}
          
          {/* Scan QR - visible to all authenticated users */}
          <li>
            <NavLink to="/scan" className={({ isActive }) => isActive ? 'active' : ''}>
              <span className="nav-icon">📷</span>
              <span className="nav-text">Scan QR</span>
            </NavLink>
          </li>
          
          {/* My Attendance - visible to all authenticated users */}
          <li>
            <NavLink to="/my-attendance" className={({ isActive }) => isActive ? 'active' : ''}>
              <span className="nav-icon">📊</span>
              <span className="nav-text">My Attendance</span>
            </NavLink>
          </li>
          
          {/* Attendance Report - for Manager and SuperAdmin */}
          {(isSuperAdmin || isManager) && (
            <li>
              <NavLink to="/reports" className={({ isActive }) => isActive ? 'active' : ''}>
                <span className="nav-icon">📈</span>
                <span className="nav-text">Attendance Report</span>
              </NavLink>
            </li>
          )}
          
          {/* Manage Staff - only for SuperAdmin */}
          {isSuperAdmin && (
            <li>
              <NavLink to="/manage-staff" className={({ isActive }) => isActive ? 'active' : ''}>
                <span className="nav-icon">👥</span>
                <span className="nav-text">Manage Staff</span>
              </NavLink>
            </li>
          )}
          
          {/* Manage Users - only for SuperAdmin and CompanyAdmin */}
          {(isSuperAdmin || isCompanyAdmin) && (
            <li>
              <NavLink to="/manage-users" className={({ isActive }) => isActive ? 'active' : ''}>
                <span className="nav-icon">👤</span>
                <span className="nav-text">Manage Users</span>
              </NavLink>
            </li>
          )}
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

