import React, { useState } from 'react';
import api from '../api';
import { Link } from 'react-router-dom';

const ForgotPassword: React.FC = () => {
  const [organizationName, setOrganizationName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      const { data } = await api.post('/api/auth/forgot-password', { organizationName, email });
      setMessage(data.msg + ' Check your Ethereal inbox.'); // Show success
    } catch (err: any) {
      if (err.response?.data?.errors) {
        const errorMessages = err.response.data.errors.map((e: any) => e.msg).join(', ');
        setError(errorMessages);
      } else {
        setError(err.response?.data?.msg || 'An error occurred');
      }
    }
  };

  return (
    <div className="form-container" style={{ maxWidth: '500px' }}>
      <h1>Forgot Password</h1>
      <p style={{ color: '#6b7280', marginBottom: '24px', textAlign: 'center' }}>
        Enter your organization and email to receive a reset link.
      </p>
      
      {message && (
        <div className="success-message" style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#d1fae5', border: '1px solid #10b981', borderRadius: '6px', color: '#065f46' }}>
          {message}
        </div>
      )}
      {error && (
        <div className="error-message" style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#dc2626' }}>
          {error}
        </div>
      )}
      
      <form onSubmit={onSubmit}>
        <div className="form-group">
          <label>Organization Name *</label>
          <input
            type="text"
            value={organizationName}
            onChange={(e) => {
              setOrganizationName(e.target.value);
              if (error) setError('');
            }}
            required
            disabled={!!message}
            autoComplete="organization"
          />
        </div>
        <div className="form-group">
          <label>Your Email *</label>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError('');
            }}
            required
            disabled={!!message}
            autoComplete="email"
          />
        </div>
        <button type="submit" disabled={!!message} style={{ width: '100%' }}>
          {message ? 'Email Sent!' : 'Send Reset Link'}
        </button>
      </form>
      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <Link to="/login" style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '0.95rem' }}>
          Back to Login
        </Link>
      </div>
    </div>
  );
};

export default ForgotPassword;

