import { Routes, Route, Link, useLocation } from 'react-router-dom';
import RegisterSuperAdmin from './pages/RegisterSuperAdmin';
import LoginPage from './pages/LoginPage';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Sessions from './pages/Sessions';
import CreateSession from './pages/CreateSession';
import SessionDetails from './pages/SessionDetails';
import ScanQR from './pages/ScanQR';
import MyAttendance from './pages/MyAttendance';
import AttendanceReport from './pages/AttendanceReport';
import ManageStaff from './pages/ManageStaff';
import ManageUsers from './pages/ManageUsers';
import EditSession from './pages/EditSession';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import Layout from './components/Layout';
import ForceResetPassword from './components/ForceResetPassword';
import { useAuth } from './contexts/AuthContext';

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
  const { user, isLoading } = useAuth();
  const showForceReset = !isLoading && user?.mustResetPassword === true;

  return (
    <div>
      {/* Force Password Reset Modal - Blocks entire app if mustResetPassword is true */}
      {showForceReset && <ForceResetPassword />}
      
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
        <Route 
          path="/forgot-password" 
          element={
            <PublicRoute>
              <ForgotPassword />
            </PublicRoute>
          } 
        />
        <Route 
          path="/reset-password/:collectionPrefix/:token" 
          element={
            <PublicRoute>
              <ResetPassword />
            </PublicRoute>
          } 
        />
        <Route path="/" element={<h2>Home Page - Welcome!</h2>} />
        
        {/* Protected Routes - Wrapped in ProtectedRoute and Layout */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            {/* Routes accessible to all authenticated users */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/sessions" element={<Sessions />} />
            <Route path="/sessions/:id" element={<SessionDetails />} />
            <Route path="/sessions/edit/:id" element={<EditSession />} />
            <Route path="/scan" element={<ScanQR />} />
            <Route path="/my-attendance" element={<MyAttendance />} />
          </Route>
        </Route>
        
        {/* Routes restricted to Manager and SuperAdmin */}
        <Route 
          element={<ProtectedRoute allowedRoles={['Manager', 'SuperAdmin']} />}
        >
          <Route element={<Layout />}>
            <Route path="/reports" element={<AttendanceReport />} />
          </Route>
        </Route>
        
        {/* Routes restricted to SuperAdmin, CompanyAdmin, Manager, and SessionAdmin */}
        <Route 
          element={<ProtectedRoute allowedRoles={['SuperAdmin', 'CompanyAdmin', 'Manager', 'SessionAdmin']} />}
        >
          <Route element={<Layout />}>
            <Route path="/sessions/create" element={<CreateSession />} />
          </Route>
        </Route>
        
        {/* Routes restricted to SuperAdmin only */}
        <Route 
          element={<ProtectedRoute allowedRoles={['SuperAdmin']} />}
        >
          <Route element={<Layout />}>
            <Route path="/manage-staff" element={<ManageStaff />} />
          </Route>
        </Route>
        
        {/* Routes restricted to SuperAdmin and CompanyAdmin */}
        <Route 
          element={<ProtectedRoute allowedRoles={['SuperAdmin', 'CompanyAdmin']} />}
        >
          <Route element={<Layout />}>
            <Route path="/manage-users" element={<ManageUsers />} />
          </Route>
        </Route>
      </Routes>
    </div>
  )
}

export default App


