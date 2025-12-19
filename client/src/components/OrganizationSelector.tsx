import React from 'react';
import api from '../api';

interface Organization {
  orgName: string;
  prefix: string;
  role: string;
  userId: string;
  organizationName: string;
}

interface OrganizationSelectorProps {
  organizations: Organization[];
  tempToken: string;
  onError: (error: string) => void;
}

const OrganizationSelector: React.FC<OrganizationSelectorProps> = ({
  organizations,
  tempToken,
  onError,
}) => {
  const [isLoading, setIsLoading] = React.useState<string | null>(null);

  const handleSelectOrganization = async (org: Organization) => {
    setIsLoading(org.prefix);
    try {
      const response = await api.post('/api/auth/select-organization', {
        tempToken,
        prefix: org.prefix,
      });

      const { token } = response.data;

      // Store token - AuthContext will handle user state update
      localStorage.setItem('token', token);
      
      // Navigate to dashboard - AuthContext will handle user state update
      window.location.href = '/dashboard';
    } catch (err: any) {
      setIsLoading(null);
      const errorMessage = err.response?.data?.msg || 'Failed to select organization. Please try again.';
      onError(errorMessage);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'SuperAdmin':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border-purple-300 dark:border-purple-800';
      case 'CompanyAdmin':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-800';
      case 'Manager':
        return 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-green-300 dark:border-green-800';
      case 'SessionAdmin':
        return 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-800';
      case 'EndUser':
        return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700';
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'SuperAdmin':
        return 'Super Admin';
      case 'CompanyAdmin':
        return 'Company Admin';
      case 'SessionAdmin':
        return 'Session Admin';
      default:
        return role;
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4">
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-2">
          Select Your Workspace
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          You have access to {organizations.length} organization{organizations.length !== 1 ? 's' : ''}. Choose one to continue.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {organizations.map((org) => (
          <div
            key={org.prefix}
            className="relative flex flex-col rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-lg hover:border-primary/50 transition-all duration-200 p-6 cursor-pointer group min-h-[180px] w-full md:min-w-[280px]"
            onClick={() => !isLoading && handleSelectOrganization(org)}
          >
            {/* Organization Name - Centered */}
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white line-clamp-2">
                {org.organizationName}
              </h3>
            </div>

            {/* Role Badge - Centered */}
            <div className="mb-4 flex justify-center">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getRoleBadgeColor(org.role)}`}
              >
                {getRoleDisplayName(org.role)}
              </span>
            </div>

            {/* Enter Button - Full width with whitespace-nowrap to prevent text cutoff */}
            <button
              type="button"
              disabled={isLoading !== null}
              onClick={(e) => {
                e.stopPropagation();
                handleSelectOrganization(org);
              }}
              className={`mt-auto w-full whitespace-nowrap flex items-center justify-center gap-2 rounded-lg h-10 px-4 bg-gradient-to-r from-orange-500 to-[#f04129] text-white text-sm font-bold hover:from-orange-600 hover:to-[#d63a25] transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                isLoading === org.prefix ? 'opacity-70' : ''
              }`}
            >
              {isLoading === org.prefix ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Entering...</span>
                </>
              ) : (
                <>
                  <span>Enter Workspace</span>
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrganizationSelector;

