import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

// Component to redirect logged-in users away from public pages (login/register)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, isLoading } = useAuth();

  // Show loading spinner while checking
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // If user is already logged in, redirect to dashboard
  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  // If not logged in, show the public page
  return <>{children}</>;
};

export default PublicRoute;

