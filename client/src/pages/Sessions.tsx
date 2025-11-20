import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { ISession } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Eye, Edit } from 'lucide-react';

const Sessions: React.FC = () => {
  const navigate = useNavigate();
  const { user, isSuperAdmin, isCompanyAdmin, isManager, isSessionAdmin } = useAuth();
  const [sessions, setSessions] = useState<ISession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // SuperAdmin, CompanyAdmin, Manager, and SessionAdmin can create sessions
  const canCreateSession = isSuperAdmin || isCompanyAdmin || isManager || isSessionAdmin;
  
  // Check if user can edit a specific session
  const canEditSession = (session: ISession) => {
    if (isSuperAdmin) return true; // SuperAdmin can edit any session
    if (isSessionAdmin && session.sessionAdmin === user?.id) return true; // SessionAdmin can edit their assigned sessions
    return false;
  };

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const { data } = await api.get('/api/sessions');
        setSessions(data || []);
      } catch (err: any) {
        if (err.response?.status === 401) {
          setError('You are not authorized. Please log in again.');
        } else {
          setError('Failed to load sessions. Please try again.');
        }
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessions();
  }, []);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString; // Return original if invalid
      }
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString; // Return original if error
    }
  };

  const formatFrequency = (frequency: string) => {
    const freqMap: { [key: string]: string } = {
      OneTime: 'One Time',
      Daily: 'Daily',
      Weekly: 'Weekly',
      Monthly: 'Monthly',
    };
    return freqMap[frequency] || frequency;
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

  if (isLoading) {
    return (
      <div className="relative flex h-auto min-h-screen w-full flex-col group/design-root overflow-x-hidden bg-background-light dark:bg-background-dark">
        <div className="layout-container flex h-full grow flex-col">
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white leading-tight tracking-[-0.033em]">Classes/Batches</h1>
              {canCreateSession && (
                <Link
                  to="/sessions/create"
                  className="flex min-w-[84px] cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg h-10 px-5 bg-gradient-to-r from-orange-500 to-[#f04129] text-white text-sm font-bold leading-normal tracking-[0.015em] hover:from-orange-600 hover:to-[#d63a25] transition-all"
                >
                  <span className="material-symbols-outlined text-xl">add</span>
                  <span className="truncate">Create New Class</span>
                </Link>
              )}
            </header>
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center">
                <svg className="animate-spin h-8 w-8 text-[#f04129] mb-4" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"></path>
                </svg>
                <p className="text-[#8a7b60] dark:text-gray-400">Loading classes/batches...</p>
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
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white leading-tight tracking-[-0.033em]">Classes/Batches</h1>
              {canCreateSession && (
                <Link
                  to="/sessions/create"
                  className="flex min-w-[84px] cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg h-10 px-5 bg-gradient-to-r from-orange-500 to-[#f04129] text-white text-sm font-bold leading-normal tracking-[0.015em] hover:from-orange-600 hover:to-[#d63a25] transition-all"
                >
                  <span className="material-symbols-outlined text-xl">add</span>
                  <span className="truncate">Create New Class</span>
                </Link>
              )}
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

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col group/design-root overflow-x-hidden bg-background-light dark:bg-background-dark">
      <div className="layout-container flex h-full grow flex-col">
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[#f04129] text-4xl">calendar_month</span>
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white leading-tight tracking-[-0.033em]">Sessions</h1>
            </div>
            {canCreateSession && (
              <Link
                to="/sessions/create"
                className="flex min-w-[84px] cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg h-10 px-5 bg-gradient-to-r from-orange-500 to-[#f04129] text-white text-sm font-bold leading-normal tracking-[0.015em] hover:from-orange-600 hover:to-[#d63a25] transition-all"
              >
                <span className="material-symbols-outlined text-xl">add</span>
                <span className="truncate">Create New Session</span>
              </Link>
            )}
          </header>

          {sessions.length === 0 ? (
            <div className="mt-12 md:col-span-2 lg:col-span-3">
              <div className="flex flex-col items-center gap-6 rounded-xl border-2 border-dashed border-[#e6e2db] dark:border-slate-800 px-6 py-14">
                <div className="flex max-w-[480px] flex-col items-center gap-2 text-center">
                  <p className="text-[#181511] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">No Classes/Batches Available</p>
                  <p className="text-[#181511] dark:text-slate-300 text-sm font-normal leading-normal">There are currently no classes/batches scheduled. Get started by creating a new one.</p>
                </div>
                {canCreateSession && (
                  <Link
                    to="/sessions/create"
                    className="flex min-w-[84px] cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg h-10 px-5 bg-gradient-to-r from-orange-500 to-[#f04129] text-white text-sm font-bold leading-normal tracking-[0.015em] hover:from-orange-600 hover:to-[#d63a25] transition-all"
                  >
                    <span className="material-symbols-outlined text-xl">add</span>
                    <span className="truncate">Create New Class</span>
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sessions.map((session) => (
                <div
                  key={session._id}
                  className="flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/sessions/${session._id}`)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white pr-4">{session.name}</h2>
                    <span className="whitespace-nowrap rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                      {formatFrequency(session.frequency)}
                    </span>
                  </div>
                  <div className="flex-grow space-y-3 text-slate-700 dark:text-slate-300 mb-4">
                    {session.endDate ? (
                      <div className="flex items-center text-sm">
                        <span className="material-symbols-outlined mr-2 text-slate-500 dark:text-slate-400 text-lg">date_range</span>
                        <span>{formatDate(session.startDate)} - {formatDate(session.endDate)}</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-sm">
                        <span className="material-symbols-outlined mr-2 text-slate-500 dark:text-slate-400 text-lg">calendar_today</span>
                        <span>{formatDate(session.startDate)}</span>
                      </div>
                    )}
                    <div className="flex items-center text-sm">
                      <span className="material-symbols-outlined mr-2 text-slate-500 dark:text-slate-400 text-lg">schedule</span>
                      <span>{formatTime(session.startTime)} - {formatTime(session.endTime)}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <span className="material-symbols-outlined mr-2 text-slate-500 dark:text-slate-400 text-lg">location_on</span>
                      <span>{session.locationType}</span>
                    </div>
                    {session.assignedUsers && Array.isArray(session.assignedUsers) && session.assignedUsers.length > 0 && (
                      <div className="flex items-center text-sm">
                        <span className="material-symbols-outlined mr-2 text-slate-500 dark:text-slate-400 text-lg">group</span>
                        <span>{session.assignedUsers.length} Assigned Users</span>
                      </div>
                    )}
                    {session.description && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 pt-1">{session.description}</p>
                    )}
                  </div>
                  <div className="mt-auto flex flex-col gap-2 sm:flex-row sm:gap-2">
                    <button
                      className="flex flex-1 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg h-10 px-4 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/sessions/${session._id}`);
                      }}
                    >
                      <Eye className="w-5 h-5" />
                      <span className="truncate">View Details</span>
                    </button>
                    {canEditSession(session) && (
                      <button
                        className="flex flex-1 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg h-10 px-4 border border-[#f04129] text-[#f04129] text-sm font-bold hover:bg-red-50 dark:hover:bg-[#f04129]/10 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/sessions/edit/${session._id}`);
                        }}
                      >
                        <Edit className="w-5 h-5" />
                        <span className="truncate">Edit</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Sessions;
