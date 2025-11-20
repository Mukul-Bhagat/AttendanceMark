import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';

type EndUser = {
  _id?: string;
  id?: string;
  email: string;
  role: 'SuperAdmin' | 'CompanyAdmin' | 'Manager' | 'SessionAdmin' | 'EndUser';
  profile: {
    firstName: string;
    lastName: string;
    phone?: string;
  };
  registeredDeviceId?: string;
};

const ManageUsers: React.FC = () => {
  const { isSuperAdmin } = useAuth();
  
  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');

  // Page state
  const [usersList, setUsersList] = useState<EndUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resettingDevice, setResettingDevice] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');

  // Fetch existing EndUsers
  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      setError('');
      const { data } = await api.get('/api/users/my-organization');
      // Filter for EndUser role only
      const endUsers = data.filter((user: EndUser) => user.role === 'EndUser');
      setUsersList(endUsers);
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('You are not authorized. Please log in again.');
      } else {
        setError('Could not fetch users list. Please try again.');
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch on component mount
  useEffect(() => {
    fetchUsers();
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
    setMessage('');
    setError('');
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsSubmitting(true);

    const userData = {
      firstName,
      lastName,
      email,
      password,
      phone: phone || undefined,
    };

    try {
      const { data } = await api.post('/api/users/end-user', userData);
      
      setMessage(data.msg || 'EndUser created successfully');
      clearForm();
      // Refresh the list immediately
      await fetchUsers();
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError('You do not have permission to create users.');
      } else if (err.response?.data?.errors) {
        const errorMessages = err.response.data.errors.map((e: any) => e.msg).join(', ');
        setError(errorMessages);
      } else {
        setError(err.response?.data?.msg || 'Failed to create user. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle device reset
  const handleResetDevice = async (userId: string) => {
    if (!window.confirm('Are you sure you want to reset this user\'s device? They will need to register a new device on their next scan.')) {
      return;
    }

    setResettingDevice(userId);
    setError('');
    setMessage('');

    try {
      const { data } = await api.put(`/api/users/${userId}/reset-device`);
      
      setMessage(data.msg || 'Device reset successfully');
      // Refresh the list to show updated device status
      await fetchUsers();
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError('You do not have permission to reset devices.');
      } else {
        setError(err.response?.data?.msg || 'Failed to reset device. Please try again.');
      }
    } finally {
      setResettingDevice(null);
    }
  };

  // Handle user deletion (SuperAdmin only)
  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!window.confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) {
      return;
    }

    setDeletingUser(userId);
    setError('');
    setMessage('');

    try {
      const { data } = await api.delete(`/api/users/${userId}`);
      
      setMessage(data.msg || 'User deleted successfully');
      // Refresh the list
      await fetchUsers();
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError('You do not have permission to delete users.');
      } else {
        setError(err.response?.data?.msg || 'Failed to delete user. Please try again.');
      }
    } finally {
      setDeletingUser(null);
    }
  };

  // Filter users based on search term and status
  const filteredUsers = usersList.filter((user) => {
    const userName = `${user.profile.firstName} ${user.profile.lastName}`.toLowerCase();
    const userEmail = user.email.toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    
    // Search filter: check if name or email includes search term
    const matchesSearch = !searchTerm || 
      userName.includes(searchLower) || 
      userEmail.includes(searchLower);
    
    // Status filter: check if device is locked/unlocked
    const isDeviceLocked = !!user.registeredDeviceId;
    const matchesStatus = statusFilter === 'All Status' || 
      (statusFilter === 'Locked' && isDeviceLocked) ||
      (statusFilter === 'Unlocked' && !isDeviceLocked);
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col group/design-root">
      <div className="layout-container flex h-full grow flex-col">
        <div className="px-4 sm:px-6 lg:px-8 py-8 lg:py-12 flex flex-1 justify-center">
          <div className="layout-content-container flex flex-col w-full max-w-7xl flex-1">
            <div className="flex min-w-72 flex-col gap-3 mb-8">
              <p className="text-[#181511] dark:text-white text-3xl sm:text-4xl font-black leading-tight tracking-[-0.033em]">Manage Users</p>
              <p className="text-[#8a7b60] dark:text-gray-400 text-base font-normal leading-normal">Create, view, and manage user accounts and device status.</p>
            </div>

            {/* Success Message */}
            {message && (
              <div className="mb-6 bg-green-500/10 text-green-700 dark:text-green-300 border border-green-500/20 p-4 rounded-xl flex items-center">
                <span className="material-symbols-outlined mr-2">check_circle</span>
                {message}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-6 bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20 p-4 rounded-xl flex items-center">
                <span className="material-symbols-outlined mr-2">error</span>
                {error}
              </div>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center">
                  <svg className="animate-spin h-8 w-8 text-[#f04129] mb-4" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"></path>
                  </svg>
                  <p className="text-[#8a7b60] dark:text-gray-400">Loading users list...</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Create User Form */}
                <div className="lg:col-span-1 lg:sticky lg:top-8 lg:self-start">
                  <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-[#e6e2db] dark:border-slate-700 p-6 sm:p-8">
                    <h2 className="text-[#181511] dark:text-white text-xl font-bold leading-tight tracking-[-0.015em] mb-5 flex items-center">
                      <span className="material-symbols-outlined text-[#f04129] mr-2">person_add</span>
                      Add New User
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <label className="flex flex-col flex-1">
                          <p className="text-[#181511] dark:text-gray-200 text-sm font-medium leading-normal pb-2">First Name</p>
                          <input
                            className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#181511] dark:text-white focus:outline-none focus:ring-2 focus:ring-primary border border-[#e6e2db] dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-primary/50 dark:focus:border-primary/50 h-12 p-3 text-base font-normal leading-normal placeholder:text-[#8a7b60] dark:placeholder-gray-400"
                            placeholder="Ramesh"
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
                        <label className="flex flex-col flex-1">
                          <p className="text-[#181511] dark:text-gray-200 text-sm font-medium leading-normal pb-2">Last Name</p>
                          <input
                            className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#181511] dark:text-white focus:outline-none focus:ring-2 focus:ring-primary border border-[#e6e2db] dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-primary/50 dark:focus:border-primary/50 h-12 p-3 text-base font-normal leading-normal placeholder:text-[#8a7b60] dark:placeholder-gray-400"
                            placeholder="Deo"
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

                      <label className="flex flex-col flex-1">
                        <p className="text-[#181511] dark:text-gray-200 text-sm font-medium leading-normal pb-2">Email</p>
                        <input
                          className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#181511] dark:text-white focus:outline-none focus:ring-2 focus:ring-primary border border-[#e6e2db] dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-primary/50 dark:focus:border-primary/50 h-12 p-3 text-base font-normal leading-normal placeholder:text-[#8a7b60] dark:placeholder-gray-400"
                          placeholder="ramesh.deo@example.com"
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

                      <label className="flex flex-col flex-1">
                        <p className="text-[#181511] dark:text-gray-200 text-sm font-medium leading-normal pb-2">Temporary Password</p>
                        <input
                          className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#181511] dark:text-white focus:outline-none focus:ring-2 focus:ring-primary border border-[#e6e2db] dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-primary/50 dark:focus:border-primary/50 h-12 p-3 text-base font-normal leading-normal placeholder:text-[#8a7b60] dark:placeholder-gray-400"
                          placeholder="Min 6 characters"
                          type="password"
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            if (error) setError('');
                          }}
                          minLength={6}
                          required
                          disabled={isSubmitting}
                        />
                        <p className="text-xs text-[#8a7b60] dark:text-gray-500 mt-1.5">Min 6 characters</p>
                      </label>

                      <label className="flex flex-col flex-1">
                        <p className="text-[#181511] dark:text-gray-200 text-sm font-medium leading-normal pb-2">Phone (Optional)</p>
                        <input
                          className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#181511] dark:text-white focus:outline-none focus:ring-2 focus:ring-primary border border-[#e6e2db] dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-primary/50 dark:focus:border-primary/50 h-12 p-3 text-base font-normal leading-normal placeholder:text-[#8a7b60] dark:placeholder-gray-400"
                          placeholder="+91 98765 43210"
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          disabled={isSubmitting}
                        />
                      </label>

                      <div className="pt-2 space-y-3">
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-orange-500 to-[#f04129] py-3 px-4 font-semibold text-white transition-all duration-200 hover:from-orange-600 hover:to-[#d63a25] disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          <span className="material-symbols-outlined mr-2 text-xl">person_add</span>
                          {isSubmitting ? 'Creating...' : 'Create User'}
                        </button>
                        <button
                          type="button"
                          onClick={clearForm}
                          disabled={isSubmitting}
                          className="w-full text-center text-sm text-[#8a7b60] dark:text-gray-400 hover:text-[#181511] dark:hover:text-white transition-colors duration-200 disabled:opacity-50"
                        >
                          Clear Form
                        </button>
                      </div>
                    </form>
                  </div>
                </div>

                {/* Users Table */}
                <div className="lg:col-span-2">
                  <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-[#e6e2db] dark:border-slate-700 p-6 sm:p-8">
                    <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
                      <h2 className="text-xl text-[#181511] dark:text-white font-bold flex items-center shrink-0">
                        End Users
                        <span className="ml-3 px-3 py-1 bg-red-100 text-[#f04129] dark:bg-[#f04129]/20 dark:text-[#f04129] rounded-full text-sm font-semibold">
                          {usersList.length}
                        </span>
                      </h2>
                      <div className="flex w-full sm:w-auto items-center gap-4">
                        <div className="relative w-full sm:w-64">
                          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <svg className="h-5 w-5 text-[#8a7b60] dark:text-gray-400" fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
                              <circle cx="11" cy="11" r="8"></circle>
                              <line x1="21" x2="16.65" y1="21" y2="16.65"></line>
                            </svg>
                          </div>
                          <input
                            className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#181511] dark:text-white focus:outline-none focus:ring-2 focus:ring-primary border border-[#e6e2db] dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-primary/50 dark:focus:border-primary/50 h-10 pl-10 pr-3 text-sm font-normal leading-normal placeholder:text-[#8a7b60] dark:placeholder-gray-400"
                            placeholder="Search by name or email..."
                            type="search"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                          />
                        </div>
                        <div className="relative">
                          <select 
                            className="form-select w-full appearance-none rounded-lg border border-[#e6e2db] dark:border-slate-600 bg-white dark:bg-slate-800 py-2 pl-3 pr-8 text-sm text-[#181511] dark:text-white focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-[#f04129] dark:focus:border-primary/50"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                          >
                            <option value="All Status">All Status</option>
                            <option value="Locked">Locked</option>
                            <option value="Unlocked">Unlocked</option>
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#8a7b60] dark:text-gray-400">
                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                              <path clipRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" fillRule="evenodd"></path>
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>

                    {usersList.length === 0 ? (
                      <div className="text-center py-12">
                        <p className="text-[#8a7b60] dark:text-gray-400 text-base mb-2">No end users found.</p>
                        <p className="text-[#8a7b60] dark:text-gray-400 text-sm">Create your first end user using the form above.</p>
                      </div>
                    ) : filteredUsers.length === 0 ? (
                      <div className="text-center py-12">
                        <p className="text-[#8a7b60] dark:text-gray-400 text-base mb-2">No matching records found.</p>
                        <p className="text-[#8a7b60] dark:text-gray-400 text-sm">Try adjusting your search or filter criteria.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full">
                          <thead className="border-b border-[#e6e2db] dark:border-white/10">
                            <tr>
                              <th className="px-6 py-4 text-left text-xs font-medium text-[#8a7b60] dark:text-gray-300 uppercase tracking-wider" scope="col">Name</th>
                              <th className="px-6 py-4 text-left text-xs font-medium text-[#8a7b60] dark:text-gray-300 uppercase tracking-wider" scope="col">Email</th>
                              <th className="px-6 py-4 text-left text-xs font-medium text-[#8a7b60] dark:text-gray-300 uppercase tracking-wider" scope="col">Status</th>
                              <th className="px-6 py-4 text-left text-xs font-medium text-[#8a7b60] dark:text-gray-300 uppercase tracking-wider" scope="col">Phone</th>
                              <th className="px-6 py-4 text-left text-xs font-medium text-[#8a7b60] dark:text-gray-300 uppercase tracking-wider" scope="col">Actions</th>
                              {isSuperAdmin && (
                                <th className="px-6 py-4 text-left text-xs font-medium text-[#8a7b60] dark:text-gray-300 uppercase tracking-wider" scope="col"></th>
                              )}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#e6e2db] dark:divide-white/10">
                            {filteredUsers.map((user) => {
                              const userId = user._id || user.id || '';
                              const isDeviceLocked = !!user.registeredDeviceId;
                              const isResetting = resettingDevice === userId;
                              const isDeleting = deletingUser === userId;
                              const userName = `${user.profile.firstName} ${user.profile.lastName}`;

                              return (
                                <tr key={userId} className="hover:bg-red-50 dark:hover:bg-[#f04129]/10 transition-colors duration-150">
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#181511] dark:text-white">
                                    {userName}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#8a7b60] dark:text-gray-400">
                                    {user.email}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    {isDeviceLocked ? (
                                      <span className="inline-flex items-center text-xs leading-5 font-semibold rounded-full border bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 border-red-200 dark:border-red-500/20 px-2 py-0.5">
                                        <span className="material-symbols-outlined mr-1 text-sm">lock</span>
                                        Locked
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center text-xs leading-5 font-semibold rounded-full border bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400 border-green-200 dark:border-green-500/20 px-2 py-0.5">
                                        <span className="material-symbols-outlined mr-1 text-sm">lock_open</span>
                                        Unlocked
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#8a7b60] dark:text-gray-400">
                                    {user.profile.phone || 'N/A'}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    {isDeviceLocked ? (
                                      <button
                                        onClick={() => handleResetDevice(userId)}
                                        disabled={isResetting}
                                        className={`inline-flex items-center text-red-600 hover:text-red-800 dark:text-red-500 dark:hover:text-red-400 transition-colors duration-200 text-xs py-1 px-2 rounded-md border border-transparent hover:bg-red-500/10 dark:hover:bg-red-500/10 ${
                                          isResetting ? 'opacity-50 cursor-not-allowed' : ''
                                        }`}
                                        title="Reset device to allow user to register a new device"
                                      >
                                        {isResetting ? (
                                          <>
                                            <svg className="animate-spin -ml-1 mr-1.5 h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                              <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"></path>
                                            </svg>
                                            Resetting...
                                          </>
                                        ) : (
                                          <>
                                            <span className="material-symbols-outlined mr-1 text-sm">restart_alt</span>
                                            Reset Device
                                          </>
                                        )}
                                      </button>
                                    ) : (
                                      <button
                                        disabled
                                        className="inline-flex items-center text-red-600 hover:text-red-800 dark:text-red-500 dark:hover:text-red-400 transition-colors duration-200 text-xs py-1 px-2 rounded-md border border-transparent opacity-50 cursor-not-allowed"
                                      >
                                        <span className="material-symbols-outlined mr-1 text-sm">restart_alt</span>
                                        Reset Device
                                      </button>
                                    )}
                                  </td>
                                  {isSuperAdmin && (
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                      <button
                                        onClick={() => handleDeleteUser(userId, userName)}
                                        disabled={isDeleting}
                                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Delete user"
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
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageUsers;

