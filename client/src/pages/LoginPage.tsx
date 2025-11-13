import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom'; // To redirect after login

const LoginPage: React.FC = () => {
  const [formData, setFormData] = useState({
    organizationName: '',
    email: '',
    password: '',
  });
  
  const [error, setError] = useState('');
  const { login } = useAuth(); // Get the login function from our context
  const navigate = useNavigate();

  const { organizationName, email, password } = formData;

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    
    try {
      // Call the login function from the context
      await login(formData);
      
      // On success, redirect to a dashboard (we'll create this next)
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
        setError('Login failed. Server may be down.');
      }
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
            type="text"
            name="organizationName"
            value={organizationName}
            onChange={onChange}
            required
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
          />
        </div>
        <button type="submit">Login</button>
      </form>
    </div>
  );
};

export default LoginPage;

