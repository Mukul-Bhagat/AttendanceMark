import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'SuperAdmin':
        return 'badge-purple';
      case 'CompanyAdmin':
        return 'badge-blue';
      case 'Manager':
        return 'badge-green';
      default:
        return 'badge-gray';
    }
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Welcome back{user ? `, ${user.profile.firstName}` : ''}!</h1>
        <p className="dashboard-subtitle">Here's your account overview</p>
      </div>

      {user && (
        <div className="dashboard-grid">
          {/* User Profile Card */}
          <div className="dashboard-card profile-card">
            <div className="card-header">
              <div className="card-icon">👤</div>
              <h2>Profile Information</h2>
            </div>
            <div className="card-content">
              <div className="info-row">
                <span className="info-label">Full Name</span>
                <span className="info-value">{user.profile.firstName} {user.profile.lastName}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Email Address</span>
                <span className="info-value">{user.email}</span>
              </div>
              {user.profile.phone && (
                <div className="info-row">
                  <span className="info-label">Phone Number</span>
                  <span className="info-value">{user.profile.phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Role & Status Card */}
          <div className="dashboard-card role-card">
            <div className="card-header">
              <div className="card-icon">🔐</div>
              <h2>Account Status</h2>
            </div>
            <div className="card-content">
              <div className="info-row">
                <span className="info-label">Role</span>
                <span className={`role-badge ${getRoleBadgeColor(user.role)}`}>
                  {user.role}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Account Status</span>
                <span className="status-badge badge-success">Active</span>
              </div>
              {user.mustResetPassword && (
                <div className="password-warning">
                  <span className="warning-icon">⚠️</span>
                  <div>
                    <strong>Password Reset Required</strong>
                    <p>Please reset your password to continue using the system.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats Card */}
          <div className="dashboard-card stats-card">
            <div className="card-header">
              <div className="card-icon">📊</div>
              <h2>Quick Stats</h2>
            </div>
            <div className="card-content">
              <div className="stat-item">
                <div className="stat-value">0</div>
                <div className="stat-label">Active Sessions</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">0</div>
                <div className="stat-label">Total Users</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">0</div>
                <div className="stat-label">This Month</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

