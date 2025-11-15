import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import axios from 'axios';

// Define the shape of the user object and the auth context
export interface IUser {
  id: string;
  email: string;
  role: 'SuperAdmin' | 'CompanyAdmin' | 'Manager' | 'SessionAdmin' | 'EndUser';
  profile: {
    firstName: string;
    lastName: string;
    phone?: string;
  };
  mustResetPassword: boolean;
}

interface IAuthContext {
  user: IUser | null;
  token: string | null;
  isLoading: boolean;
  login: (formData: any) => Promise<void>;
  logout: () => void;
  refetchUser: () => Promise<void>;
  // Role helper booleans
  isSuperAdmin: boolean;
  isCompanyAdmin: boolean;
  isManager: boolean;
  isSessionAdmin: boolean;
  isEndUser: boolean;
}

// Create the context
const AuthContext = createContext<IAuthContext | undefined>(undefined);

// Define the provider component
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<IUser | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true); // Start as true to check token on mount

  // Derived role states - helper booleans for easy role checking
  const isSuperAdmin = user?.role === 'SuperAdmin';
  const isCompanyAdmin = user?.role === 'CompanyAdmin';
  const isManager = user?.role === 'Manager';
  const isSessionAdmin = user?.role === 'SessionAdmin';
  const isEndUser = user?.role === 'EndUser';

  // On initial load, try to load user from token
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      
      if (storedToken) {
        // Set token for axios requests
        axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        
        try {
          // Verify the token and fetch user data from the backend
          const response = await axios.get('http://localhost:5001/api/auth/me');
          const { user } = response.data;
          
          // Update state with fetched user data
          setUser(user);
          setToken(storedToken);
        } catch (err: any) {
          // Token is invalid or expired, clear it
          console.error('Failed to verify token:', err);
          localStorage.removeItem('token');
          delete axios.defaults.headers.common['Authorization'];
          setToken(null);
          setUser(null);
        }
      }
      
      setIsLoading(false);
    };

    initAuth();
  }, []);

  // Login function
  const login = async (formData: any) => {
    setIsLoading(true);
    // This hits the API endpoint from Step 2
    const response = await axios.post(
      'http://localhost:5001/api/auth/login',
      formData
    );
    
    // Get token and user from response
    const { token, user } = response.data;
    // Save to state and localStorage
    setToken(token);
    setUser(user);
    localStorage.setItem('token', token);
    
    // Set token for all future axios requests
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    setIsLoading(false);
  };

  // Logout function
  const logout = () => {
    // Clear everything
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
  };

  // Refetch user data from the backend
  const refetchUser = async () => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      return;
    }

    try {
      const response = await axios.get('http://localhost:5001/api/auth/me');
      const { user } = response.data;
      setUser(user);
    } catch (err: any) {
      console.error('Failed to refetch user:', err);
      // If token is invalid, logout
      logout();
    }
  };

  const value = {
    user,
    token,
    isLoading,
    login,
    logout,
    refetchUser,
    isSuperAdmin,
    isCompanyAdmin,
    isManager,
    isSessionAdmin,
    isEndUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
};

// Custom hook to easily use the context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

