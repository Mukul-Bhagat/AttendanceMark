import { Routes, Route, Link } from 'react-router-dom';
import RegisterSuperAdmin from './pages/RegisterSuperAdmin';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

function App() {
  return (
    <div>
      <nav>
        <Link to="/register">Register Organization</Link>
        <Link to="/login">Login</Link>
      </nav>
      <Routes>
        {/* Public Routes */}
        <Route path="/register" element={<RegisterSuperAdmin />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<h2>Home Page - Welcome!</h2>} />
        
        {/* Protected Routes - Wrapped in ProtectedRoute and Layout */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            {/* Add more protected routes here in future steps */}
            {/* <Route path="/sessions" element={<Sessions />} /> */}
            {/* <Route path="/manage-users" element={<ManageUsers />} /> */}
          </Route>
        </Route>
      </Routes>
    </div>
  )
}

export default App

