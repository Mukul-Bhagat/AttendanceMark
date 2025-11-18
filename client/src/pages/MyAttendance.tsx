import React, { useState, useEffect } from 'react';
import api from '../api';
import { IMyAttendanceRecord } from '../types';

const MyAttendance: React.FC = () => {
  const [records, setRecords] = useState<IMyAttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMyAttendance = async () => {
      try {
        const { data } = await api.get('/api/attendance/me');
        setRecords(data || []);
      } catch (err: any) {
        if (err.response?.status === 401) {
          setError('You are not authorized. Please log in again.');
        } else {
          setError('Failed to fetch attendance history.');
        }
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMyAttendance();
  }, []);

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

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString;
      }
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const formatTime = (timeString: string) => {
    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch {
      return timeString;
    }
  };

  const formatSessionDateTime = (session: any) => {
    if (!session || !session.startDate || !session.startTime) {
      return 'N/A';
    }
    
    try {
      const date = formatDate(session.startDate);
      const time = formatTime(session.startTime);
      return `${date} at ${time}`;
    } catch {
      return 'N/A';
    }
  };

  if (isLoading) {
    return (
      <div className="relative flex h-auto min-h-screen w-full flex-col group/design-root overflow-x-hidden bg-background-light dark:bg-background-dark">
        <div className="layout-container flex h-full grow flex-col">
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-4xl">history</span>
                <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white leading-tight tracking-[-0.033em]">My Attendance</h1>
              </div>
            </header>
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center">
                <svg className="animate-spin h-8 w-8 text-primary mb-4" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"></path>
                </svg>
                <p className="text-[#8a7b60] dark:text-gray-400">Loading attendance history...</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative flex h-auto min-h-screen w-full flex-col group/design-root overflow-x-hidden bg-background-light dark:bg-background-dark">
        <div className="layout-container flex h-full grow flex-col">
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-4xl">history</span>
                <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white leading-tight tracking-[-0.033em]">My Attendance</h1>
              </div>
            </header>
            <div className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800 p-4 rounded-xl flex items-center">
              <span className="material-symbols-outlined mr-2">error</span>
              {error}
            </div>
          </main>
        </div>
      </div>
    );
  }

  const totalRecords = records.length;
  const verifiedCount = records.filter(r => r.locationVerified).length;
  const notVerifiedCount = totalRecords - verifiedCount;

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col group/design-root overflow-x-hidden bg-background-light dark:bg-background-dark">
      <div className="layout-container flex h-full grow flex-col">
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-4xl">history</span>
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white leading-tight tracking-[-0.033em]">My Attendance</h1>
            </div>
          </header>

          {records.length === 0 ? (
            <div className="mt-12">
              <div className="flex flex-col items-center gap-6 rounded-xl border-2 border-dashed border-[#e6e2db] dark:border-slate-800 px-6 py-14">
                <div className="flex max-w-[480px] flex-col items-center gap-2 text-center">
                  <span className="material-symbols-outlined text-6xl text-[#8a7b60] dark:text-gray-400 mb-2">event_available</span>
                  <p className="text-[#181511] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">No Attendance Records</p>
                  <p className="text-[#181511] dark:text-slate-300 text-sm font-normal leading-normal">
                    You have no attendance records yet. Scan a QR code to mark your attendance for a session.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#8a7b60] dark:text-gray-400 mb-1">Total Records</p>
                      <p className="text-3xl font-bold text-slate-900 dark:text-white">{totalRecords}</p>
                    </div>
                    <span className="material-symbols-outlined text-4xl text-primary opacity-50">event_note</span>
                  </div>
                </div>
                <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-1">Verified</p>
                      <p className="text-3xl font-bold text-green-700 dark:text-green-400">{verifiedCount}</p>
                    </div>
                    <span className="material-symbols-outlined text-4xl text-green-600 dark:text-green-400 opacity-50">verified</span>
                  </div>
                </div>
                <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-1">Not Verified</p>
                      <p className="text-3xl font-bold text-red-700 dark:text-red-400">{notVerifiedCount}</p>
                    </div>
                    <span className="material-symbols-outlined text-4xl text-red-600 dark:text-red-400 opacity-50">cancel</span>
                  </div>
                </div>
              </div>

              {/* Attendance Records Table */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                    <thead className="bg-slate-50 dark:bg-slate-800/50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider" scope="col">Session</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider" scope="col">Session Start</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider" scope="col">Check-in Time</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider" scope="col">Location Status</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider" scope="col">Details</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-900/50 divide-y divide-slate-200 dark:divide-slate-700">
                      {records.map((record) => (
                        <tr key={record._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            {record.sessionId ? (
                              <div>
                                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                                  {record.sessionId.name}
                                </div>
                                {record.sessionId.description && (
                                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                                    {record.sessionId.description}
                                  </div>
                                )}
                                <div className="flex items-center gap-2 mt-2">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                    {record.sessionId.locationType || record.sessionId.sessionType}
                                  </span>
                                  {record.sessionId.frequency && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                                      {record.sessionId.frequency}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm font-medium text-slate-400 dark:text-slate-500 italic">
                                Session (deleted)
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                            {record.sessionId ? (
                              <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-lg text-slate-400">schedule</span>
                                {formatSessionDateTime(record.sessionId)}
                              </div>
                            ) : (
                              'N/A'
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-lg text-slate-400">login</span>
                              {formatDateTime(record.checkInTime)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {record.locationVerified ? (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border border-green-200 dark:border-green-800">
                                <span className="material-symbols-outlined mr-1 text-sm">verified</span>
                                Verified
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 border border-red-200 dark:border-red-800">
                                <span className="material-symbols-outlined mr-1 text-sm">cancel</span>
                                Not Verified
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                            <div className="flex flex-col gap-1">
                              {record.userLocation && (
                                <div className="flex items-center gap-1 text-xs">
                                  <span className="material-symbols-outlined text-sm">location_on</span>
                                  <span>Lat: {record.userLocation.latitude.toFixed(4)}, Lng: {record.userLocation.longitude.toFixed(4)}</span>
                                </div>
                              )}
                              {record.deviceId && (
                                <div className="flex items-center gap-1 text-xs">
                                  <span className="material-symbols-outlined text-sm">phone_android</span>
                                  <span className="font-mono">{record.deviceId.substring(0, 8)}...</span>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default MyAttendance;

