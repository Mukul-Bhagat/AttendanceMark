import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

const ProtectedRoute: React.FC = () => {
  const { token, isLoading } = useAuth();

  // Show a loading spinner while context is checking for a token
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // If there is no token, redirect to the /login page
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // If there is a token, show the child component (which will be our Layout)
  // The <Outlet> renders the *nested* routes (e.g., /dashboard)
  return <Outlet />;
};

export default ProtectedRoute;

