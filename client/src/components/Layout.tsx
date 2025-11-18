import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';
import ProfileMenu from './ProfileMenu';

const Layout: React.FC = () => {
  const { user, logout, isSuperAdmin, isCompanyAdmin, isManager, isSessionAdmin, isEndUser, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Safety check: If user data is still loading or not available, show loading
  if (isLoading || !user || !user.profile) {
    return <LoadingSpinner />;
  }

  // Get page title based on current route
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/dashboard') return 'Dashboard';
    if (path.startsWith('/sessions')) return 'Sessions';
    if (path === '/scan') return 'Scan QR Code';
    if (path === '/my-attendance') return 'My Attendance';
    if (path === '/reports') return 'Attendance Report';
    if (path === '/manage-staff') return 'Manage Staff';
    if (path.startsWith('/manage-users')) return 'Manage Users';
    return 'Dashboard';
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (user?.profile?.firstName?.[0]) {
      return user.profile.firstName[0].toUpperCase();
    }
    return 'U';
  };

  // Get full user name
  const getUserName = () => {
    if (user?.profile?.firstName && user?.profile?.lastName) {
      return `${user.profile.firstName} ${user.profile.lastName}`;
    }
    return user?.profile?.firstName || 'User';
  };

  // Navigation link component with active state styling
  const NavLinkItem = ({ to, icon, children }: { to: string; icon: string; children: React.ReactNode }) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center py-2 px-6 text-sm font-medium border-l-4 transition-colors duration-200 ${
          isActive
            ? 'bg-primary/10 text-text-primary-light dark:text-text-primary-dark border-primary'
            : 'text-text-secondary-light dark:text-text-secondary-dark hover:bg-gray-50 dark:hover:bg-surface-dark/50 hover:text-text-primary-light dark:hover:text-text-primary-dark border-transparent'
        }`
      }
      onClick={() => setIsMobileMenuOpen(false)}
    >
      <span className="material-symbols-outlined mr-3 text-lg">{icon}</span>
      {children}
    </NavLink>
  );

  return (
    <div className="flex h-screen bg-background-light dark:bg-background-dark">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-surface-light dark:bg-surface-dark border-r border-border-light dark:border-border-dark shadow-sm overflow-y-auto">
        <div className="p-6 border-b border-border-light dark:border-border-dark flex items-center justify-center gap-2">
          <svg className="text-primary size-8" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <path clipRule="evenodd" d="M39.475 21.6262C40.358 21.4363 40.6863 21.5589 40.7581 21.5934C40.7876 21.655 40.8547 21.857 40.8082 22.3336C40.7408 23.0255 40.4502 24.0046 39.8572 25.2301C38.6799 27.6631 36.5085 30.6631 33.5858 33.5858C30.6631 36.5085 27.6632 38.6799 25.2301 39.8572C24.0046 40.4502 23.0255 40.7407 22.3336 40.8082C21.8571 40.8547 21.6551 40.7875 21.5934 40.7581C21.5589 40.6863 21.4363 40.358 21.6262 39.475C21.8562 38.4054 22.4689 36.9657 23.5038 35.2817C24.7575 33.2417 26.5497 30.9744 28.7621 28.762C30.9744 26.5497 33.2417 24.7574 35.2817 23.5037C36.9657 22.4689 38.4054 21.8562 39.475 21.6262ZM4.41189 29.2403L18.7597 43.5881C19.8813 44.7097 21.4027 44.9179 22.7217 44.7893C24.0585 44.659 25.5148 44.1631 26.9723 43.4579C29.9052 42.0387 33.2618 39.5667 36.4142 36.4142C39.5667 33.2618 42.0387 29.9052 43.4579 26.9723C44.1631 25.5148 44.659 24.0585 44.7893 22.7217C44.9179 21.4027 44.7097 19.8813 43.5881 18.7597L29.2403 4.41187C27.8527 3.02428 25.8765 3.02573 24.2861 3.36776C22.6081 3.72863 20.7334 4.58419 18.8396 5.74801C16.4978 7.18716 13.9881 9.18353 11.5858 11.5858C9.18354 13.988 7.18717 16.4978 5.74802 18.8396C4.58421 20.7334 3.72865 22.6081 3.36778 24.2861C3.02574 25.8765 3.02429 27.8527 4.41189 29.2403Z" fill="currentColor" fillRule="evenodd"></path>
          </svg>
          <h2 className="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">AttendMark</h2>
        </div>

        <nav className="flex-grow mt-6">
          <ul className="space-y-1">
            <li>
              <NavLinkItem to="/dashboard" icon="home">Dashboard</NavLinkItem>
            </li>

            {/* Sessions - visible only to Admins (not EndUsers) */}
            {!isEndUser && (
              <li>
                <NavLinkItem to="/sessions" icon="groups">Sessions</NavLinkItem>
              </li>
            )}

            {/* Create Session - for SuperAdmin, CompanyAdmin, Manager, and SessionAdmin */}
            {(isSuperAdmin || isCompanyAdmin || isManager || isSessionAdmin) && (
              <li>
                <NavLinkItem to="/sessions/create" icon="calendar_add_on">Create Session</NavLinkItem>
              </li>
            )}

            {/* My Sessions - visible only to EndUsers */}
            {isEndUser && (
              <li>
                <NavLinkItem to="/my-sessions" icon="checklist">My Sessions</NavLinkItem>
              </li>
            )}

            {/* Scan QR - visible to all authenticated users */}
            <li>
              <NavLinkItem to="/scan" icon="qr_code_scanner">Scan QR</NavLinkItem>
            </li>

            {/* My Attendance - visible to all authenticated users */}
            <li>
              <NavLinkItem to="/my-attendance" icon="checklist">My Attendance</NavLinkItem>
            </li>

            {/* Attendance Report - for Manager and SuperAdmin */}
            {(isSuperAdmin || isManager) && (
              <li>
                <NavLinkItem to="/reports" icon="summarize">Attendance Report</NavLinkItem>
              </li>
            )}

            {/* Manage Staff - only for SuperAdmin */}
            {isSuperAdmin && (
              <li>
                <NavLinkItem to="/manage-staff" icon="work">Manage Staff</NavLinkItem>
              </li>
            )}

            {/* Manage Users - only for SuperAdmin and CompanyAdmin */}
            {(isSuperAdmin || isCompanyAdmin) && (
              <li>
                <NavLinkItem to="/manage-users" icon="manage_accounts">Manage Users</NavLinkItem>
              </li>
            )}
          </ul>
        </nav>

        <div className="p-6 border-t border-border-light dark:border-border-dark">
          <div className="flex items-center space-x-3 mb-4">
            <div className="flex-shrink-0 size-10 rounded-full bg-primary flex items-center justify-center text-white text-lg font-bold">
              {getUserInitials()}
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary-light dark:text-text-primary-dark">{getUserName()}</p>
              <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">{user?.role || 'Guest'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center w-full py-2 px-4 text-sm font-medium text-red-600 border border-red-600 rounded hover:bg-red-50 dark:hover:bg-red-600/10 transition-colors duration-200 justify-center"
          >
            <span className="material-symbols-outlined mr-2 text-base">logout</span>
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-surface-light dark:bg-surface-dark border-r border-border-light dark:border-border-dark shadow-lg transform transition-transform duration-300 ease-in-out md:hidden ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 border-b border-border-light dark:border-border-dark flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="text-primary size-8" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path clipRule="evenodd" d="M39.475 21.6262C40.358 21.4363 40.6863 21.5589 40.7581 21.5934C40.7876 21.655 40.8547 21.857 40.8082 22.3336C40.7408 23.0255 40.4502 24.0046 39.8572 25.2301C38.6799 27.6631 36.5085 30.6631 33.5858 33.5858C30.6631 36.5085 27.6632 38.6799 25.2301 39.8572C24.0046 40.4502 23.0255 40.7407 22.3336 40.8082C21.8571 40.8547 21.6551 40.7875 21.5934 40.7581C21.5589 40.6863 21.4363 40.358 21.6262 39.475C21.8562 38.4054 22.4689 36.9657 23.5038 35.2817C24.7575 33.2417 26.5497 30.9744 28.7621 28.762C30.9744 26.5497 33.2417 24.7574 35.2817 23.5037C36.9657 22.4689 38.4054 21.8562 39.475 21.6262ZM4.41189 29.2403L18.7597 43.5881C19.8813 44.7097 21.4027 44.9179 22.7217 44.7893C24.0585 44.659 25.5148 44.1631 26.9723 43.4579C29.9052 42.0387 33.2618 39.5667 36.4142 36.4142C39.5667 33.2618 42.0387 29.9052 43.4579 26.9723C44.1631 25.5148 44.659 24.0585 44.7893 22.7217C44.9179 21.4027 44.7097 19.8813 43.5881 18.7597L29.2403 4.41187C27.8527 3.02428 25.8765 3.02573 24.2861 3.36776C22.6081 3.72863 20.7334 4.58419 18.8396 5.74801C16.4978 7.18716 13.9881 9.18353 11.5858 11.5858C9.18354 13.988 7.18717 16.4978 5.74802 18.8396C4.58421 20.7334 3.72865 22.6081 3.36778 24.2861C3.02574 25.8765 3.02429 27.8527 4.41189 29.2403Z" fill="currentColor" fillRule="evenodd"></path>
            </svg>
            <h2 className="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">AttendMark</h2>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="text-text-secondary-light dark:text-text-secondary-dark hover:text-text-primary-light dark:hover:text-text-primary-dark"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <nav className="flex-grow mt-6 overflow-y-auto">
          <ul className="space-y-1">
            <li>
              <NavLinkItem to="/dashboard" icon="home">Dashboard</NavLinkItem>
            </li>

            {!isEndUser && (
              <li>
                <NavLinkItem to="/sessions" icon="groups">Sessions</NavLinkItem>
              </li>
            )}

            {(isSuperAdmin || isCompanyAdmin || isManager || isSessionAdmin) && (
              <li>
                <NavLinkItem to="/sessions/create" icon="calendar_add_on">Create Session</NavLinkItem>
              </li>
            )}

            {isEndUser && (
              <li>
                <NavLinkItem to="/my-sessions" icon="checklist">My Sessions</NavLinkItem>
              </li>
            )}

            <li>
              <NavLinkItem to="/scan" icon="qr_code_scanner">Scan QR</NavLinkItem>
            </li>

            <li>
              <NavLinkItem to="/my-attendance" icon="checklist">My Attendance</NavLinkItem>
            </li>

            {(isSuperAdmin || isManager) && (
              <li>
                <NavLinkItem to="/reports" icon="summarize">Attendance Report</NavLinkItem>
              </li>
            )}

            {isSuperAdmin && (
              <li>
                <NavLinkItem to="/manage-staff" icon="work">Manage Staff</NavLinkItem>
              </li>
            )}

            {(isSuperAdmin || isCompanyAdmin) && (
              <li>
                <NavLinkItem to="/manage-users" icon="manage_accounts">Manage Users</NavLinkItem>
              </li>
            )}
          </ul>
        </nav>

        <div className="p-6 border-t border-border-light dark:border-border-dark">
          <div className="flex items-center space-x-3 mb-4">
            <div className="flex-shrink-0 size-10 rounded-full bg-primary flex items-center justify-center text-white text-lg font-bold">
              {getUserInitials()}
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary-light dark:text-text-primary-dark">{getUserName()}</p>
              <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">{user?.role || 'Guest'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center w-full py-2 px-4 text-sm font-medium text-red-600 border border-red-600 rounded hover:bg-red-50 dark:hover:bg-red-600/10 transition-colors duration-200 justify-center"
          >
            <span className="material-symbols-outlined mr-2 text-base">logout</span>
            Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        {/* Mobile Header */}
        <header className="md:hidden bg-surface-light dark:bg-surface-dark p-4 border-b border-border-light dark:border-border-dark flex items-center justify-between shadow-sm sticky top-0 z-40">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="text-text-primary-light dark:text-text-primary-dark"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
          <div className="flex items-center gap-2">
            <svg className="text-primary size-6" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path clipRule="evenodd" d="M39.475 21.6262C40.358 21.4363 40.6863 21.5589 40.7581 21.5934C40.7876 21.655 40.8547 21.857 40.8082 22.3336C40.7408 23.0255 40.4502 24.0046 39.8572 25.2301C38.6799 27.6631 36.5085 30.6631 33.5858 33.5858C30.6631 36.5085 27.6632 38.6799 25.2301 39.8572C24.0046 40.4502 23.0255 40.7407 22.3336 40.8082C21.8571 40.8547 21.6551 40.7875 21.5934 40.7581C21.5589 40.6863 21.4363 40.358 21.6262 39.475C21.8562 38.4054 22.4689 36.9657 23.5038 35.2817C24.7575 33.2417 26.5497 30.9744 28.7621 28.762C30.9744 26.5497 33.2417 24.7574 35.2817 23.5037C36.9657 22.4689 38.4054 21.8562 39.475 21.6262ZM4.41189 29.2403L18.7597 43.5881C19.8813 44.7097 21.4027 44.9179 22.7217 44.7893C24.0585 44.659 25.5148 44.1631 26.9723 43.4579C29.9052 42.0387 33.2618 39.5667 36.4142 36.4142C39.5667 33.2618 42.0387 29.9052 43.4579 26.9723C44.1631 25.5148 44.659 24.0585 44.7893 22.7217C44.9179 21.4027 44.7097 19.8813 43.5881 18.7597L29.2403 4.41187C27.8527 3.02428 25.8765 3.02573 24.2861 3.36776C22.6081 3.72863 20.7334 4.58419 18.8396 5.74801C16.4978 7.18716 13.9881 9.18353 11.5858 11.5858C9.18354 13.988 7.18717 16.4978 5.74802 18.8396C4.58421 20.7334 3.72865 22.6081 3.36778 24.2861C3.02574 25.8765 3.02429 27.8527 4.41189 29.2403Z" fill="currentColor" fillRule="evenodd"></path>
            </svg>
            <span className="text-lg font-bold text-text-primary-light dark:text-text-primary-dark">AttendMark</span>
          </div>
          <ProfileMenu
            userInitials={getUserInitials()}
            userName={getUserName()}
            userRole={user?.role || 'Guest'}
          />
        </header>

        {/* Top Header - Desktop */}
        <header className="hidden md:flex sticky top-0 bg-surface-light dark:bg-surface-dark p-4 border-b border-border-light dark:border-border-dark z-30 items-center justify-between shadow-sm">
          <h1 className="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">{getPageTitle()}</h1>
          <div className="flex items-center space-x-4">
            <ProfileMenu
              userInitials={getUserInitials()}
              userName={getUserName()}
              userRole={user?.role || 'Guest'}
            />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;

