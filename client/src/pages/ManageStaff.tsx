import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { IUser } from '../contexts/AuthContext';
import './ManageStaff.css';

type StaffUser = {
  _id?: string;
  id?: string;
  email: string;
  role: 'SuperAdmin' | 'CompanyAdmin' | 'Manager' | 'SessionAdmin' | 'EndUser';
  profile: {
    firstName: string;
    lastName: string;
    phone?: string;
  };
};

const ManageStaff: React.FC = () => {
  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'SessionAdmin' | 'Manager'>('SessionAdmin');

  // Page state
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Fetch existing staff
  const fetchStaff = async () => {
    try {
      setIsLoading(true);
      setError(''); // Clear any previous errors
      const { data } = await axios.get('http://localhost:5001/api/users/my-organization');
      // Filter for staff roles (Manager and SessionAdmin)
      const staff = data.filter(
        (user: StaffUser) => user.role === 'SessionAdmin' || user.role === 'Manager'
      );
      setStaffList(staff);
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('You are not authorized. Please log in again.');
      } else {
        setError('Could not fetch staff list. Please try again.');
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch on component mount
  useEffect(() => {
    fetchStaff();
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
    setRole('SessionAdmin');
    setMessage('');
    setError('');
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsSubmitting(true);

    const staffData = {
      firstName,
      lastName,
      email,
      password,
      phone: phone || undefined,
      role,
    };

    try {
      // Use the API endpoint from Step 11
      const { data } = await axios.post('http://localhost:5001/api/users/staff', staffData);
      
      setMessage(data.msg || `${role} created successfully`);
      clearForm();
      // Refresh the list immediately
      await fetchStaff();
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError('You do not have permission to create staff members.');
      } else if (err.response?.data?.errors) {
        const errorMessages = err.response.data.errors.map((e: any) => e.msg).join(', ');
        setError(errorMessages);
      } else {
        setError(err.response?.data?.msg || 'Failed to create staff member. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="manage-staff-container">
      <h1>Manage Staff</h1>
      
      {isLoading ? (
        <div className="loading-container">
          <div className="loading-spinner-inline">
            <div className="spinner"></div>
            <p className="loading-text">Loading staff list...</p>
          </div>
        </div>
      ) : (
        <>
      
      {/* --- CREATE STAFF FORM --- */}
      <div className="form-card">
        <h3>Create New Staff Member</h3>
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
            <p className="field-hint">Staff member will be required to reset this password on first login.</p>
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

          <div className="form-group">
            <label>Role *</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'SessionAdmin' | 'Manager')}
              required
              disabled={isSubmitting}
            >
              <option value="SessionAdmin">Session Admin</option>
              <option value="Manager">Manager</option>
            </select>
            <p className="field-hint">
              <strong>Session Admin:</strong> Manages specific sessions assigned to them.<br />
              <strong>Manager:</strong> Can create and manage sessions.
            </p>
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
              {isSubmitting ? 'Creating...' : 'Create Staff Member'}
            </button>
          </div>
        </form>
      </div>
      
      {/* --- STAFF LIST --- */}
      <div className="staff-list-section">
        <h2>Current Staff ({staffList.length})</h2>
        {staffList.length === 0 ? (
          <div className="empty-state">
            <p>No staff members found.</p>
            <p className="empty-state-hint">Create your first staff member using the form above.</p>
          </div>
        ) : (
          <div className="staff-table-wrapper">
            <table className="staff-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Phone</th>
                </tr>
              </thead>
              <tbody>
                {staffList.map((staff) => {
                  const staffId = staff._id || staff.id || '';
                  const roleClass = staff.role.toLowerCase();
                  const roleDisplay = staff.role === 'SessionAdmin' ? 'Session Admin' : staff.role;
                  
                  return (
                    <tr key={staffId}>
                      <td className="staff-name-cell">
                        <strong>{staff.profile.firstName} {staff.profile.lastName}</strong>
                      </td>
                      <td>{staff.email}</td>
                      <td>
                        <span className={`role-badge role-${roleClass}`}>
                          {roleDisplay}
                        </span>
                      </td>
                      <td>{staff.profile.phone || 'N/A'}</td>
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

export default ManageStaff;

