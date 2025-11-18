import React, { useState, useEffect } from 'react';
import api from '../api';
import { ISession, IMyAttendanceRecord } from '../types';
import { IUser } from '../contexts/AuthContext';
import { FileText, Download } from 'lucide-react';

// Define a new type for the session report (with populated user)
interface ISessionAttendanceRecord {
  _id: string;
  checkInTime: string;
  locationVerified: boolean;
  userId: {
    _id: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
    };
  } | null;
}

const AttendanceReport: React.FC = () => {
  const [filterType, setFilterType] = useState<'session' | 'user'>('session');
  
  // Data for dropdowns
  const [allSessions, setAllSessions] = useState<ISession[]>([]);
  const [allUsers, setAllUsers] = useState<IUser[]>([]);
  
  // Selected filter
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  
  // Report data
  const [sessionReport, setSessionReport] = useState<ISessionAttendanceRecord[]>([]);
  const [userReport, setUserReport] = useState<IMyAttendanceRecord[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingFilters, setIsLoadingFilters] = useState(true);
  const [error, setError] = useState('');

  // 1. Fetch data for both dropdowns on page load
  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingFilters(true);
      setError('');
      try {
        // Fetch sessions and users in parallel
        const [sessionRes, userRes] = await Promise.all([
          api.get('/api/sessions'),
          api.get('/api/users/my-organization')
        ]);
        setAllSessions(sessionRes.data || []);
        setAllUsers(userRes.data || []);
      } catch (err: any) {
        if (err.response?.status === 401) {
          setError('You are not authorized. Please log in again.');
        } else {
          setError('Failed to load filter data. Please try again.');
        }
        console.error(err);
      } finally {
        setIsLoadingFilters(false);
      }
    };
    fetchData();
  }, []);

  // 2. Fetch report when the "View Report" button is clicked
  const handleViewReport = async () => {
    setIsLoading(true);
    setError('');
    setSessionReport([]);
    setUserReport([]);

    try {
      if (filterType === 'session' && selectedSession) {
        const { data } = await api.get(`/api/attendance/session/${selectedSession}`);
        setSessionReport(data || []);
      } else if (filterType === 'user' && selectedUser) {
        const { data } = await api.get(`/api/attendance/user/${selectedUser}`);
        setUserReport(data || []);
      } else {
        setError('Please select a session or user.');
        setIsLoading(false);
        return;
      }
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError('You are not authorized to view attendance reports.');
      } else if (err.response?.status === 404) {
        setError(err.response.data.msg || 'Session or user not found.');
      } else {
        setError(err.response?.data?.msg || 'Failed to fetch report. Please try again.');
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString;
      }
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const formatSessionDateTime = (session: any) => {
    if (!session || !session.startDate || !session.startTime) {
      return 'N/A';
    }
    
    try {
      const [hour, minute] = session.startTime.split(':').map(Number);
      const sessionDate = new Date(session.startDate);
      sessionDate.setHours(hour, minute, 0, 0);
      
      if (isNaN(sessionDate.getTime())) {
        return 'N/A';
      }
      
      return sessionDate.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'N/A';
    }
  };

  if (isLoadingFilters) {
    return (
      <div className="relative flex h-auto min-h-screen w-full flex-col group/design-root overflow-x-hidden">
        <div className="layout-container flex h-full grow flex-col">
          <div className="px-4 sm:px-8 md:px-16 lg:px-24 xl:px-40 flex flex-1 justify-center py-5 sm:py-10">
            <div className="layout-content-container flex flex-col max-w-5xl flex-1 gap-8">
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center">
                  <svg className="animate-spin h-8 w-8 text-primary mb-4" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"></path>
                  </svg>
                  <p className="text-[#8a7b60] dark:text-gray-400">Loading filters...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col group/design-root overflow-x-hidden">
      <div className="layout-container flex h-full grow flex-col">
        <div className="px-4 sm:px-8 md:px-16 lg:px-24 xl:px-40 flex flex-1 justify-center py-5 sm:py-10">
          <div className="layout-content-container flex flex-col max-w-5xl flex-1 gap-8">
            <div className="flex flex-wrap justify-between gap-3 p-4">
              <p className="text-[#181511] dark:text-background-light text-4xl font-black leading-tight tracking-[-0.033em] min-w-72">Attendance Report</p>
            </div>

            {/* Error Alert */}
            {error && !isLoading && (
              <div className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800 p-4 rounded-xl flex items-center">
                <span className="material-symbols-outlined mr-2">cancel</span>
                {error}
              </div>
            )}

            {/* Filter Section */}
            <div className="bg-white dark:bg-background-dark/50 border border-[#e6e2db] dark:border-white/10 rounded-xl shadow-sm p-6 sm:p-8">
              <h2 className="text-[#181511] dark:text-background-light text-[22px] font-bold leading-tight tracking-[-0.015em] pb-5 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">description</span>
                Generate Report
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                <label className="flex flex-col min-w-40 flex-1">
                  <p className="text-[#181511] dark:text-white/80 text-base font-medium leading-normal pb-2">View By</p>
                  <div className="relative">
                    <select
                      className="form-select appearance-none flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-[#181511] dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-[#e6e2db] dark:border-white/20 bg-white dark:bg-background-dark/50 h-14 p-[15px] text-base font-normal leading-normal"
                      value={filterType}
                      onChange={(e) => {
                        setFilterType(e.target.value as 'session' | 'user');
                        setSelectedSession('');
                        setSelectedUser('');
                        setSessionReport([]);
                        setUserReport([]);
                        setError('');
                      }}
                      disabled={isLoading}
                    >
                      <option value="session">Session</option>
                      <option value="user">User</option>
                    </select>
                    <span className="material-symbols-outlined pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#8a7b60] dark:text-white/60">unfold_more</span>
                  </div>
                </label>

                {filterType === 'session' ? (
                  <label className="flex flex-col min-w-40 flex-1">
                    <p className="text-[#181511] dark:text-white/80 text-base font-medium leading-normal pb-2">Select Session</p>
                    <div className="relative">
                      <select
                        className="form-select appearance-none flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-[#181511] dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-[#e6e2db] dark:border-white/20 bg-white dark:bg-background-dark/50 h-14 p-[15px] text-base font-normal leading-normal"
                        value={selectedSession}
                        onChange={(e) => {
                          setSelectedSession(e.target.value);
                          setSessionReport([]);
                          setError('');
                        }}
                        disabled={isLoading}
                      >
                        <option value="">-- Select Session --</option>
                        {allSessions.map((session) => (
                          <option key={session._id} value={session._id}>
                            {session.name} ({new Date(session.startDate).toLocaleDateString()})
                          </option>
                        ))}
                      </select>
                      <span className="material-symbols-outlined pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#8a7b60] dark:text-white/60">unfold_more</span>
                    </div>
                  </label>
                ) : (
                  <label className="flex flex-col min-w-40 flex-1">
                    <p className="text-[#181511] dark:text-white/80 text-base font-medium leading-normal pb-2">Select User</p>
                    <div className="relative">
                      <select
                        className="form-select appearance-none flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-[#181511] dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-[#e6e2db] dark:border-white/20 bg-white dark:bg-background-dark/50 h-14 p-[15px] text-base font-normal leading-normal"
                        value={selectedUser}
                        onChange={(e) => {
                          setSelectedUser(e.target.value);
                          setUserReport([]);
                          setError('');
                        }}
                        disabled={isLoading}
                      >
                        <option value="">-- Select User --</option>
                        {allUsers.map((user) => {
                          const userId = (user as any)._id || user.id;
                          return (
                            <option key={userId} value={userId}>
                              {user.profile.firstName} {user.profile.lastName} ({user.email})
                            </option>
                          );
                        })}
                      </select>
                      <span className="material-symbols-outlined pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#8a7b60] dark:text-white/60">unfold_more</span>
                    </div>
                  </label>
                )}

                <div className="w-full">
                  <button
                    className={`flex w-full min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-14 px-5 bg-primary text-[#181511] gap-2 text-base font-bold leading-normal tracking-[0.015em] hover:bg-primary/90 transition-colors disabled:opacity-70 disabled:cursor-not-allowed`}
                    onClick={handleViewReport}
                    disabled={isLoading || (filterType === 'session' && !selectedSession) || (filterType === 'user' && !selectedUser)}
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-[#181511]" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"></path>
                        </svg>
                        <span className="truncate">Loading...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[#181511]">filter_alt</span>
                        <span className="truncate">View Report</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center">
                  <svg className="animate-spin h-8 w-8 text-primary mb-4" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"></path>
                  </svg>
                  <p className="text-[#8a7b60] dark:text-gray-400">Loading report...</p>
                </div>
              </div>
            )}

            {/* Report Results Section - Session Report */}
            {!isLoading && sessionReport.length > 0 && (
              <div className="bg-white dark:bg-background-dark/50 border border-[#e6e2db] dark:border-white/10 rounded-xl shadow-sm p-6 sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-5">
                  <div className="flex items-center gap-4 flex-wrap">
                    <h2 className="text-[#181511] dark:text-background-light text-[22px] font-bold leading-tight tracking-[-0.015em]">Report Results</h2>
                    <span className="px-3 py-1 bg-primary/20 text-primary-darker dark:text-primary rounded-full text-sm font-medium">
                      Total Records: {sessionReport.length}
                    </span>
                    <span className="px-3 py-1 bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 rounded-full text-sm font-medium">
                      Verified: {sessionReport.filter(r => r.locationVerified).length}
                    </span>
                    <span className="px-3 py-1 bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300 rounded-full text-sm font-medium">
                      Not Verified: {sessionReport.filter(r => !r.locationVerified).length}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-10 px-4 bg-transparent text-primary dark:text-primary border border-primary gap-2 text-sm font-bold leading-normal tracking-[0.015em] hover:bg-primary/10 transition-colors">
                      <FileText className="w-4 h-4" />
                      <span className="truncate">CSV</span>
                    </button>
                    <button className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-10 px-4 bg-primary text-[#181511] gap-2 text-sm font-bold leading-normal tracking-[0.015em] hover:bg-primary/90 transition-colors">
                      <Download className="w-4 h-4" />
                      <span className="truncate">PDF</span>
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-full divide-y divide-[#e6e2db] dark:divide-white/10">
                    <thead className="bg-background-light dark:bg-white/5">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-medium text-[#8a7b60] dark:text-white/60 uppercase tracking-wider" scope="col">User Name</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-[#8a7b60] dark:text-white/60 uppercase tracking-wider" scope="col">Email</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-[#8a7b60] dark:text-white/60 uppercase tracking-wider" scope="col">Time</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-[#8a7b60] dark:text-white/60 uppercase tracking-wider" scope="col">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-background-dark/50 divide-y divide-[#e6e2db] dark:divide-white/10">
                      {sessionReport.map(record => (
                        <tr key={record._id} className="hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors duration-150">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#181511] dark:text-white">
                            {record.userId ? (
                              `${record.userId.profile.firstName} ${record.userId.profile.lastName}`
                            ) : (
                              <span className="text-[#8a7b60] dark:text-gray-400">User (deleted)</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[#8a7b60] dark:text-white/70">
                            {record.userId ? record.userId.email : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[#8a7b60] dark:text-white/70">
                            {formatDateTime(record.checkInTime)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {record.locationVerified ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
                                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check_circle</span>
                                Verified
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300">
                                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>cancel</span>
                                Failed
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Report Results Section - User Report */}
            {!isLoading && userReport.length > 0 && (
              <div className="bg-white dark:bg-background-dark/50 border border-[#e6e2db] dark:border-white/10 rounded-xl shadow-sm p-6 sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-5">
                  <div className="flex items-center gap-4 flex-wrap">
                    <h2 className="text-[#181511] dark:text-background-light text-[22px] font-bold leading-tight tracking-[-0.015em]">Report Results</h2>
                    <span className="px-3 py-1 bg-primary/20 text-primary-darker dark:text-primary rounded-full text-sm font-medium">
                      Total Records: {userReport.length}
                    </span>
                    <span className="px-3 py-1 bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 rounded-full text-sm font-medium">
                      Verified: {userReport.filter(r => r.locationVerified).length}
                    </span>
                    <span className="px-3 py-1 bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300 rounded-full text-sm font-medium">
                      Not Verified: {userReport.filter(r => !r.locationVerified).length}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-10 px-4 bg-transparent text-primary dark:text-primary border border-primary gap-2 text-sm font-bold leading-normal tracking-[0.015em] hover:bg-primary/10 transition-colors">
                      <FileText className="w-4 h-4" />
                      <span className="truncate">CSV</span>
                    </button>
                    <button className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-10 px-4 bg-primary text-[#181511] gap-2 text-sm font-bold leading-normal tracking-[0.015em] hover:bg-primary/90 transition-colors">
                      <Download className="w-4 h-4" />
                      <span className="truncate">PDF</span>
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-full divide-y divide-[#e6e2db] dark:divide-white/10">
                    <thead className="bg-background-light dark:bg-white/5">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-medium text-[#8a7b60] dark:text-white/60 uppercase tracking-wider" scope="col">Session Name</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-[#8a7b60] dark:text-white/60 uppercase tracking-wider" scope="col">Session Start Time</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-[#8a7b60] dark:text-white/60 uppercase tracking-wider" scope="col">Check-in Time</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-[#8a7b60] dark:text-white/60 uppercase tracking-wider" scope="col">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-background-dark/50 divide-y divide-[#e6e2db] dark:divide-white/10">
                      {userReport.map(record => (
                        <tr key={record._id} className="hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors duration-150">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#181511] dark:text-white">
                            {record.sessionId ? (
                              <div>
                                <div>{record.sessionId.name}</div>
                                {record.sessionId.description && (
                                  <p className="text-xs text-[#8a7b60] dark:text-gray-400 mt-1">{record.sessionId.description}</p>
                                )}
                              </div>
                            ) : (
                              <span className="text-[#8a7b60] dark:text-gray-400">Session (deleted)</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[#8a7b60] dark:text-white/70">
                            {formatSessionDateTime(record.sessionId)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[#8a7b60] dark:text-white/70">
                            {formatDateTime(record.checkInTime)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {record.locationVerified ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
                                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check_circle</span>
                                Verified
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300">
                                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>cancel</span>
                                Failed
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Empty State - Initial */}
            {!isLoading && sessionReport.length === 0 && userReport.length === 0 && !error && selectedSession === '' && selectedUser === '' && (
              <div className="bg-white dark:bg-background-dark/50 border border-[#e6e2db] dark:border-white/10 rounded-xl shadow-sm p-6 sm:p-8 text-center py-12">
                <p className="text-[#181511] dark:text-white text-xl font-semibold mb-2">📊 Ready to Generate Report</p>
                <p className="text-[#8a7b60] dark:text-gray-400">Select a session or user above and click "View Report" to generate a report.</p>
              </div>
            )}

            {/* Empty State - After Selection */}
            {!isLoading && sessionReport.length === 0 && userReport.length === 0 && !error && (selectedSession !== '' || selectedUser !== '') && (
              <div className="bg-white dark:bg-background-dark/50 border border-[#e6e2db] dark:border-white/10 rounded-xl shadow-sm p-6 sm:p-8 text-center py-12">
                <p className="text-[#181511] dark:text-white text-xl font-semibold mb-2">📭 No Attendance Records Found</p>
                <p className="text-[#8a7b60] dark:text-gray-400">
                  {filterType === 'session'
                    ? 'No users have marked attendance for this session yet.'
                    : 'This user has not marked attendance for any sessions yet.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceReport;

