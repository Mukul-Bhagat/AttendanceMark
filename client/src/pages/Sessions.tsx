import React from 'react';
import { Link } from 'react-router-dom';

const Sessions: React.FC = () => {
  return (
    <div className="sessions-page">
      <div className="sessions-header">
        <h1>Sessions</h1>
        <Link to="/sessions/create" className="btn-primary create-session-link">
          + Create New Session
        </Link>
      </div>
      <div className="sessions-placeholder">
        <p>No sessions yet. Create your first session to get started!</p>
      </div>
    </div>
  );
};

export default Sessions;

