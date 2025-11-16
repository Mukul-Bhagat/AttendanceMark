import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Helper functions for sessionStorage (moved outside component to avoid recreation)
const getStoredError = (): string => {
  try {
    return sessionStorage.getItem('loginError') || '';
  } catch {
    return '';
  }
};

const setStoredError = (errorMsg: string): void => {
  try {
    if (errorMsg) {
      sessionStorage.setItem('loginError', errorMsg);
    } else {
      sessionStorage.removeItem('loginError');
    }
  } catch {
    // Ignore sessionStorage errors
  }
};

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
  const errorPersistRef = useRef<string>('');

  const { organizationName, email, password } = formData;

  // Auto-focus first input on mount
  useEffect(() => {
    orgNameInputRef.current?.focus();
  }, []);

  // Restore error from sessionStorage/ref on mount (in case component was remounted)
  useEffect(() => {
    const storedError = getStoredError();
    if (storedError && !error) {
      setError(storedError);
      errorPersistRef.current = storedError;
    } else if (errorPersistRef.current && !error) {
      setError(errorPersistRef.current);
    }
  }, []);

  // Memoize clear error function
  const clearError = useCallback(() => {
    setError('');
    errorPersistRef.current = '';
    setStoredError('');
  }, []);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    // Clear error when user starts typing
    if (error || errorPersistRef.current || getStoredError()) {
      clearError();
    }
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling
    
    // Clear any previous errors before new attempt
    if (error || errorPersistRef.current || getStoredError()) {
      clearError();
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
      // Don't navigate on error - stay on login page and show error
      const status = err.response?.status;
      let errorMessage = '';
      
      // Friendly message for invalid credentials
      if (status === 401) {
        errorMessage = 'Email and password is invalid. Please check your credentials and try again.';
      } else if (err.response?.data) {
        // Handle express-validator errors (array format)
        if (err.response.data.errors && Array.isArray(err.response.data.errors)) {
          errorMessage = err.response.data.errors.map((e: any) => e.msg).join(', ');
        } else {
          errorMessage = err.response.data.msg || 'Login failed';
        }
      } else if (err.message) {
        // Handle network errors
        errorMessage = err.message || 'Login failed. Please check your connection and try again.';
      } else {
        errorMessage = 'Login failed. Please check your connection and try again.';
      }
      
      // Store in multiple places to persist across remounts
      setStoredError(errorMessage);
      errorPersistRef.current = errorMessage;
      setError(errorMessage);
      
      // Restore error if component remounts (check after a brief delay)
      setTimeout(() => {
        const stored = getStoredError();
        if (stored) {
          setError(prevError => prevError || stored);
        }
      }, 50);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get error from most persistent source first (sessionStorage > ref > state)
  const { errorText, hasError } = useMemo(() => {
    const storedError = getStoredError();
    const text = (error?.trim() || errorPersistRef.current?.trim() || storedError?.trim() || '');
    return { errorText: text, hasError: text.length > 0 };
  }, [error]);

  return (
    <div className="form-container">
      <h1>Login</h1>
      {/* Display error - check ref first (persists across remounts), then state */}
      {hasError && (
        <div 
          key={`error-${errorText}`}
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
            minHeight: '40px',
            animation: 'fadeIn 0.3s ease-in'
          }}
        >
          <strong style={{ marginRight: '8px' }}>⚠️</strong>
          <span>{errorText}</span>
        </div>
      )}
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

