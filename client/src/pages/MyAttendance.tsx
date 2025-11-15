import React, { useState, useEffect } from 'react';
import api from '../api';
import { IMyAttendanceRecord } from '../types';
import './MyAttendance.css';

const MyAttendance: React.FC = () => {
  const [records, setRecords] = useState<IMyAttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMyAttendance = async () => {
      try {
        // Call the new endpoint we just created
        const { data } = await api.get('/api/attendance/me');
        setRecords(data || []);
      } catch (err: any) {
        if (err.response?.status === 401) {
          setError('You are not authorized. Please log in again.');
        } else {
          setError('Failed to fetch attendance history.');
        }
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMyAttendance();
  }, []);

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

  if (isLoading) {
    return (
      <div className="my-attendance-container">
        <h1>My Attendance History</h1>
        <div className="loading-container">
          <div className="loading-spinner-inline">
            <div className="spinner"></div>
            <p className="loading-text">Loading attendance history...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-attendance-container">
        <h1>My Attendance History</h1>
        <div className="error-message">{error}</div>
      </div>
    );
  }

  const totalRecords = records.length;
  const verifiedCount = records.filter(r => r.locationVerified).length;
  const notVerifiedCount = totalRecords - verifiedCount;

  return (
    <div className="my-attendance-container">
      <h1>My Attendance History</h1>
      
      {records.length === 0 ? (
        <div className="empty-state">
          <p>You have no attendance records yet.</p>
          <p className="empty-state-hint">Scan a QR code to mark your attendance for a session.</p>
        </div>
      ) : (
        <>
          <div className="attendance-summary">
            <div className="summary-card">
              <div className="summary-card-label">Total Records</div>
              <div className="summary-card-value">{totalRecords}</div>
            </div>
            <div className="summary-card">
              <div className="summary-card-label">Verified</div>
              <div className="summary-card-value" style={{ color: '#065f46' }}>{verifiedCount}</div>
            </div>
            <div className="summary-card">
              <div className="summary-card-label">Not Verified</div>
              <div className="summary-card-value" style={{ color: '#991b1b' }}>{notVerifiedCount}</div>
            </div>
          </div>

          <div className="attendance-table-wrapper">
            <table className="attendance-table">
              <thead>
                <tr>
                  <th>Session Name</th>
                  <th>Session Start Time</th>
                  <th>My Check-in Time</th>
                  <th>Location Status</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
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
        </>
      )}
    </div>
  );
};

export default MyAttendance;

