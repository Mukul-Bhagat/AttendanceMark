import React, { useState } from 'react';
import axios from 'axios';

// This is the component for our /register route
const RegisterSuperAdmin: React.FC = () => {
  const [formData, setFormData] = useState({
    organizationName: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
  });

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const { organizationName, firstName, lastName, email, password, phone } = formData;

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage('');
    setError('');

    try {
      // This is the API endpoint from Step 1
      const response = await axios.post(
        'http://localhost:5001/api/auth/register-super-admin',
        formData
      );

      setMessage(response.data.msg); // Show success message
      setFormData({ // Clear the form
        organizationName: '',
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        phone: '',
      });
    } catch (err: any) {
      // Handle errors
      if (err.response && err.response.data) {
        // Handle express-validator errors (array format)
        if (err.response.data.errors && Array.isArray(err.response.data.errors)) {
          const errorMessages = err.response.data.errors.map((e: any) => e.msg).join(', ');
          setError(errorMessages);
        } else {
          // Handle custom error messages (string format)
          setError(err.response.data.msg || 'Registration failed');
        }
      } else {
        setError('Registration failed. Server may be down.');
      }
    }
  };

  return (
    <div className="form-container">
      <h1>Register New Organization & Super Admin</h1>
      {message && <p className="success-message">{message}</p>}
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
          <label>Your First Name *</label>
          <input
            type="text"
            name="firstName"
            value={firstName}
            onChange={onChange}
            required
          />
        </div>
        <div className="form-group">
          <label>Your Last Name *</label>
          <input
            type="text"
            name="lastName"
            value={lastName}
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
            minLength={6}
            required
          />
        </div>
        <div className="form-group">
          <label>Your Phone (Optional)</label>
          <input
            type="text"
            name="phone"
            value={phone}
            onChange={onChange}
          />
        </div>
        <button type="submit">Register</button>
      </form>
    </div>
  );
};

export default RegisterSuperAdmin;

