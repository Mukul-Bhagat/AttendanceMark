import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const LoginPage: React.FC = () => {
  const [formData, setFormData] = useState({
    organizationName: '',
    email: '',
    password: '',
  });
  
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const orgNameInputRef = useRef<HTMLInputElement>(null);

  const { organizationName, email, password } = formData;

  // Auto-focus first input on mount
  useEffect(() => {
    orgNameInputRef.current?.focus();
  }, []);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Clear error when user starts typing
    if (error) setError('');
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    try {
      // Call the login function from the context
      await login(formData);
      
      // On success, redirect to dashboard
      navigate('/dashboard'); 
    } catch (err: any) {
      if (err.response && err.response.data) {
        // Handle express-validator errors (array format)
        if (err.response.data.errors && Array.isArray(err.response.data.errors)) {
          const errorMessages = err.response.data.errors.map((e: any) => e.msg).join(', ');
          setError(errorMessages);
        } else {
          setError(err.response.data.msg || 'Login failed');
        }
      } else {
        setError('Login failed. Please check your connection and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="form-container">
      <h1>Login</h1>
      {error && <p className="error-message">{error}</p>}
      <form onSubmit={onSubmit}>
        <div className="form-group">
          <label>Organization Name *</label>
          <input
            ref={orgNameInputRef}
            type="text"
            name="organizationName"
            value={organizationName}
            onChange={onChange}
            required
            autoComplete="organization"
          />
        </div>
        <div className="form-group">
          <label>Your Email *</label>
          <input
            type="email"
            name="email"
            value={email}
            onChange={onChange}
            required
            autoComplete="email"
          />
        </div>
        <div className="form-group">
          <label>Your Password *</label>
          <input
            type="password"
            name="password"
            value={password}
            onChange={onChange}
            required
            autoComplete="current-password"
          />
        </div>
        <button type="submit" disabled={isSubmitting || isLoading}>
          {isSubmitting || isLoading ? 'Logging in...' : 'Login'}
        </button>

        {/* Forgot Password Link */}
        <div style={{ textAlign: 'center', marginTop: '15px' }}>
          <Link to="/forgot-password" style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '0.95rem' }}>
            Forgot Password?
          </Link>
        </div>
      </form>
      <p style={{ textAlign: 'center', marginTop: '20px', color: '#6b7280' }}>
        Don't have an account? <Link to="/register" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 600 }}>Register here</Link>
      </p>
    </div>
  );
};

export default LoginPage;

