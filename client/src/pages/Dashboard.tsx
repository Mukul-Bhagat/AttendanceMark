import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="dashboard">
      <h1>Welcome to Your Dashboard</h1>
      {user && (
        <div className="dashboard-info">
          <div className="info-card">
            <h2>User Information</h2>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Role:</strong> {user.role}</p>
            <p><strong>Name:</strong> {user.profile.firstName} {user.profile.lastName}</p>
            {user.profile.phone && (
              <p><strong>Phone:</strong> {user.profile.phone}</p>
            )}
            {user.mustResetPassword && (
              <p className="warning">⚠️ You must reset your password</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

