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
  const [showError, setShowError] = useState(false); // Separate flag to control visibility
  const [renderKey, setRenderKey] = useState(0); // Force re-render when error is set
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const orgNameInputRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<string>(''); // Use ref to persist error across renders

  const { organizationName, email, password } = formData;

  // Auto-focus first input on mount
  useEffect(() => {
    orgNameInputRef.current?.focus();
  }, []);

  // Debug: Log when error state changes
  useEffect(() => {
    console.log('Error state changed. Current error:', error);
    if (error) {
      console.log('Error state updated to:', error);
      console.log('Error length:', error.length);
    } else {
      console.log('Error state is empty/null');
    }
  }, [error]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Clear error when user starts typing
    if (error || showError) {
      setError('');
      errorRef.current = '';
      setShowError(false);
    }
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling
    
    // Clear any previous errors BEFORE setting submitting
    // This ensures the error is cleared before the async operation
    if (error || errorRef.current) {
      console.log('Clearing previous error before new attempt');
      setError('');
      errorRef.current = '';
      setShowError(false);
    }
    
    setIsSubmitting(true);
    
    try {
      // Call the login function from the context
      await login(formData);
      
      // Only navigate if login was successful (no error thrown)
      // Wait a brief moment to ensure state has updated before navigating
      // This prevents race conditions where navigation happens before user state is set
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // On success, redirect to dashboard
      navigate('/dashboard'); 
    } catch (err: any) {
      // IMPORTANT: Don't navigate on error - stay on login page and show error
      console.log('Login error caught:', err); // Debug log
      const status = err.response?.status;
      console.log('Error status:', status); // Debug log

      let errorMessage = '';
      
      // Friendly message for invalid credentials / org name
      if (status === 401) {
        errorMessage = 'Email and password is invalid. Please check your credentials and try again.';
      } else if (err.response && err.response.data) {
        // Handle express-validator errors (array format)
        if (err.response.data.errors && Array.isArray(err.response.data.errors)) {
          errorMessage = err.response.data.errors.map((e: any) => e.msg).join(', ');
        } else {
          errorMessage = err.response.data.msg || 'Login failed';
        }
      } else if (err.message) {
        // Handle network errors or other errors
        errorMessage = err.message || 'Login failed. Please check your connection and try again.';
      } else {
        errorMessage = 'Login failed. Please check your connection and try again.';
      }
      
      console.log('Setting error message to:', errorMessage); // Debug log
      
      // Store in ref FIRST - this persists across renders
      errorRef.current = errorMessage;
      console.log('Stored in ref:', errorRef.current);
      
      // CRITICAL: Set error state, showError flag, and increment renderKey to force re-render
      setError(errorMessage);
      setShowError(true);
      setRenderKey(prev => prev + 1); // Force re-render
      
      console.log('Error set, showError flag set to true, renderKey incremented');
      
      // Force additional re-renders to ensure error displays
      setTimeout(() => {
        console.log('First re-render check. Ref:', errorRef.current);
        if (errorRef.current) {
          setError(errorRef.current);
          setShowError(true);
          setRenderKey(prev => prev + 1);
        }
      }, 0);
      
      setTimeout(() => {
        console.log('Second re-render check. Ref:', errorRef.current);
        if (errorRef.current) {
          setError(errorRef.current);
          setShowError(true);
          setRenderKey(prev => prev + 1);
        }
      }, 50);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Debug: Log error value during render
  if (error) {
    console.log('Rendering LoginPage WITH ERROR. Error state:', error, 'Length:', error.length);
  }

  return (
    <div className="form-container">
      <h1>Login</h1>
      {/* Display error - check ref first since it persists */}
      {/* renderKey forces re-render when error is set - using it here to avoid linter warning */}
      {errorRef.current && errorRef.current.trim().length > 0 && renderKey >= 0 ? (
        <div 
          className="error-message" 
          role="alert"
          aria-live="polite"
          style={{ 
            marginBottom: '20px', 
            padding: '12px 16px', 
            backgroundColor: '#fee2e2', 
            border: '2px solid #dc2626', 
            borderRadius: '6px', 
            color: '#dc2626',
            fontSize: '0.95rem',
            fontWeight: '600',
            display: 'block',
            width: '100%',
            boxSizing: 'border-box',
            minHeight: '40px'
          }}
        >
          <strong style={{ marginRight: '8px' }}>⚠️</strong>
          <span>{errorRef.current}</span>
        </div>
      ) : error && error.trim().length > 0 ? (
        <div 
          className="error-message" 
          role="alert"
          aria-live="polite"
          style={{ 
            marginBottom: '20px', 
            padding: '12px 16px', 
            backgroundColor: '#fee2e2', 
            border: '2px solid #dc2626', 
            borderRadius: '6px', 
            color: '#dc2626',
            fontSize: '0.95rem',
            fontWeight: '600',
            display: 'block',
            width: '100%',
            boxSizing: 'border-box',
            minHeight: '40px'
          }}
        >
          <strong style={{ marginRight: '8px' }}>⚠️</strong>
          <span>{error}</span>
        </div>
      ) : null}
      <form onSubmit={onSubmit} noValidate>
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

