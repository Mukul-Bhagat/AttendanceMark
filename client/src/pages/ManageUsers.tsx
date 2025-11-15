import React, { useState, useEffect } from 'react';
import api from '../api';
import './ManageUsers.css';

type EndUser = {
  _id?: string;
  id?: string;
  email: string;
  role: 'SuperAdmin' | 'CompanyAdmin' | 'Manager' | 'SessionAdmin' | 'EndUser';
  profile: {
    firstName: string;
    lastName: string;
    phone?: string;
  };
  registeredDeviceId?: string;
};

const ManageUsers: React.FC = () => {
  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');

  // Page state
  const [usersList, setUsersList] = useState<EndUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resettingDevice, setResettingDevice] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Fetch existing EndUsers
  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      setError('');
      const { data } = await api.get('/api/users/my-organization');
      // Filter for EndUser role only
      const endUsers = data.filter((user: EndUser) => user.role === 'EndUser');
      setUsersList(endUsers);
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('You are not authorized. Please log in again.');
      } else {
        setError('Could not fetch users list. Please try again.');
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  // Auto-dismiss success message after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const clearForm = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPassword('');
    setPhone('');
    setMessage('');
    setError('');
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsSubmitting(true);

    const userData = {
      firstName,
      lastName,
      email,
      password,
      phone: phone || undefined,
    };

    try {
      const { data } = await api.post('/api/users/end-user', userData);
      
      setMessage(data.msg || 'EndUser created successfully');
      clearForm();
      // Refresh the list immediately
      await fetchUsers();
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError('You do not have permission to create users.');
      } else if (err.response?.data?.errors) {
        const errorMessages = err.response.data.errors.map((e: any) => e.msg).join(', ');
        setError(errorMessages);
      } else {
        setError(err.response?.data?.msg || 'Failed to create user. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle device reset
  const handleResetDevice = async (userId: string) => {
    if (!window.confirm('Are you sure you want to reset this user\'s device? They will need to register a new device on their next scan.')) {
      return;
    }

    setResettingDevice(userId);
    setError('');
    setMessage('');

    try {
      const { data } = await api.put(`/api/users/${userId}/reset-device`);
      
      setMessage(data.msg || 'Device reset successfully');
      // Refresh the list to show updated device status
      await fetchUsers();
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError('You do not have permission to reset devices.');
      } else {
        setError(err.response?.data?.msg || 'Failed to reset device. Please try again.');
      }
    } finally {
      setResettingDevice(null);
    }
  };

  return (
    <div className="manage-users-container">
      <h1>Manage Users</h1>
      
      {isLoading ? (
        <div className="loading-container">
          <div className="loading-spinner-inline">
            <div className="spinner"></div>
            <p className="loading-text">Loading users list...</p>
          </div>
        </div>
      ) : (
        <>
      
      {/* --- CREATE USER FORM --- */}
      <div className="form-card">
        <h3>Create New End User</h3>
        {message && (
          <div className="success-message">
            <span className="success-icon">✓</span>
            {message}
          </div>
        )}
        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-grid-2">
            <div className="form-group">
              <label>First Name *</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  if (error) setError('');
                }}
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="form-group">
              <label>Last Name *</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => {
                  setLastName(e.target.value);
                  if (error) setError('');
                }}
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Email *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError('');
              }}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label>Temporary Password *</label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
              minLength={6}
              required
              disabled={isSubmitting}
              placeholder="Minimum 6 characters"
            />
            <p className="field-hint">User will be required to reset this password on first login.</p>
          </div>

          <div className="form-group">
            <label>Phone (Optional)</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={isSubmitting}
              placeholder="+1234567890"
            />
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={clearForm}
              className="btn-secondary"
              disabled={isSubmitting}
            >
              Clear Form
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
      
      {/* --- USERS LIST --- */}
      <div className="users-list-section">
        <h2>Current End Users ({usersList.length})</h2>
        {usersList.length === 0 ? (
          <div className="empty-state">
            <p>No end users found.</p>
            <p className="empty-state-hint">Create your first end user using the form above.</p>
          </div>
        ) : (
          <div className="users-table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Device Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersList.map((user) => {
                  const userId = user._id || user.id || '';
                  const isDeviceLocked = !!user.registeredDeviceId;
                  
                  return (
                    <tr key={userId}>
                      <td className="user-name-cell">
                        <strong>{user.profile.firstName} {user.profile.lastName}</strong>
                      </td>
                      <td>{user.email}</td>
                      <td>{user.profile.phone || 'N/A'}</td>
                      <td>
                        {isDeviceLocked ? (
                          <span className="device-status-badge device-locked">
                            🔒 Locked
                          </span>
                        ) : (
                          <span className="device-status-badge device-unlocked">
                            🔓 Unlocked
                          </span>
                        )}
                      </td>
                      <td>
                        {isDeviceLocked && (
                          <button
                            className="btn-reset-device"
                            onClick={() => handleResetDevice(userId)}
                            disabled={resettingDevice === userId}
                            title="Reset device to allow user to register a new device"
                          >
                            {resettingDevice === userId ? (
                              <>
                                <span className="spinner-small"></span>
                                Resetting...
                              </>
                            ) : (
                              'Reset Device'
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </>
      )}
    </div>
  );
};

export default ManageUsers;

