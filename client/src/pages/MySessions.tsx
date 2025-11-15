import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { ISession } from '../types';
import './Sessions.css'; // Reuse the same styles

const MySessions: React.FC = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<ISession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const { data } = await api.get('/api/sessions');
        setSessions(data || []);
      } catch (err: any) {
        if (err.response?.status === 401) {
          setError('You are not authorized. Please log in again.');
        } else {
          setError('Failed to load sessions. Please try again.');
        }
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessions();
  }, []);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString;
      }
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const formatFrequency = (frequency: string) => {
    const freqMap: { [key: string]: string } = {
      OneTime: 'One Time',
      Daily: 'Daily',
      Weekly: 'Weekly',
      Monthly: 'Monthly',
    };
    return freqMap[frequency] || frequency;
  };

  const handleSessionClick = (sessionId: string) => {
    // Navigate to Scan QR page with session ID
    navigate(`/scan?sessionId=${sessionId}`);
  };

  if (isLoading) {
    return (
      <div className="sessions-page">
        <div className="sessions-header">
          <h1>My Sessions</h1>
        </div>
        <div className="sessions-loading">
          <div className="loading-spinner-inline">
            <div className="spinner"></div>
            <p className="loading-text">Loading sessions...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="sessions-page">
        <div className="sessions-header">
          <h1>My Sessions</h1>
        </div>
        <div className="sessions-placeholder">
          <p className="error-message">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sessions-page">
      <div className="sessions-header">
        <h1>My Sessions</h1>
        <p style={{ color: '#6b7280', marginTop: '8px', fontSize: '0.95rem' }}>
          Click on a session to scan QR code and mark attendance
        </p>
      </div>

      {sessions.length === 0 ? (
        <div className="sessions-placeholder">
          <p>No sessions available yet.</p>
        </div>
      ) : (
        <div className="sessions-grid">
          {sessions.map((session) => (
            <div
              key={session._id}
              className="session-card"
              onClick={() => handleSessionClick(session._id)}
              style={{ cursor: 'pointer' }}
            >
              <h3>{session.name}</h3>
              {session.description && (
                <p className="session-description">{session.description}</p>
              )}
              <div className="session-info">
                <p>
                  <strong>Frequency:</strong> {formatFrequency(session.frequency)}
                </p>
                <p>
                  <strong>Start Date:</strong> {formatDate(session.startDate)}
                </p>
                {session.endDate && (
                  <p>
                    <strong>End Date:</strong> {formatDate(session.endDate)}
                  </p>
                )}
                <p>
                  <strong>Time:</strong> {session.startTime} - {session.endTime}
                </p>
                <p>
                  <strong>Location:</strong> {session.locationType}
                </p>
              </div>
              <div className="session-actions">
                <div className="btn-primary" style={{ width: '100%', textAlign: 'center' }}>
                  📷 Scan QR Code
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MySessions;

