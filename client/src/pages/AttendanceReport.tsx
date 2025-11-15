import React, { useState, useEffect } from 'react';
import api from '../api';
import { ISession, IMyAttendanceRecord } from '../types';
import { IUser } from '../contexts/AuthContext';
import './MyAttendance.css';
import './CreateSession.css';

// Define a new type for the session report (with populated user)
interface ISessionAttendanceRecord {
  _id: string;
  checkInTime: string;
  locationVerified: boolean;
  userId: {
    _id: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
    };
  } | null;
}

const AttendanceReport: React.FC = () => {
  const [filterType, setFilterType] = useState<'session' | 'user'>('session');
  
  // Data for dropdowns
  const [allSessions, setAllSessions] = useState<ISession[]>([]);
  const [allUsers, setAllUsers] = useState<IUser[]>([]);
  
  // Selected filter
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  
  // Report data
  const [sessionReport, setSessionReport] = useState<ISessionAttendanceRecord[]>([]);
  const [userReport, setUserReport] = useState<IMyAttendanceRecord[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingFilters, setIsLoadingFilters] = useState(true);
  const [error, setError] = useState('');

  // 1. Fetch data for both dropdowns on page load
  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingFilters(true);
      setError('');
      try {
        // Fetch sessions and users in parallel
        const [sessionRes, userRes] = await Promise.all([
          api.get('/api/sessions'),
          api.get('/api/users/my-organization')
        ]);
        setAllSessions(sessionRes.data || []);
        setAllUsers(userRes.data || []);
      } catch (err: any) {
        if (err.response?.status === 401) {
          setError('You are not authorized. Please log in again.');
        } else {
          setError('Failed to load filter data. Please try again.');
        }
        console.error(err);
      } finally {
        setIsLoadingFilters(false);
      }
    };
    fetchData();
  }, []);

  // 2. Fetch report when the "View Report" button is clicked
  const handleViewReport = async () => {
    setIsLoading(true);
    setError('');
    setSessionReport([]);
    setUserReport([]);

    try {
      if (filterType === 'session' && selectedSession) {
        const { data } = await api.get(`/api/attendance/session/${selectedSession}`);
        setSessionReport(data || []);
      } else if (filterType === 'user' && selectedUser) {
        const { data } = await api.get(`/api/attendance/user/${selectedUser}`);
        setUserReport(data || []);
      } else {
        setError('Please select a session or user.');
        setIsLoading(false);
        return;
      }
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError('You are not authorized to view attendance reports.');
      } else if (err.response?.status === 404) {
        setError(err.response.data.msg || 'Session or user not found.');
      } else {
        setError(err.response?.data?.msg || 'Failed to fetch report. Please try again.');
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString;
      }
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const formatSessionDateTime = (session: any) => {
    if (!session || !session.startDate || !session.startTime) {
      return 'N/A';
    }
    
    try {
      const [hour, minute] = session.startTime.split(':').map(Number);
      const sessionDate = new Date(session.startDate);
      sessionDate.setHours(hour, minute, 0, 0);
      
      if (isNaN(sessionDate.getTime())) {
        return 'N/A';
      }
      
      return sessionDate.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'N/A';
    }
  };

  if (isLoadingFilters) {
    return (
      <div className="my-attendance-container">
        <h1>Attendance Report</h1>
        <div className="loading-container">
          <div className="loading-spinner-inline">
            <div className="spinner"></div>
            <p className="loading-text">Loading filters...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="my-attendance-container">
      <h1>Attendance Report</h1>
      
      {error && !isLoading && (
        <div className="error-message" style={{ marginBottom: '20px' }}>
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      {/* --- FILTER SECTION --- */}
      <div className="form-card" style={{ maxWidth: '900px', margin: '0 auto 30px auto' }}>
        <h3>📊 Report Filters</h3>
        <div className="form-grid-2">
          <div className="form-group">
            <label>View by:</label>
            <select 
              value={filterType} 
              onChange={(e) => {
                setFilterType(e.target.value as 'session' | 'user');
                setSelectedSession('');
                setSelectedUser('');
                setSessionReport([]);
                setUserReport([]);
                setError('');
              }}
              disabled={isLoading}
            >
              <option value="session">By Session</option>
              <option value="user">By User</option>
            </select>
          </div>
          {filterType === 'session' ? (
            <div className="form-group">
              <label>Select a Session:</label>
              <select 
                value={selectedSession} 
                onChange={(e) => {
                  setSelectedSession(e.target.value);
                  setSessionReport([]);
                  setError('');
                }}
                disabled={isLoading}
              >
                <option value="">-- Select Session --</option>
                {allSessions.map((session) => (
                  <option key={session._id} value={session._id}>
                    {session.name} ({new Date(session.startDate).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="form-group">
              <label>Select a User:</label>
              <select 
                value={selectedUser} 
                onChange={(e) => {
                  setSelectedUser(e.target.value);
                  setUserReport([]);
                  setError('');
                }}
                disabled={isLoading}
              >
                <option value="">-- Select User --</option>
                {allUsers.map((user) => {
                  const userId = (user as any)._id || user.id;
                  return (
                    <option key={userId} value={userId}>
                      {user.profile.firstName} {user.profile.lastName} ({user.email})
                    </option>
                  );
                })}
              </select>
            </div>
          )}
        </div>
        <div className="form-actions" style={{ marginTop: '20px', justifyContent: 'center' }}>
          <button 
            className="btn-primary" 
            onClick={handleViewReport} 
            disabled={isLoading || (filterType === 'session' && !selectedSession) || (filterType === 'user' && !selectedUser)}
            style={{ minWidth: '150px' }}
          >
            {isLoading ? (
              <>
                <span className="spinner-small"></span>
                Loading...
              </>
            ) : (
              'View Report'
            )}
          </button>
        </div>
      </div>

      {/* --- REPORT SECTION --- */}
      {isLoading && (
        <div className="loading-container">
          <div className="loading-spinner-inline">
            <div className="spinner"></div>
            <p className="loading-text">Loading report...</p>
          </div>
        </div>
      )}

      {/* Report by Session */}
      {!isLoading && sessionReport.length > 0 && (
        <div className="report-section">
          <div className="report-header">
            <h2>📋 Session Attendance Report</h2>
            <div className="report-summary">
              <span className="summary-badge">Total Attendees: {sessionReport.length}</span>
              <span className="summary-badge" style={{ backgroundColor: '#d1fae5', color: '#065f46' }}>
                Verified: {sessionReport.filter(r => r.locationVerified).length}
              </span>
              <span className="summary-badge" style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}>
                Not Verified: {sessionReport.filter(r => !r.locationVerified).length}
              </span>
            </div>
          </div>
          <div className="attendance-table-wrapper">
            <table className="attendance-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Check-in Time (QR Scan)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sessionReport.map(record => (
                  <tr key={record._id}>
                    <td className="session-name-cell">
                      {record.userId ? (
                        <strong>{record.userId.profile.firstName} {record.userId.profile.lastName}</strong>
                      ) : (
                        <span className="deleted-session">User (deleted)</span>
                      )}
                    </td>
                    <td>{record.userId ? record.userId.email : 'N/A'}</td>
                    <td>{formatDateTime(record.checkInTime)}</td>
                    <td>
                      {record.locationVerified ? (
                        <span className="status-verified">✓ Verified</span>
                      ) : (
                        <span className="status-failed">✗ Not Verified</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Report by User */}
      {!isLoading && userReport.length > 0 && (
        <div className="report-section">
          <div className="report-header">
            <h2>👤 User Attendance Report</h2>
            <div className="report-summary">
              <span className="summary-badge">Total Sessions Attended: {userReport.length}</span>
              <span className="summary-badge" style={{ backgroundColor: '#d1fae5', color: '#065f46' }}>
                Verified: {userReport.filter(r => r.locationVerified).length}
              </span>
              <span className="summary-badge" style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}>
                Not Verified: {userReport.filter(r => !r.locationVerified).length}
              </span>
            </div>
          </div>
          <div className="attendance-table-wrapper">
            <table className="attendance-table">
              <thead>
                <tr>
                  <th>Session Name</th>
                  <th>Session Start Time</th>
                  <th>Check-in Time (QR Scan)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {userReport.map(record => (
                  <tr key={record._id}>
                    <td className="session-name-cell">
                      {record.sessionId ? (
                        <div>
                          <strong>{record.sessionId.name}</strong>
                          {record.sessionId.description && (
                            <p className="session-description-small">{record.sessionId.description}</p>
                          )}
                        </div>
                      ) : (
                        <span className="deleted-session">Session (deleted)</span>
                      )}
                    </td>
                    <td>{formatSessionDateTime(record.sessionId)}</td>
                    <td>{formatDateTime(record.checkInTime)}</td>
                    <td>
                      {record.locationVerified ? (
                        <span className="status-verified">✓ Verified</span>
                      ) : (
                        <span className="status-failed">✗ Not Verified</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state when no report data - initial state */}
      {!isLoading && sessionReport.length === 0 && userReport.length === 0 && !error && selectedSession === '' && selectedUser === '' && (
        <div className="empty-state" style={{ marginTop: '40px' }}>
          <p style={{ fontSize: '1.3rem', fontWeight: 600, color: '#374151', marginBottom: '12px' }}>📊 Ready to Generate Report</p>
          <p className="empty-state-hint">Select a session or user above and click "View Report" to generate a report.</p>
        </div>
      )}

      {/* Empty state when report has no data - after selection */}
      {!isLoading && sessionReport.length === 0 && userReport.length === 0 && !error && (selectedSession !== '' || selectedUser !== '') && (
        <div className="empty-state" style={{ marginTop: '40px' }}>
          <p style={{ fontSize: '1.3rem', fontWeight: 600, color: '#374151', marginBottom: '12px' }}>📭 No Attendance Records Found</p>
          <p className="empty-state-hint">
            {filterType === 'session' 
              ? 'No users have marked attendance for this session yet.' 
              : 'This user has not marked attendance for any sessions yet.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default AttendanceReport;

