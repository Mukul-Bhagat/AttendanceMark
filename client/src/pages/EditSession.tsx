import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth, IUser as IAuthUser } from '../contexts/AuthContext';
import { ISession } from '../types';
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

const EditSession: React.FC = () => {
  const navigate = useNavigate();
  const { id: sessionId } = useParams<{ id: string }>();
  const { isSuperAdmin } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    frequency: 'OneTime' as 'OneTime' | 'Daily' | 'Weekly' | 'Monthly',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    locationType: 'Physical' as 'Physical' | 'Virtual' | 'Hybrid', // Legacy field
    sessionType: 'PHYSICAL' as 'PHYSICAL' | 'REMOTE' | 'HYBRID', // New field
    physicalLocation: '',
    virtualLocation: '',
    geolocation: { latitude: 0, longitude: 0 },
    radius: 100,
    weeklyDays: [] as string[],
    sessionAdmin: '', // Only for SuperAdmin
  });

  const [assignedUsers, setAssignedUsers] = useState<IUser[]>([]); // Legacy: for Physical/Remote single mode
  const [physicalUsers, setPhysicalUsers] = useState<IUser[]>([]); // For Hybrid: Physical attendees
  const [remoteUsers, setRemoteUsers] = useState<IUser[]>([]); // For Hybrid: Remote attendees
  const [sessionAdmins, setSessionAdmins] = useState<IAuthUser[]>([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userModalContext, setUserModalContext] = useState<'PHYSICAL' | 'REMOTE' | 'ALL'>('ALL');
  const [locationMethod, setLocationMethod] = useState<'LINK' | 'COORDS'>('LINK'); // Default to Link
  const [locationLink, setLocationLink] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Fetch session data on mount
  useEffect(() => {
    const fetchSession = async () => {
      if (!sessionId) {
        setError('Session ID is required');
        setIsLoading(false);
        return;
      }

      try {
        const { data }: { data: ISession } = await api.get(`/api/sessions/${sessionId}`);

        // Populate form with existing data
        setFormData({
          name: data.name,
          description: data.description || '',
          frequency: data.frequency,
          startDate: data.startDate.split('T')[0], // Extract date part from ISO string
          endDate: data.endDate ? data.endDate.split('T')[0] : '',
          startTime: data.startTime,
          endTime: data.endTime,
          locationType: data.locationType,
          sessionType: data.sessionType || 'PHYSICAL', // Use sessionType from data, default to PHYSICAL
          physicalLocation: data.physicalLocation || '',
          virtualLocation: data.virtualLocation || '',
          geolocation: data.geolocation || { latitude: 0, longitude: 0 },
          radius: data.radius || 100,
          weeklyDays: data.weeklyDays || [],
          sessionAdmin: data.sessionAdmin || '',
        });

        // Load location data and set locationMethod
        if (data.location) {
          if (data.location.type === 'LINK') {
            setLocationMethod('LINK');
            setLocationLink(data.location.link || '');
          } else if (data.location.type === 'COORDS') {
            setLocationMethod('COORDS');
            setLatitude(data.location.geolocation?.latitude?.toString() || '');
            setLongitude(data.location.geolocation?.longitude?.toString() || '');
          }
        } else if (data.geolocation) {
          // Legacy: if no location object but geolocation exists, use COORDS
          setLocationMethod('COORDS');
          setLatitude(data.geolocation.latitude?.toString() || '');
          setLongitude(data.geolocation.longitude?.toString() || '');
        }

        // Split assigned users based on their mode
        if (data.assignedUsers && Array.isArray(data.assignedUsers)) {
          const physical: IUser[] = [];
          const remote: IUser[] = [];
          const all: IUser[] = [];

          data.assignedUsers.forEach((u) => {
            const userObj: IUser = {
              _id: u.userId,
              email: u.email,
              role: '', // Role not included in assignedUsers
              profile: {
                firstName: u.firstName,
                lastName: u.lastName,
              },
            };

            all.push(userObj);

            // Split by mode if mode exists, otherwise treat based on sessionType
            if (u.mode) {
              if (u.mode === 'PHYSICAL') {
                physical.push(userObj);
              } else if (u.mode === 'REMOTE') {
                remote.push(userObj);
              }
            } else {
              // Legacy: no mode field, assign based on sessionType
              if (data.sessionType === 'PHYSICAL' || !data.sessionType) {
                physical.push(userObj);
              } else if (data.sessionType === 'REMOTE') {
                remote.push(userObj);
              }
            }
          });

          // Set users based on sessionType
          if (data.sessionType === 'HYBRID') {
            setPhysicalUsers(physical);
            setRemoteUsers(remote);
            setAssignedUsers([]);
          } else {
            setAssignedUsers(all);
            setPhysicalUsers([]);
            setRemoteUsers([]);
          }
        }
      } catch (err: any) {
        if (err.response?.status === 404) {
          setError('Session not found');
        } else if (err.response?.status === 403) {
          setError('You are not authorized to edit this session');
        } else {
          setError('Failed to fetch session data');
        }
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSession();
  }, [sessionId]);

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

  // Auto-focus first input after loading
  useEffect(() => {
    if (!isLoading) {
      nameInputRef.current?.focus();
    }
  }, [isLoading]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
    
    // When sessionType changes, clear user lists if switching to/from Hybrid
    if (name === 'sessionType') {
      if (value === 'HYBRID') {
        // Switching to Hybrid: clear legacy assignedUsers
        setAssignedUsers([]);
      } else {
        // Switching from Hybrid: clear physical/remote users
        setPhysicalUsers([]);
        setRemoteUsers([]);
      }
    }
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
    if (userModalContext === 'PHYSICAL') {
      setPhysicalUsers(users);
    } else if (userModalContext === 'REMOTE') {
      setRemoteUsers(users);
    } else {
      // Legacy: for Physical or Remote single mode
      setAssignedUsers(users);
    }
    setShowUserModal(false);
  };

  const openUserModal = (context: 'PHYSICAL' | 'REMOTE' | 'ALL') => {
    setUserModalContext(context);
    setShowUserModal(true);
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

    // Validate location for PHYSICAL or HYBRID sessions
    if (formData.sessionType === 'PHYSICAL' || formData.sessionType === 'HYBRID') {
      if (locationMethod === 'LINK' && !locationLink.trim()) {
        setError('Google Maps Link is required for Physical or Hybrid sessions.');
        setIsSubmitting(false);
        return;
      }
      if (locationMethod === 'COORDS' && (!latitude.trim() || !longitude.trim())) {
        setError('Latitude and Longitude are required for Physical or Hybrid sessions.');
        setIsSubmitting(false);
        return;
      }
    }
    
    setIsSubmitting(true);

    try {
      // Combine users based on sessionType
      let combinedAssignedUsers: Array<{
        userId: string;
        email: string;
        firstName: string;
        lastName: string;
        mode: 'PHYSICAL' | 'REMOTE';
      }> = [];

      if (formData.sessionType === 'HYBRID') {
        // For Hybrid: combine physicalUsers and remoteUsers with their modes
        combinedAssignedUsers = [
          ...physicalUsers.map(u => ({
            userId: u._id,
            email: u.email,
            firstName: u.profile.firstName,
            lastName: u.profile.lastName,
            mode: 'PHYSICAL' as const,
          })),
          ...remoteUsers.map(u => ({
            userId: u._id,
            email: u.email,
            firstName: u.profile.firstName,
            lastName: u.profile.lastName,
            mode: 'REMOTE' as const,
          })),
        ];
      } else {
        // For Physical or Remote: use assignedUsers with appropriate mode
        const mode = formData.sessionType === 'PHYSICAL' ? 'PHYSICAL' : 'REMOTE';
        combinedAssignedUsers = assignedUsers.map(u => ({
          userId: u._id,
          email: u.email,
          firstName: u.profile.firstName,
          lastName: u.profile.lastName,
          mode: mode as 'PHYSICAL' | 'REMOTE',
        }));
      }

      // Build location object for PHYSICAL or HYBRID sessions
      let locationObj = undefined;
      if (formData.sessionType === 'PHYSICAL' || formData.sessionType === 'HYBRID') {
        if (locationMethod === 'LINK') {
          locationObj = {
            type: 'LINK',
            link: locationLink.trim(),
          };
        } else {
          locationObj = {
            type: 'COORDS',
            geolocation: {
              latitude: parseFloat(latitude) || 0,
              longitude: parseFloat(longitude) || 0,
            },
          };
        }
      }

      const sessionData = {
        name: formData.name,
        description: formData.description || undefined,
        frequency: formData.frequency,
        startDate: formData.startDate,
        endDate: formData.endDate || undefined,
        startTime: formData.startTime,
        endTime: formData.endTime,
        locationType: formData.locationType,
        sessionType: formData.sessionType,
        assignedUsers: combinedAssignedUsers,
        weeklyDays: formData.frequency === 'Weekly' ? formData.weeklyDays : undefined,
        physicalLocation: formData.sessionType === 'PHYSICAL' || formData.sessionType === 'HYBRID' 
          ? formData.physicalLocation 
          : undefined,
        virtualLocation: formData.sessionType === 'REMOTE' || formData.sessionType === 'HYBRID' 
          ? formData.virtualLocation 
          : undefined,
        location: locationObj,
        radius: (formData.sessionType === 'PHYSICAL' || formData.sessionType === 'HYBRID') && formData.radius
          ? formData.radius
          : undefined,
        sessionAdmin: isSuperAdmin && formData.sessionAdmin ? formData.sessionAdmin : undefined,
      };

      await api.put(`/api/sessions/${sessionId}`, sessionData);
      navigate('/sessions');
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError('You are not authorized to edit this session');
      } else if (err.response && err.response.data) {
        if (err.response.data.errors && Array.isArray(err.response.data.errors)) {
          const errorMessages = err.response.data.errors.map((e: any) => e.msg).join(', ');
          setError(errorMessages);
        } else {
          setError(err.response.data.msg || 'Failed to update session');
        }
      } else {
        setError('Failed to update session. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="create-session-form">
        <div className="sessions-loading">
          <div className="loading-spinner-inline">
            <div className="spinner"></div>
            <p className="loading-text">Loading session data...</p>
          </div>
        </div>
      </div>
    );
  }

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
        <h1>Edit Session</h1>
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

        {/* Session Type */}
        <div className="form-card">
          <h3>Session Type</h3>
          <div className="form-group">
            <label>Session Type *</label>
            <select
              name="sessionType"
              value={formData.sessionType}
              onChange={handleChange}
              required
            >
              <option value="PHYSICAL">Physical</option>
              <option value="REMOTE">Remote</option>
              <option value="HYBRID">Hybrid</option>
            </select>
            <p className="field-hint">
              Physical: All attendees must be at the location. Remote: All attendees can join from anywhere. Hybrid: Mix of physical and remote attendees.
            </p>
          </div>

          {(formData.sessionType === 'REMOTE' || formData.sessionType === 'HYBRID') && (
            <div className="form-group">
              <label>Virtual Location (URL) {formData.sessionType === 'REMOTE' && '*'}</label>
              <input
                type="url"
                name="virtualLocation"
                value={formData.virtualLocation}
                onChange={handleChange}
                required={formData.sessionType === 'REMOTE'}
                placeholder="https://meet.google.com/..."
              />
            </div>
          )}
        </div>

        {/* Location Details - Only for PHYSICAL or HYBRID */}
        {(formData.sessionType === 'PHYSICAL' || formData.sessionType === 'HYBRID') && (
          <div className="form-card">
            <h3>Location Details</h3>
            
            <div className="form-group">
              <label>Physical Location *</label>
              <input
                type="text"
                name="physicalLocation"
                value={formData.physicalLocation}
                onChange={handleChange}
                required
                placeholder="Enter physical address or room number"
              />
            </div>

            {/* Radio Buttons for Method Selection */}
            <div className="form-group">
              <label>How do you want to specify the location? *</label>
              <div className="radio-group" style={{ display: 'flex', gap: '20px', marginTop: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="locationMethod" 
                    value="LINK" 
                    checked={locationMethod === 'LINK'}
                    onChange={() => setLocationMethod('LINK')}
                  />
                  Google Maps Link
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="locationMethod" 
                    value="COORDS" 
                    checked={locationMethod === 'COORDS'}
                    onChange={() => setLocationMethod('COORDS')}
                  />
                  Coordinates (Lat/Long)
                </label>
              </div>
            </div>

            {/* Conditional Inputs */}
            {locationMethod === 'LINK' ? (
              <div className="form-group">
                <label>Google Maps Link *</label>
                <input 
                  type="url" 
                  value={locationLink} 
                  onChange={(e) => setLocationLink(e.target.value)} 
                  placeholder="https://maps.google.com/..."
                  required 
                />
              </div>
            ) : (
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Latitude *</label>
                  <input 
                    type="number" 
                    step="any" 
                    value={latitude} 
                    onChange={(e) => setLatitude(e.target.value)} 
                    required 
                    placeholder="e.g., 28.6139"
                  />
                </div>
                <div className="form-group">
                  <label>Longitude *</label>
                  <input 
                    type="number" 
                    step="any" 
                    value={longitude} 
                    onChange={(e) => setLongitude(e.target.value)} 
                    required 
                    placeholder="e.g., 77.2090"
                  />
                </div>
              </div>
            )}
            
            <div className="form-group">
              <label>Radius (Meters) *</label>
              <input 
                type="number" 
                value={formData.radius} 
                onChange={handleChange} 
                min="1"
                required
                placeholder="Default: 100 meters"
              />
              <p className="field-hint">Distance in meters from the location where attendance can be marked.</p>
            </div>
          </div>
        )}

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
          
          {formData.sessionType === 'HYBRID' ? (
            <>
              {/* Hybrid Mode: Two separate sections */}
              <div className="form-group" style={{ marginBottom: '30px' }}>
                <h4 style={{ marginBottom: '10px', color: '#374151' }}>Physical Attendees (Location Required)</h4>
                <p style={{ marginBottom: '15px', color: '#6b7280', fontSize: '0.9rem' }}>
                  These users must be at the location to scan.
                </p>
                <button
                  type="button"
                  onClick={() => openUserModal('PHYSICAL')}
                  className="btn-secondary"
                >
                  {physicalUsers.length > 0 
                    ? `Edit Physical Users (${physicalUsers.length} selected)` 
                    : '+ Add Physical Users'}
                </button>
                {physicalUsers.length > 0 && (
                  <div className="selected-users" style={{ marginTop: '15px' }}>
                    <p><strong>Physical Users ({physicalUsers.length}):</strong></p>
                    <div className="selected-users-list">
                      {physicalUsers.map(user => (
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

              <div className="form-group">
                <h4 style={{ marginBottom: '10px', color: '#374151' }}>Remote Attendees</h4>
                <p style={{ marginBottom: '15px', color: '#6b7280', fontSize: '0.9rem' }}>
                  These users can scan from anywhere.
                </p>
                <button
                  type="button"
                  onClick={() => openUserModal('REMOTE')}
                  className="btn-secondary"
                >
                  {remoteUsers.length > 0 
                    ? `Edit Remote Users (${remoteUsers.length} selected)` 
                    : '+ Add Remote Users'}
                </button>
                {remoteUsers.length > 0 && (
                  <div className="selected-users" style={{ marginTop: '15px' }}>
                    <p><strong>Remote Users ({remoteUsers.length}):</strong></p>
                    <div className="selected-users-list">
                      {remoteUsers.map(user => (
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
            </>
          ) : (
            /* Physical or Remote Mode: Single section */
            <div className="form-group">
              <button
                type="button"
                onClick={() => openUserModal('ALL')}
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
          )}
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
            {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
          </button>
        </div>
      </form>

      {showUserModal && (
        <AddUsersModal
          onClose={() => setShowUserModal(false)}
          onSave={handleSaveUsers}
          initialSelectedUsers={
            userModalContext === 'PHYSICAL' 
              ? physicalUsers 
              : userModalContext === 'REMOTE' 
                ? remoteUsers 
                : assignedUsers
          }
          context={
            userModalContext === 'PHYSICAL' 
              ? 'Add Physical Attendees' 
              : userModalContext === 'REMOTE' 
                ? 'Add Remote Attendees' 
                : 'Add Users to Session'
          }
        />
      )}
    </div>
  );
};

export default EditSession;

