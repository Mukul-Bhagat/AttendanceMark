import { Routes, Route, Link, useLocation } from 'react-router-dom';
import RegisterSuperAdmin from './pages/RegisterSuperAdmin';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import Sessions from './pages/Sessions';
import CreateSession from './pages/CreateSession';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import Layout from './components/Layout';

// Component to conditionally show navigation only on public routes
const PublicNav = () => {
  const location = useLocation();
  const isProtectedRoute = location.pathname.startsWith('/dashboard') || 
                          location.pathname.startsWith('/sessions') || 
                          location.pathname.startsWith('/manage-users');
  
  if (isProtectedRoute) {
    return null;
  }
  
  return (
    <nav>
      <Link to="/register">Register Organization</Link>
      <Link to="/login">Login</Link>
    </nav>
  );
};

function App() {
  return (
    <div>
      <PublicNav />
      <Routes>
        {/* Public Routes - Redirect to dashboard if already logged in */}
        <Route 
          path="/register" 
          element={
            <PublicRoute>
              <RegisterSuperAdmin />
            </PublicRoute>
          } 
        />
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          } 
        />
        <Route path="/" element={<h2>Home Page - Welcome!</h2>} />
        
        {/* Protected Routes - Wrapped in ProtectedRoute and Layout */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/sessions" element={<Sessions />} />
            <Route path="/sessions/create" element={<CreateSession />} />
            {/* <Route path="/manage-users" element={<ManageUsers />} /> */}
          </Route>
        </Route>
      </Routes>
    </div>
  )
}

export default App

