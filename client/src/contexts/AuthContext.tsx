import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import axios from 'axios';

// Define the shape of the user object and the auth context
interface IUser {
  id: string;
  email: string;
  role: string;
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
}

// Create the context
const AuthContext = createContext<IAuthContext | undefined>(undefined);

// Define the provider component
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<IUser | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(false); // We can use this later

  // On initial load, try to load user from token
  useEffect(() => {
    if (token) {
      // In a real app, you'd verify the token with a '/api/auth/me' endpoint
      // For now, we'll just set the token and (later) the user
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // We'll add a "get me" function in a future step
    }
  }, [token]);

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

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
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

