import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

type UserRole = 'SuperAdmin' | 'CompanyAdmin' | 'Manager' | 'SessionAdmin' | 'EndUser';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { token, isLoading, user } = useAuth();

  // Show a loading spinner while context is checking for a token
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // If there is no token, redirect to the /login page
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // If allowedRoles is specified, check if user's role is in the allowed list
  if (allowedRoles && allowedRoles.length > 0) {
    if (!user || !allowedRoles.includes(user.role as UserRole)) {
      // User doesn't have the required role, redirect to dashboard
      return <Navigate to="/dashboard" replace />;
    }
  }

  // If there is a token and role check passes, show the child component
  // The <Outlet> renders the *nested* routes (e.g., /dashboard)
  return <Outlet />;
};

export default ProtectedRoute;

