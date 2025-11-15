import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { useAuth, IUser as IAuthUser } from '../contexts/AuthContext';
import AddUsersModal from '../components/AddUsersModal';
import './CreateSession.css';

interface IUser {
  _id: string;
  email: string;
  role: string;
  profile: {
    firstName: string;
    lastName: string;
  };
}

const CreateSession: React.FC = () => {
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    frequency: 'OneTime' as 'OneTime' | 'Daily' | 'Weekly' | 'Monthly',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    locationType: 'Physical' as 'Physical' | 'Virtual' | 'Hybrid',
    physicalLocation: '',
    virtualLocation: '',
    weeklyDays: [] as string[],
    sessionAdmin: '', // Only for SuperAdmin
  });

  const [assignedUsers, setAssignedUsers] = useState<IUser[]>([]);
  const [sessionAdmins, setSessionAdmins] = useState<IAuthUser[]>([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Auto-focus first input on mount
  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  // Fetch SessionAdmins if user is SuperAdmin
  useEffect(() => {
    if (isSuperAdmin) {
      const fetchSessionAdmins = async () => {
        try {
          const { data } = await api.get('/api/users/my-organization');
          const admins = data.filter((u: IAuthUser) => u.role === 'SessionAdmin');
          setSessionAdmins(admins);
        } catch (err) {
          console.error('Could not fetch SessionAdmins', err);
        }
      };
      fetchSessionAdmins();
    }
  }, [isSuperAdmin]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleDayToggle = (day: string) => {
    setFormData(prev => ({
      ...prev,
      weeklyDays: prev.weeklyDays.includes(day)
        ? prev.weeklyDays.filter(d => d !== day)
        : [...prev.weeklyDays, day],
    }));
  };

  const handleSaveUsers = (users: IUser[]) => {
    setAssignedUsers(users);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validate weekly days
    if (formData.frequency === 'Weekly' && formData.weeklyDays.length === 0) {
      setError('Please select at least one day for weekly sessions');
      return;
    }
    
    // Validate end date is after start date
    if (formData.endDate && formData.startDate && formData.endDate < formData.startDate) {
      setError('End date must be after start date');
      return;
    }
    
    // Validate end time is after start time
    if (formData.startTime && formData.endTime && formData.startTime >= formData.endTime) {
      setError('End time must be after start time');
      return;
    }
    
    setIsSubmitting(true);

    try {
      const sessionData = {
        ...formData,
        assignedUsers: assignedUsers.map(u => ({
          userId: u._id,
          email: u.email,
          firstName: u.profile.firstName,
          lastName: u.profile.lastName,
        })),
        endDate: formData.endDate || undefined,
        weeklyDays: formData.frequency === 'Weekly' ? formData.weeklyDays : undefined,
        physicalLocation: formData.locationType === 'Physical' || formData.locationType === 'Hybrid' 
          ? formData.physicalLocation 
          : undefined,
        virtualLocation: formData.locationType === 'Virtual' || formData.locationType === 'Hybrid' 
          ? formData.virtualLocation 
          : undefined,
        sessionAdmin: isSuperAdmin && formData.sessionAdmin ? formData.sessionAdmin : undefined,
      };

      await api.post('/api/sessions', sessionData);
      navigate('/sessions');
    } catch (err: any) {
      if (err.response && err.response.data) {
        if (err.response.data.errors && Array.isArray(err.response.data.errors)) {
          const errorMessages = err.response.data.errors.map((e: any) => e.msg).join(', ');
          setError(errorMessages);
        } else {
          setError(err.response.data.msg || 'Failed to create session');
        }
      } else {
        setError('Failed to create session. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="create-session-form">
      <div className="form-header">
        <button
          type="button"
          onClick={() => navigate('/sessions')}
          className="back-button"
          title="Go back to Sessions"
        >
          ← Back to Sessions
        </button>
        <h1>Create New Session</h1>
      </div>
      {error && <p className="error-message">{error}</p>}

      <form onSubmit={handleSubmit}>
        {/* Basic Information */}
        <div className="form-card">
          <h3>Basic Information</h3>
          <div className="form-group">
            <label>Session Name *</label>
            <input
              ref={nameInputRef}
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              autoComplete="off"
              placeholder="e.g., Team Meeting, Training Session"
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
            />
          </div>
        </div>

        {/* Schedule */}
        <div className="form-card">
          <h3>Schedule</h3>
          <div className="form-grid-2">
            <div className="form-group">
              <label>Frequency *</label>
              <select
                name="frequency"
                value={formData.frequency}
                onChange={handleChange}
                required
              >
                <option value="OneTime">One Time</option>
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
              </select>
            </div>
            <div className="form-group">
              <label>Start Date *</label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {formData.frequency !== 'OneTime' && (
            <div className="form-group">
              <label>End Date</label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                min={formData.startDate}
              />
            </div>
          )}

          <div className="form-grid-2">
            <div className="form-group">
              <label>Start Time *</label>
              <input
                type="time"
                name="startTime"
                value={formData.startTime}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>End Time *</label>
              <input
                type="time"
                name="endTime"
                value={formData.endTime}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {formData.frequency === 'Weekly' && (
            <div className="form-group">
              <label>Days of Week * {formData.weeklyDays.length === 0 && <span className="required-indicator">(Select at least one)</span>}</label>
              <div className="day-picker">
                {daysOfWeek.map(day => (
                  <div key={day}>
                    <input
                      type="checkbox"
                      id={day}
                      checked={formData.weeklyDays.includes(day)}
                      onChange={() => handleDayToggle(day)}
                    />
                    <label htmlFor={day}>{day.substring(0, 3)}</label>
                  </div>
                ))}
              </div>
              {formData.weeklyDays.length === 0 && (
                <p className="field-hint">Please select at least one day for weekly sessions</p>
              )}
            </div>
          )}
        </div>

        {/* Location */}
        <div className="form-card">
          <h3>Location</h3>
          <div className="form-group">
            <label>Location Type *</label>
            <select
              name="locationType"
              value={formData.locationType}
              onChange={handleChange}
              required
            >
              <option value="Physical">Physical</option>
              <option value="Virtual">Virtual</option>
              <option value="Hybrid">Hybrid</option>
            </select>
          </div>

          {(formData.locationType === 'Physical' || formData.locationType === 'Hybrid') && (
            <div className="form-group">
              <label>Physical Location *</label>
              <input
                type="text"
                name="physicalLocation"
                value={formData.physicalLocation}
                onChange={handleChange}
                required={formData.locationType === 'Physical'}
                placeholder="Enter physical address or room number"
              />
            </div>
          )}

          {(formData.locationType === 'Virtual' || formData.locationType === 'Hybrid') && (
            <div className="form-group">
              <label>Virtual Location (URL) *</label>
              <input
                type="url"
                name="virtualLocation"
                value={formData.virtualLocation}
                onChange={handleChange}
                required={formData.locationType === 'Virtual'}
                placeholder="https://meet.google.com/..."
              />
            </div>
          )}
        </div>

        {/* Session Admin Assignment - Only for SuperAdmin */}
        {isSuperAdmin && (
          <div className="form-card">
            <h3>Session Administration</h3>
            <div className="form-group">
              <label>Assign Session Admin (Optional)</label>
              <select
                name="sessionAdmin"
                value={formData.sessionAdmin}
                onChange={handleChange}
              >
                <option value="">None</option>
                {sessionAdmins.map((admin) => (
                  <option key={admin.id} value={admin.id}>
                    {admin.profile.firstName} {admin.profile.lastName} ({admin.email})
                  </option>
                ))}
              </select>
              <p className="field-hint">
                Select a Session Admin to manage this session. If not assigned, the session creator will be the admin.
              </p>
            </div>
          </div>
        )}

        {/* Assigned Users */}
        <div className="form-card">
          <h3>Assigned Users</h3>
          <div className="form-group">
            <button
              type="button"
              onClick={() => setShowUserModal(true)}
              className="btn-secondary"
            >
              {assignedUsers.length > 0 
                ? `Edit Users (${assignedUsers.length} selected)` 
                : 'Add Users'}
            </button>
            {assignedUsers.length > 0 && (
              <div className="selected-users">
                <p><strong>Selected Users ({assignedUsers.length}):</strong></p>
                <div className="selected-users-list">
                  {assignedUsers.map(user => (
                    <div key={user._id} className="selected-user-item">
                      <span className="user-name">{user.profile.firstName} {user.profile.lastName}</span>
                      <span className="user-email">{user.email}</span>
                      <span className="user-role">{user.role}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            onClick={() => navigate('/sessions')}
            className="btn-secondary"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting} className="btn-primary create-session-btn">
            {isSubmitting ? 'Creating Session...' : 'Create Session'}
          </button>
        </div>
      </form>

      {showUserModal && (
        <AddUsersModal
          onClose={() => setShowUserModal(false)}
          onSave={handleSaveUsers}
          initialSelectedUsers={assignedUsers}
        />
      )}
    </div>
  );
};

export default CreateSession;

