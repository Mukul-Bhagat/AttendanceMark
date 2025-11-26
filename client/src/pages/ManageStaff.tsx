import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';

type StaffUser = {
  _id?: string;
  id?: string;
  email: string;
  role: 'SuperAdmin' | 'CompanyAdmin' | 'Manager' | 'SessionAdmin' | 'EndUser';
  profile: {
    firstName: string;
    lastName: string;
    phone?: string;
  };
};

const ManageStaff: React.FC = () => {
  const { isSuperAdmin } = useAuth();
  
  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'SessionAdmin' | 'Manager'>('SessionAdmin');

  const [showPassword, setShowPassword] = useState(false);

  // Page state
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingStaff, setDeletingStaff] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All Roles');

  // Fetch existing staff
  const fetchStaff = async () => {
    try {
      setIsLoading(true);
      setError(''); // Clear any previous errors
      const { data } = await api.get('/api/users/my-organization');
      // Filter for staff roles (Manager and SessionAdmin)
      const staff = data.filter(
        (user: StaffUser) => user.role === 'SessionAdmin' || user.role === 'Manager'
      );
      setStaffList(staff);
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('You are not authorized. Please log in again.');
      } else {
        setError('Could not fetch staff list. Please try again.');
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch on component mount
  useEffect(() => {
    fetchStaff();
  }, []);

  // Auto-dismiss success message after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const clearForm = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPassword('');
    setPhone('');
    setRole('SessionAdmin');
    setMessage('');
    setError('');
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsSubmitting(true);

    const staffData = {
      firstName,
      lastName,
      email,
      password,
      phone: phone || undefined,
      role,
    };

    try {
      // Use the API endpoint from Step 11
      const { data } = await api.post('/api/users/staff', staffData);
      
      setMessage(data.msg || `${role} created successfully`);
      clearForm();
      // Refresh the list immediately
      await fetchStaff();
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError('You do not have permission to create staff members.');
      } else if (err.response?.data?.errors) {
        const errorMessages = err.response.data.errors.map((e: any) => e.msg).join(', ');
        setError(errorMessages);
      } else {
        setError(err.response?.data?.msg || 'Failed to create staff member. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle staff deletion (SuperAdmin only)
  const handleDeleteStaff = async (staffId: string, staffName: string) => {
    if (!window.confirm(`Are you sure you want to delete ${staffName}? This action cannot be undone.`)) {
      return;
    }

    setDeletingStaff(staffId);
    setError('');
    setMessage('');

    try {
      const { data } = await api.delete(`/api/users/${staffId}`);
      
      setMessage(data.msg || 'Staff member deleted successfully');
      // Refresh the list
      await fetchStaff();
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError('You do not have permission to delete staff members.');
      } else {
        setError(err.response?.data?.msg || 'Failed to delete staff member. Please try again.');
      }
    } finally {
      setDeletingStaff(null);
    }
  };

  // Filter staff based on search term and role
  const filteredStaff = staffList.filter((staff) => {
    const staffName = `${staff.profile.firstName} ${staff.profile.lastName}`.toLowerCase();
    const staffEmail = staff.email.toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    
    // Search filter: check if name or email includes search term
    const matchesSearch = !searchTerm || 
      staffName.includes(searchLower) || 
      staffEmail.includes(searchLower);
    
    // Role filter: check if role matches
    // Map dropdown values to actual role values
    const roleMap: { [key: string]: string } = {
      'All Roles': 'All',
      'Session Admin': 'SessionAdmin',
      'Manager': 'Manager'
    };
    const mappedRole = roleMap[roleFilter] || roleFilter;
    const matchesRole = mappedRole === 'All' || staff.role === mappedRole;
    
    return matchesSearch && matchesRole;
  });

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col group/design-root overflow-x-hidden">
      <div className="layout-container flex h-full grow flex-col">
        <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-7xl mx-auto">
          <div className="flex flex-wrap justify-between gap-3 p-4">
            <p className="text-[#181511] dark:text-white text-4xl font-black leading-tight tracking-[-0.033em] min-w-72">Manage Staff</p>
          </div>

          {/* Success Message */}
          {message && (
            <div className="px-4 py-3">
              <div className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800 p-4 rounded-xl flex items-center">
                <span className="material-symbols-outlined mr-2">check_circle</span>
                {message}
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="px-4 py-3">
              <div className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800 p-4 rounded-xl flex items-center">
                <span className="material-symbols-outlined mr-2">cancel</span>
                {error}
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center">
                <svg className="animate-spin h-8 w-8 text-[#f04129] mb-4" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"></path>
                </svg>
                <p className="text-[#8a7b60] dark:text-gray-400">Loading staff list...</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-4">
              {/* Create Staff Form */}
              <div className="lg:col-span-1 bg-white dark:bg-slate-800 dark:border dark:border-slate-700 rounded-xl shadow-sm p-6 sm:p-8 lg:sticky lg:top-8 lg:self-start">
                <h2 className="text-[#181511] dark:text-white text-[22px] font-bold leading-tight tracking-[-0.015em] pb-5 flex items-center">
                  <span className="material-symbols-outlined mr-3 text-[#f04129]" style={{ fontSize: '28px' }}>manage_accounts</span>
                  Add Staff Member
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="flex flex-col min-w-40 flex-1">
                      <p className="text-[#181511] dark:text-gray-200 text-base font-medium leading-normal pb-2">First Name</p>
                      <input
                        className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#181511] dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary border border-[#e6e2db] dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-primary/50 dark:focus:border-primary/50 h-14 placeholder:text-[#8a7b60] dark:placeholder-gray-400 p-[15px] text-base font-normal leading-normal"
                        placeholder="Suresh"
                        type="text"
                        value={firstName}
                        onChange={(e) => {
                          setFirstName(e.target.value);
                          if (error) setError('');
                        }}
                        required
                        disabled={isSubmitting}
                      />
                    </label>
                    <label className="flex flex-col min-w-40 flex-1">
                      <p className="text-[#181511] dark:text-gray-200 text-base font-medium leading-normal pb-2">Last Name</p>
                      <input
                        className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#181511] dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary border border-[#e6e2db] dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-primary/50 dark:focus:border-primary/50 h-14 placeholder:text-[#8a7b60] dark:placeholder-gray-400 p-[15px] text-base font-normal leading-normal"
                        placeholder="Patil"
                        type="text"
                        value={lastName}
                        onChange={(e) => {
                          setLastName(e.target.value);
                          if (error) setError('');
                        }}
                        required
                        disabled={isSubmitting}
                      />
                    </label>
                  </div>

                  <label className="flex flex-col w-full">
                    <p className="text-[#181511] dark:text-gray-200 text-base font-medium leading-normal pb-2">Email</p>
                    <input
                      className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#181511] dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary border border-[#e6e2db] dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-primary/50 dark:focus:border-primary/50 h-14 placeholder:text-[#8a7b60] dark:placeholder-gray-400 p-[15px] text-base font-normal leading-normal"
                      placeholder="suresh.patil@example.com"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (error) setError('');
                      }}
                      required
                      disabled={isSubmitting}
                    />
                  </label>

                  <label className="flex flex-col w-full">
                    <p className="text-[#181511] dark:text-gray-200 text-base font-medium leading-normal pb-2">Password</p>
                    <div className="relative">
                      <input
                        className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#181511] dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary border border-[#e6e2db] dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-primary/50 dark:focus:border-primary/50 h-14 placeholder:text-[#8a7b60] dark:placeholder-gray-400 p-[15px] pr-12 text-base font-normal leading-normal"
                        placeholder="Enter password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (error) setError('');
                        }}
                        minLength={6}
                        required
                        disabled={isSubmitting}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-4 text-[#8a7b60] dark:text-gray-400 hover:text-[#f04129] z-10 cursor-pointer"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                          {showPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Min 6 chars</p>
                  </label>

                  <label className="flex flex-col w-full">
                    <p className="text-[#181511] dark:text-gray-200 text-base font-medium leading-normal pb-2">Phone (Optional)</p>
                    <input
                      className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#181511] dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary border border-[#e6e2db] dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-primary/50 dark:focus:border-primary/50 h-14 placeholder:text-[#8a7b60] dark:placeholder-gray-400 p-[15px] text-base font-normal leading-normal"
                      placeholder="+91 98765 12345"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </label>

                  <div className="flex flex-col w-full">
                    <p className="text-[#181511] dark:text-gray-200 text-base font-medium leading-normal pb-2">Role</p>
                    <div className="relative">
                      <select
                        className="form-select flex w-full appearance-none min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#181511] dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary border border-[#e6e2db] dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-primary/50 dark:focus:border-primary/50 h-14 p-[15px] text-base font-normal leading-normal"
                        value={role}
                        onChange={(e) => setRole(e.target.value as 'SessionAdmin' | 'Manager')}
                        required
                        disabled={isSubmitting}
                      >
                        <option value="SessionAdmin">Session Admin</option>
                        <option value="Manager">Manager</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">expand_more</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Can manage assigned classes/batches.</p>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#f04129] px-6 py-4 text-base font-semibold leading-6 text-white shadow-sm hover:bg-[#d63a25] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined">person_add</span>
                    {isSubmitting ? 'Creating...' : 'Create Staff Member'}
                  </button>
                  <button
                    type="button"
                    onClick={clearForm}
                    disabled={isSubmitting}
                    className="w-full text-center text-gray-500 dark:text-gray-400 mt-2 hover:text-gray-900 dark:hover:text-white transition-colors duration-200 text-sm font-medium py-2 disabled:opacity-50"
                  >
                    Clear Form
                  </button>
                </form>
              </div>

              {/* Staff Table */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-800 dark:border dark:border-slate-700 rounded-xl shadow-sm p-6 sm:p-8">
                <div className="flex items-center justify-between pb-5">
                  <h2 className="text-[#181511] dark:text-white text-[22px] font-bold leading-tight tracking-[-0.015em] flex items-center">
                    Current Staff
                    <span className="ml-3 px-3 py-1 bg-red-100 text-[#f04129] dark:bg-[#f04129]/20 dark:text-[#f04129] rounded-full text-sm font-semibold">
                      {staffList.length}
                    </span>
                  </h2>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 mb-5">
                  <div className="relative flex-grow">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                    <input
                      className="form-input w-full rounded-lg text-sm text-[#181511] dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary border border-[#e6e2db] dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-primary/50 dark:focus:border-primary/50 h-12 placeholder:text-[#8a7b60] dark:placeholder-gray-400 pl-10 pr-4"
                      placeholder="Search by name or email..."
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="relative min-w-[180px]">
                    <select 
                      className="form-select w-full appearance-none rounded-lg text-sm text-[#181511] dark:text-white focus:outline-0 focus:ring-2 focus:ring-[#f04129] border border-[#e6e2db] dark:border-slate-600 bg-white dark:bg-slate-800 focus:border-primary/50 dark:focus:border-primary/50 h-12 px-4"
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                    >
                      <option value="All Roles">All Roles</option>
                      <option value="Session Admin">Session Admin</option>
                      <option value="Manager">Manager</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">expand_more</span>
                  </div>
                </div>

                {staffList.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-[#8a7b60] dark:text-gray-400 text-base mb-2">No staff members found.</p>
                    <p className="text-[#8a7b60] dark:text-gray-400 text-sm">Create your first staff member using the form above.</p>
                  </div>
                ) : filteredStaff.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-[#8a7b60] dark:text-gray-400 text-base mb-2">No matching records found.</p>
                    <p className="text-[#8a7b60] dark:text-gray-400 text-sm">Try adjusting your search or filter criteria.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-white/5">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider" scope="col">Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider" scope="col">Email</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider" scope="col">Role</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider" scope="col">Phone</th>
                          {isSuperAdmin && (
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider" scope="col">Actions</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredStaff.map((staff) => {
                          const staffId = staff._id || staff.id || '';
                          const roleDisplay = staff.role === 'SessionAdmin' ? 'Session Admin' : staff.role;
                          const isDeleting = deletingStaff === staffId;
                          const staffName = `${staff.profile.firstName} ${staff.profile.lastName}`;
                          
                          return (
                            <tr key={staffId} className="hover:bg-red-50 dark:hover:bg-[#f04129]/10 transition-colors duration-150">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                {staffName}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                {staff.email}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                {staff.role === 'SessionAdmin' ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs leading-5 font-semibold rounded-full border bg-red-100 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-800">
                                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>shield_person</span>
                                    {roleDisplay}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs leading-5 font-semibold rounded-full border bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-800">
                                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>supervisor_account</span>
                                    {roleDisplay}
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                {staff.profile.phone || 'N/A'}
                              </td>
                              {isSuperAdmin && (
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  <button
                                    onClick={() => handleDeleteStaff(staffId, staffName)}
                                    disabled={isDeleting}
                                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Delete staff member"
                                  >
                                    {isDeleting ? (
                                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"></path>
                                      </svg>
                                    ) : (
                                      <span className="material-symbols-outlined text-xl">delete</span>
                                    )}
                                  </button>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManageStaff;

