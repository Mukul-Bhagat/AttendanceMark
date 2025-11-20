import React, { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';
import ProfileMenu from './ProfileMenu';

const Layout: React.FC = () => {
  const { user, isSuperAdmin, isCompanyAdmin, isManager, isSessionAdmin, isLoading } = useAuth();
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
    if (path.startsWith('/classes')) return 'Classes/Batches';
    if (path.startsWith('/sessions')) return 'Sessions';
    if (path === '/scan') return 'Scan QR Code';
    if (path === '/my-attendance') return 'My Attendance';
    if (path === '/reports') return 'Attendance Report';
    if (path === '/manage-staff') return 'Manage Staff';
    if (path.startsWith('/manage-users')) return 'Manage Users';
    return 'Dashboard';
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
  const NavLinkItem = ({ to, icon, children, end }: { to: string; icon: string; children: React.ReactNode; end?: boolean }) => (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center py-2 px-6 text-sm font-medium border-l-4 transition-colors duration-200 ${
          isActive
            ? 'bg-red-50 dark:bg-[#f04129]/10 text-[#f04129] dark:text-[#f04129] border-[#f04129] [&_.material-symbols-outlined]:text-[#f04129]'
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
      <aside className="hidden md:flex flex-col h-screen w-64 bg-surface-light dark:bg-surface-dark border-r border-border-light dark:border-border-dark shadow-sm overflow-y-auto">
        {/* Logo Header */}
        <div className="p-6 border-b border-border-light dark:border-border-dark flex items-center justify-center">
          <img 
            src="/assets/attendmarklogo.png" 
            alt="AttendMark Logo" 
            className="block dark:hidden"
            style={{ 
              width: '140px', 
              height: 'auto',
              objectFit: 'contain'
            }}
          />
          <img 
            src="/assets/atendmarkwhitelogo.png" 
            alt="AttendMark Logo" 
            className="hidden dark:block"
            style={{ 
              width: '140px', 
              height: 'auto',
              objectFit: 'contain'
            }}
          />
        </div>

        {/* Navigation Links - Takes available space */}
        <nav className="flex-1 mt-6 overflow-y-auto">
          <ul className="space-y-1">
            <li>
              <NavLinkItem to="/dashboard" icon="home">Dashboard</NavLinkItem>
            </li>

            {/* Classes/Batches - visible to all authenticated users (including EndUsers) */}
            <li>
              <NavLinkItem to="/classes" icon="groups" end={true}>Classes/Batches</NavLinkItem>
            </li>

            {/* Create Class/Batch - for SuperAdmin, CompanyAdmin, Manager, and SessionAdmin */}
            {(isSuperAdmin || isCompanyAdmin || isManager || isSessionAdmin) && (
              <li>
                <NavLinkItem to="/classes/create" icon="calendar_add_on">Create Class/Batch</NavLinkItem>
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

        {/* Bottom Section: User Card + Footer */}
        <div className="mt-auto border-t border-border-light dark:border-border-dark">
          {/* User Profile Card */}
          <div className="p-6">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0 size-10 rounded-full bg-[#fef2f2] border border-[#f04129] flex items-center justify-center text-[#991b1b] text-lg font-bold">
                {getUserInitials()}
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary-light dark:text-text-primary-dark">{getUserName()}</p>
                <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">{user?.role || 'Guest'}</p>
              </div>
            </div>
          </div>
          
          {/* Powered By AI ALLY Logo - Close to User Card */}
          <div className="px-6 pb-6">
            <a 
              href="https://aially.in" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            >
              <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark font-medium">Powered By</p>
              <img 
                src="/assets/image01.png" 
                alt="AI ALLY Logo" 
                className="block dark:hidden"
                style={{ 
                  height: '20px', 
                  width: 'auto',
                  objectFit: 'contain'
                }}
              />
              <img 
                src="/assets/aiallywhite.png" 
                alt="AI ALLY Logo" 
                className="hidden dark:block"
                style={{ 
                  height: '20px', 
                  width: 'auto',
                  objectFit: 'contain'
                }}
              />
            </a>
          </div>
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
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-surface-light dark:bg-surface-dark border-r border-border-light dark:border-border-dark shadow-lg transform transition-transform duration-300 ease-in-out md:hidden flex flex-col h-screen ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 border-b border-border-light dark:border-border-dark flex items-center justify-between">
          <div className="flex items-center justify-center flex-1">
            <img 
              src="/assets/attendmarklogo.png" 
              alt="AttendMark Logo" 
              className="block dark:hidden"
              style={{ 
                width: '140px', 
                height: 'auto',
                objectFit: 'contain'
              }}
            />
            <img 
              src="/assets/atendmarkwhitelogo.png" 
              alt="AttendMark Logo" 
              className="hidden dark:block"
              style={{ 
                width: '140px', 
                height: 'auto',
                objectFit: 'contain'
              }}
            />
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="text-text-secondary-light dark:text-text-secondary-dark hover:text-text-primary-light dark:hover:text-text-primary-dark"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Navigation Links - Takes available space */}
        <nav className="flex-1 mt-6 overflow-y-auto">
          <ul className="space-y-1">
            <li>
              <NavLinkItem to="/dashboard" icon="home">Dashboard</NavLinkItem>
            </li>

            {/* Classes/Batches - visible to all authenticated users (including EndUsers) */}
            <li>
              <NavLinkItem to="/classes" icon="groups" end={true}>Classes/Batches</NavLinkItem>
            </li>

            {/* Create Class/Batch - for SuperAdmin, CompanyAdmin, Manager, and SessionAdmin */}
            {(isSuperAdmin || isCompanyAdmin || isManager || isSessionAdmin) && (
              <li>
                <NavLinkItem to="/classes/create" icon="calendar_add_on">Create Class/Batch</NavLinkItem>
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

        {/* Bottom Section: User Card + Footer */}
        <div className="mt-auto border-t border-border-light dark:border-border-dark">
          {/* User Profile Card */}
          <div className="p-6">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0 size-10 rounded-full bg-[#fef2f2] border border-[#f04129] flex items-center justify-center text-[#991b1b] text-lg font-bold">
                {getUserInitials()}
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary-light dark:text-text-primary-dark">{getUserName()}</p>
                <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">{user?.role || 'Guest'}</p>
              </div>
            </div>
          </div>
          
          {/* Powered By AI ALLY Logo - Close to User Card */}
          <div className="px-6 pb-6">
            <a 
              href="https://aially.in" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            >
              <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark font-medium">Powered By</p>
              <img 
                src="/assets/image01.png" 
                alt="AI ALLY Logo" 
                className="block dark:hidden"
                style={{ 
                  height: '20px', 
                  width: 'auto',
                  objectFit: 'contain'
                }}
              />
              <img 
                src="/assets/aiallywhite.png" 
                alt="AI ALLY Logo" 
                className="hidden dark:block"
                style={{ 
                  height: '20px', 
                  width: 'auto',
                  objectFit: 'contain'
                }}
              />
            </a>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        {/* Mobile Header */}
        <header className="md:hidden bg-surface-light dark:bg-surface-dark px-4 py-3 border-b border-border-light dark:border-border-dark flex items-center justify-between shadow-sm sticky top-0 z-40 relative">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="text-text-primary-light dark:text-text-primary-dark flex items-center justify-center flex-shrink-0"
          >
            <span className="material-symbols-outlined text-2xl">menu</span>
          </button>
          {/* Logo - Absolutely Centered */}
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
            <img 
              src="/assets/attendmarklogo.png" 
              alt="AttendMark Logo" 
              className="h-10 w-auto object-contain block dark:hidden"
            />
            <img 
              src="/assets/atendmarkwhitelogo.png" 
              alt="AttendMark Logo" 
              className="h-10 w-auto object-contain hidden dark:block"
            />
          </div>
          <div className="flex-shrink-0">
            <ProfileMenu
              userInitials={getUserInitials()}
              userName={getUserName()}
              userRole={user?.role || 'Guest'}
            />
          </div>
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

