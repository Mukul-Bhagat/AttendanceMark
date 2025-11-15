import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { ISession } from '../types';
import { useAuth } from '../contexts/AuthContext';
import './Sessions.css';

const Sessions: React.FC = () => {
  const navigate = useNavigate();
  const { user, isSuperAdmin, isCompanyAdmin, isManager, isSessionAdmin } = useAuth();
  const [sessions, setSessions] = useState<ISession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // SuperAdmin, CompanyAdmin, Manager, and SessionAdmin can create sessions
  const canCreateSession = isSuperAdmin || isCompanyAdmin || isManager || isSessionAdmin;
  
  // Check if user can edit a specific session
  const canEditSession = (session: ISession) => {
    if (isSuperAdmin) return true; // SuperAdmin can edit any session
    if (isSessionAdmin && session.sessionAdmin === user?.id) return true; // SessionAdmin can edit their assigned sessions
    return false;
  };

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
        return dateString; // Return original if invalid
      }
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString; // Return original if error
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

  if (isLoading) {
    return (
      <div className="sessions-page">
        <div className="sessions-header">
          <h1>Sessions</h1>
          {canCreateSession && (
            <Link to="/sessions/create" className="btn-primary create-session-link">
              + Create New Session
            </Link>
          )}
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
          <h1>Sessions</h1>
          {canCreateSession && (
            <Link to="/sessions/create" className="btn-primary create-session-link">
              + Create New Session
            </Link>
          )}
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
        <h1>Sessions</h1>
        {canCreateSession && (
          <Link to="/sessions/create" className="btn-primary create-session-link">
            + Create New Session
          </Link>
        )}
      </div>

      {sessions.length === 0 ? (
        <div className="sessions-placeholder">
          <p>No sessions yet. Create your first session to get started!</p>
        </div>
      ) : (
        <div className="sessions-grid">
          {sessions.map((session) => (
            <div
              key={session._id}
              className="session-card"
              onClick={() => navigate(`/sessions/${session._id}`)}
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
                {session.assignedUsers && Array.isArray(session.assignedUsers) && session.assignedUsers.length > 0 && (
                  <p>
                    <strong>Assigned Users:</strong> {session.assignedUsers.length}
                  </p>
                )}
              </div>
              <div className="session-actions">
                <div
                  className="btn-secondary view-session-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/sessions/${session._id}`);
                  }}
                >
                  View Details
                </div>
                {canEditSession(session) && (
                  <div
                    className="btn-primary edit-session-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/sessions/edit/${session._id}`);
                    }}
                  >
                    Edit
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Sessions;
