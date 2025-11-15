import React, { useState } from 'react';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';
import './ForceResetPassword.css';

const ForceResetPassword: React.FC = () => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const { refetchUser, logout } = useAuth(); // Get our new function

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    try {
      // 1. Call the new API endpoint
      const { data } = await api.post('/api/auth/force-reset-password', { oldPassword, newPassword });
      
      setMessage(data.msg + ' You will be logged out in 3 seconds.');
      
      // 2. On success, refresh the user data and log them out
      await refetchUser(); // This will update user.mustResetPassword to false
      setTimeout(() => {
        logout(); // Log them out so they can log back in
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.msg || 'An error occurred');
    }
  };

  return (
    <div className="reset-modal-backdrop">
      <div className="reset-modal-content">
        <h1>Reset Your Password</h1>
        <p>This is your first login. You must reset your temporary password.</p>
        
        {message && <p className="success-message">{message}</p>}
        {error && <p className="error-message">{error}</p>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Old (Temporary) Password</label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
              disabled={!!message}
            />
          </div>
          <div className="form-group">
            <label>New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={6}
              required
              disabled={!!message}
            />
            <p className="field-hint">Minimum 6 characters</p>
          </div>
          <div className="form-group">
            <label>Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={!!message}
            />
          </div>
          <button type="submit" className="btn-primary" disabled={!!message}>
            Set New Password
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForceResetPassword;

