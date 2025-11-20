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
    <div className="relative flex min-h-screen w-full flex-col bg-background-light dark:bg-background-dark group/design-root" style={{ fontFamily: 'Manrope, "Noto Sans", sans-serif' }}>
      <div className="flex h-full grow flex-col">
        <div className="flex flex-1">
          <div className="flex w-full flex-col lg:flex-row">
            {/* Branding Panel */}
            <div className="relative hidden w-1/2 flex-col items-center justify-center bg-slate-900 lg:flex">
              <div className="flex flex-col items-center gap-6 text-center text-white">
                <div className="flex items-center gap-3">
                  <svg className="h-10 w-10 text-primary" fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path>
                    <path d="m9 12 2 2 4-4"></path>
                  </svg>
                  <h1 className="font-display text-4xl font-bold tracking-tight">AttendMark</h1>
                </div>
                <p className="max-w-xs text-lg font-light text-slate-300">Marking presence, perfecting performance. Your success, recorded.</p>
              </div>
            </div>

            {/* Form Container */}
            <div className="flex w-full flex-col items-center justify-center bg-background-light p-6 lg:w-1/2 lg:p-10">
              <div className="layout-content-container flex w-full max-w-md flex-col">
                {/* Main AttendMark Logo */}
                <div className="flex justify-center mb-8">
                  {/* Light Mode Logo (Black Text) - Shows by default, hides in dark mode */}
                  <img
                    src="/assets/attendmarklogo.png"
                    alt="AttendMark"
                    className="h-16 w-auto object-contain block dark:hidden"
                  />
                  {/* Dark Mode Logo (White Text) - Hides by default, shows in dark mode */}
                  <img
                    src="/assets/atendmarkwhitelogo.png"
                    alt="AttendMark"
                    className="h-16 w-auto object-contain hidden dark:block"
                  />
                </div>
                
                <h1 className="text-slate-900 tracking-light text-[32px] font-bold leading-tight pb-3">Welcome back</h1>
                <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 py-3">
                  <label className="flex flex-col flex-1">
                    <p className="text-slate-900 text-base font-medium leading-normal pb-2">Organization Name</p>
                    <input
                      ref={orgNameInputRef}
                      className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-slate-900 focus:outline-0 border border-slate-300 bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 h-14 placeholder:text-gray-400 p-[15px] text-base font-normal leading-normal"
                      placeholder="Enter your organization's name"
                      type="text"
                      name="organizationName"
                      value={organizationName}
                      onChange={onChange}
                      required
                      autoComplete="organization"
                    />
                  </label>

                  <label className="flex flex-col flex-1">
                    <p className="text-slate-900 text-base font-medium leading-normal pb-2">Email</p>
                    <input
                      className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-slate-900 focus:outline-0 border border-slate-300 bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 h-14 placeholder:text-gray-400 p-[15px] text-base font-normal leading-normal"
                      placeholder="you@example.com"
                      type="email"
                      name="email"
                      value={email}
                      onChange={onChange}
                      required
                      autoComplete="email"
                    />
                  </label>

                  <label className="flex flex-col flex-1">
                    <p className="text-slate-900 text-base font-medium leading-normal pb-2">Password</p>
                    <div className="relative flex w-full flex-1 items-stretch">
                      <input
                        className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-slate-900 focus:outline-0 border border-slate-300 bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 h-14 placeholder:text-gray-400 p-[15px] pr-12 text-base font-normal leading-normal"
                        placeholder="Enter your password"
                        type="password"
                        name="password"
                        value={password}
                        onChange={onChange}
                        required
                        autoComplete="current-password"
                      />
                      <button type="button" className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500 hover:text-primary">
                        <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>visibility</span>
                      </button>
                    </div>
                  </label>

                  <div className="flex justify-end pt-1 pb-3">
                    <Link to="/forgot-password" className="text-slate-900 text-sm font-medium leading-normal underline hover:text-primary cursor-pointer">
                      Forgot Password?
                    </Link>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || isLoading}
                    className={`flex items-center justify-center text-center font-bold text-base h-14 w-full rounded-lg bg-primary text-white hover:bg-[#d63a25] transition-colors duration-200 mt-4 ${
                      isSubmitting || isLoading ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                  >
                    {isSubmitting || isLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"></path>
                        </svg>
                        Logging in...
                      </>
                    ) : (
                      'Login'
                    )}
                  </button>
                </form>

                <div className="mt-6">
                  <p className="text-center text-sm text-slate-600">
                    Don't have an account? <Link to="/register" className="font-bold text-primary underline hover:text-primary/90">Register here</Link>
                  </p>
                </div>

                {/* Error Alert */}
                {hasError && (
                  <div className="mt-6 flex items-center gap-3 rounded-lg border border-red-500/50 bg-red-500/10 p-4" role="alert" aria-live="polite">
                    <span className="material-symbols-outlined text-red-500" style={{ fontSize: '24px' }}>error</span>
                    <p className="text-sm font-medium text-red-500">{errorText}</p>
                  </div>
                )}

                {/* Powered By AI ALLY Logo */}
                <div className="flex items-center justify-center mt-8 pt-6 border-t border-slate-200 dark:border-slate-700" style={{ gap: '8px' }}>
                  <a 
                    href="https://aially.in" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ gap: '8px' }}
                  >
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Powered By</p>
                    <img 
                      src="/assets/image01.png" 
                      alt="AI ALLY Logo" 
                      className="block dark:hidden"
                      style={{ 
                        height: '24px', 
                        width: 'auto',
                        objectFit: 'contain'
                      }}
                    />
                    <img 
                      src="/assets/aiallywhite.png" 
                      alt="AI ALLY Logo" 
                      className="hidden dark:block"
                      style={{ 
                        height: '24px', 
                        width: 'auto',
                        objectFit: 'contain'
                      }}
                    />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

