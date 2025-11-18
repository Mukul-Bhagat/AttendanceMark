import React, { useState, useEffect } from 'react';
import api from '../api';
import { useParams, Link } from 'react-router-dom';
import { ISession } from '../types';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft } from 'lucide-react';

const SessionDetails: React.FC = () => {
  const [session, setSession] = useState<ISession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const { id } = useParams<{ id: string }>(); // Get the session ID from the URL

  useEffect(() => {
    const fetchSession = async () => {
      if (!id) {
        setError('Invalid session ID.');
        setIsLoading(false);
        return;
      }

      try {
        const { data } = await api.get(`/api/sessions/${id}`);
        setSession(data);
      } catch (err: any) {
        if (err.response?.status === 401) {
          setError('You are not authorized to view this session.');
        } else if (err.response?.status === 404) {
          setError('Session not found.');
        } else {
          setError('Failed to load session. Please try again.');
        }
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSession();
  }, [id]);

  if (isLoading) {
    return (
      <div className="relative flex h-auto min-h-screen w-full flex-col group/design-root overflow-x-hidden bg-background-light dark:bg-background-dark font-display text-[#181511] dark:text-gray-200">
        <div className="layout-container flex h-full grow flex-col">
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <header className="mb-8">
              <Link
                to="/sessions"
                className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-[#f5f3f0] dark:bg-background-dark/50 text-[#181511] dark:text-gray-200 gap-2 text-sm font-bold leading-normal tracking-[0.015em] border border-gray-300 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-background-dark"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="truncate">Back to All Sessions</span>
              </Link>
            </header>
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center">
                <svg className="animate-spin h-8 w-8 text-primary mb-4" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"></path>
                </svg>
                <p className="text-[#8a7b60] dark:text-gray-400">Loading session...</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="relative flex h-auto min-h-screen w-full flex-col group/design-root overflow-x-hidden bg-background-light dark:bg-background-dark font-display text-[#181511] dark:text-gray-200">
        <div className="layout-container flex h-full grow flex-col">
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <header className="mb-8">
              <Link
                to="/sessions"
                className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-[#f5f3f0] dark:bg-background-dark/50 text-[#181511] dark:text-gray-200 gap-2 text-sm font-bold leading-normal tracking-[0.015em] border border-gray-300 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-background-dark"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="truncate">Back to All Sessions</span>
              </Link>
            </header>
            <div className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800 p-4 rounded-xl flex items-center mb-4">
              <span className="material-symbols-outlined mr-2">error</span>
              {error || 'Session not found.'}
            </div>
          </main>
        </div>
      </div>
    );
  }

  // The value of the QR code will be the session's unique _id
  // This is what the End User's app will scan
  const qrValue = session._id;

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString; // Return original if invalid
      }
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
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

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col group/design-root overflow-x-hidden bg-background-light dark:bg-background-dark font-display text-[#181511] dark:text-gray-200">
      <div className="layout-container flex h-full grow flex-col">
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <header className="mb-8">
            <Link
              to="/sessions"
              className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-[#f5f3f0] dark:bg-background-dark/50 text-[#181511] dark:text-gray-200 gap-2 text-sm font-bold leading-normal tracking-[0.015em] border border-gray-300 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-background-dark"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="truncate">Back to All Sessions</span>
            </Link>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Column 1: Session Information */}
            <div className="bg-white dark:bg-[#2a2418] rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 sm:p-8">
              <div className="flex min-w-72 flex-col gap-2 mb-6">
                <p className="text-[#181511] dark:text-white text-3xl font-black leading-tight tracking-[-0.033em]">{session.name}</p>
                {session.description && (
                  <p className="text-[#8a7b60] dark:text-gray-400 text-base font-normal leading-normal">{session.description}</p>
                )}
              </div>

              <div className="space-y-3">
                {/* Frequency */}
                <div className="flex items-center gap-4 px-0 min-h-14 justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-[#181511] dark:text-gray-200 flex items-center justify-center rounded-lg bg-[#f5f3f0] dark:bg-background-dark/50 shrink-0 size-10">
                      <span className="material-symbols-outlined">repeat</span>
                    </div>
                    <p className="text-[#181511] dark:text-gray-200 text-base font-medium leading-normal flex-1 truncate">Frequency</p>
                  </div>
                  <div className="shrink-0">
                    <p className="text-[#181511] dark:text-gray-200 text-base font-normal leading-normal">{formatFrequency(session.frequency)}</p>
                  </div>
                </div>

                {/* Date */}
                <div className="flex items-center gap-4 px-0 min-h-14 justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-[#181511] dark:text-gray-200 flex items-center justify-center rounded-lg bg-[#f5f3f0] dark:bg-background-dark/50 shrink-0 size-10">
                      <span className="material-symbols-outlined">calendar_month</span>
                    </div>
                    <p className="text-[#181511] dark:text-gray-200 text-base font-medium leading-normal flex-1 truncate">Date</p>
                  </div>
                  <div className="shrink-0">
                    <p className="text-[#181511] dark:text-gray-200 text-base font-normal leading-normal">
                      {session.endDate ? `${formatDate(session.startDate)} - ${formatDate(session.endDate)}` : formatDate(session.startDate)}
                    </p>
                  </div>
                </div>

                {/* Time */}
                <div className="flex items-center gap-4 px-0 min-h-14 justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-[#181511] dark:text-gray-200 flex items-center justify-center rounded-lg bg-[#f5f3f0] dark:bg-background-dark/50 shrink-0 size-10">
                      <span className="material-symbols-outlined">schedule</span>
                    </div>
                    <p className="text-[#181511] dark:text-gray-200 text-base font-medium leading-normal flex-1 truncate">Time</p>
                  </div>
                  <div className="shrink-0">
                    <p className="text-[#181511] dark:text-gray-200 text-base font-normal leading-normal">
                      {formatTime(session.startTime)} - {formatTime(session.endTime)}
                    </p>
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-start gap-4 px-0 min-h-14">
                  <div className="flex items-center gap-4">
                    <div className="text-[#181511] dark:text-gray-200 flex items-center justify-center rounded-lg bg-[#f5f3f0] dark:bg-background-dark/50 shrink-0 size-10 mt-1">
                      <span className="material-symbols-outlined">location_on</span>
                    </div>
                  </div>
                  <div className="flex flex-col flex-1">
                    <div className="flex justify-between w-full">
                      <p className="text-[#181511] dark:text-gray-200 text-base font-medium leading-normal truncate">Location Type</p>
                      <p className="text-[#181511] dark:text-gray-200 text-base font-normal leading-normal">{session.locationType}</p>
                    </div>
                    {session.physicalLocation && (
                      <p className="text-[#181511] dark:text-gray-200 text-sm font-normal leading-normal mt-1">{session.physicalLocation}</p>
                    )}
                    {session.virtualLocation && (
                      <a
                        className="text-blue-500 hover:underline flex items-center mt-1 text-sm"
                        href={session.virtualLocation}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span className="material-symbols-outlined text-sm mr-1">link</span>
                        Virtual Meeting Link
                      </a>
                    )}
                  </div>
                </div>

                {/* Assigned Users */}
                {session.assignedUsers && Array.isArray(session.assignedUsers) && session.assignedUsers.length > 0 && (
                  <div className="flex items-center gap-4 px-0 min-h-14 justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-[#181511] dark:text-gray-200 flex items-center justify-center rounded-lg bg-[#f5f3f0] dark:bg-background-dark/50 shrink-0 size-10">
                        <span className="material-symbols-outlined">group</span>
                      </div>
                      <p className="text-[#181511] dark:text-gray-200 text-base font-medium leading-normal flex-1 truncate">Assigned Users</p>
                    </div>
                    <div className="shrink-0">
                      <p className="text-[#181511] dark:text-gray-200 text-base font-normal leading-normal">{session.assignedUsers.length} user(s)</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Column 2: QR Code */}
            <div className="bg-white dark:bg-[#2a2418] rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 sm:p-8 flex flex-col items-center justify-between text-center">
              <div className="w-full">
                <h2 className="text-xl font-semibold text-[#181511] dark:text-white mb-6">Scan this code for attendance</h2>
                <div className="w-64 h-64 sm:w-80 sm:h-80 border border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-center p-4 mx-auto bg-gray-50 dark:bg-background-dark">
                  <QRCodeSVG
                    value={qrValue}
                    size={256}
                    level={'H'}
                    includeMargin={true}
                  />
                </div>
              </div>
              <footer className="mt-6 w-full">
                <span className="inline-block bg-gray-100 dark:bg-background-dark text-[#181511] dark:text-gray-300 px-3 py-1 rounded-md font-mono text-sm mb-3">
                  Session ID: {qrValue}
                </span>
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                  Point the End User's camera at this code to mark attendance.
                </p>
              </footer>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default SessionDetails;

