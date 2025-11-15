import React, { useState, useEffect } from 'react';
import api from '../api';
import { useParams, Link } from 'react-router-dom';
import { ISession } from '../types';
import { QRCodeSVG } from 'qrcode.react';

const SessionDetails: React.FC = () => {
  const [session, setSession] = useState<ISession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const { id } = useParams<{ id: string }>(); // Get the session ID from the URL

  useEffect(() => {
    const fetchSession = async () => {
      if (!id) {
        setError('Invalid session ID.');
        setIsLoading(false);
        return;
      }

      try {
        const { data } = await api.get(`/api/sessions/${id}`);
        setSession(data);
      } catch (err: any) {
        if (err.response?.status === 401) {
          setError('You are not authorized to view this session.');
        } else if (err.response?.status === 404) {
          setError('Session not found.');
        } else {
          setError('Failed to load session. Please try again.');
        }
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSession();
  }, [id]);

  if (isLoading) {
    return (
      <div className="session-details-container">
        <div className="loading-spinner-inline">
          <div className="spinner"></div>
          <p className="loading-text">Loading session...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="session-details-container">
        <p className="error-message">{error || 'Session not found.'}</p>
        <Link to="/sessions" className="btn-secondary">
          &larr; Back to All Sessions
        </Link>
      </div>
    );
  }

  // The value of the QR code will be the session's unique _id
  // This is what the End User's app will scan
  const qrValue = session._id;

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString; // Return original if invalid
      }
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
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

  return (
    <div className="session-details-container">
      <div className="session-details-header">
        <Link to="/sessions" className="btn-secondary back-button">
          &larr; Back to All Sessions
        </Link>
      </div>
      
      <div className="session-details-content">
        <div className="session-info-card">
          <h1>{session.name}</h1>
          {session.description && (
            <p className="session-description">{session.description}</p>
          )}
          <div className="session-details-info">
            <div className="info-item">
              <span className="info-label">Frequency:</span>
              <span className="info-value">{formatFrequency(session.frequency)}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Start Date:</span>
              <span className="info-value">{formatDate(session.startDate)}</span>
            </div>
            {session.endDate && (
              <div className="info-item">
                <span className="info-label">End Date:</span>
                <span className="info-value">{formatDate(session.endDate)}</span>
              </div>
            )}
            <div className="info-item">
              <span className="info-label">Time:</span>
              <span className="info-value">{session.startTime} - {session.endTime}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Location Type:</span>
              <span className="info-value">{session.locationType}</span>
            </div>
            {session.physicalLocation && (
              <div className="info-item">
                <span className="info-label">Physical Location:</span>
                <span className="info-value">{session.physicalLocation}</span>
              </div>
            )}
            {session.virtualLocation && (
              <div className="info-item">
                <span className="info-label">Virtual Location:</span>
                <span className="info-value">
                  <a href={session.virtualLocation} target="_blank" rel="noopener noreferrer">
                    {session.virtualLocation}
                  </a>
                </span>
              </div>
            )}
            {session.assignedUsers && Array.isArray(session.assignedUsers) && session.assignedUsers.length > 0 && (
              <div className="info-item">
                <span className="info-label">Assigned Users:</span>
                <span className="info-value">{session.assignedUsers.length} user(s)</span>
              </div>
            )}
          </div>
        </div>

        <div className="qr-code-card">
          <h3>Scan this code for attendance</h3>
          <div className="qr-code-wrapper">
            <QRCodeSVG
              value={qrValue}
              size={256}
              level={'H'}
              includeMargin={true}
            />
          </div>
          <div className="qr-code-info">
            <p>
              <strong>Session ID:</strong> <code className="session-id">{qrValue}</code>
            </p>
            <p className="qr-instruction">
              Point the End User's camera at this code to mark attendance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionDetails;

