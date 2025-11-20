import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useSearchParams } from 'react-router-dom';
import api from '../api';
import { getOrCreateDeviceId } from '../utils/deviceId';
import { RefreshCw } from 'lucide-react';

const ScanQR: React.FC = () => {
  const [searchParams] = useSearchParams();
  const sessionIdFromUrl = searchParams.get('sessionId');
  
  const [message, setMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info' | ''>('');
  const [isScanning, setIsScanning] = useState(false);
  const [isScannerPaused, setIsScannerPaused] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const qrCodeRegionId = 'qr-reader';

  // Fetch session info if sessionId is provided in URL
  useEffect(() => {
    const fetchSessionInfo = async () => {
      if (sessionIdFromUrl) {
        try {
          const { data } = await api.get(`/api/sessions/${sessionIdFromUrl}`);
          setSessionInfo(data);
        } catch (err) {
          console.error('Failed to fetch session info:', err);
        }
      }
    };

    fetchSessionInfo();
  }, [sessionIdFromUrl]);

  useEffect(() => {
    // Start scanning when component mounts
    startScanning();

    // Cleanup: stop scanning when component unmounts
    return () => {
      stopScanning();
    };
  }, []);

  const startScanning = async () => {
    // Prevent starting if already scanning or if scanner is paused
    if (isScanning || scannerRef.current || isScannerPaused) {
      return;
    }

    try {
      setCameraError(false);
      setMessageType('info');
      setMessage('Starting camera...');
      
      const html5QrCode = new Html5Qrcode(qrCodeRegionId);
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' }, // Use back camera
        {
          fps: 10, // Frames per second
          qrbox: { width: 250, height: 250 }, // Scanning box size
        },
        (decodedText) => {
          // QR code detected - only process if scanner is not paused
          if (!isScannerPaused && !isProcessing) {
            handleScan(decodedText);
          }
        },
        (_errorMessage) => {
          // Error handling is done in onScanFailure callback
          // We don't need to show every error, just log it
          // Prefix with underscore to indicate intentionally unused
        }
      );

      setIsScanning(true);
      setMessage('');
      setMessageType('');
    } catch (err: any) {
      setCameraError(true);
      setMessageType('error');
      const errorMsg = err.message || 'Please allow camera access';
      setMessage(`Failed to start camera: ${errorMsg}. Please check your browser permissions.`);
      console.error('Error starting QR scanner:', err);
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        const scanner = scannerRef.current;
        // Try to stop the scanner if it's running
        try {
          await scanner.stop();
        } catch (stopErr) {
          // Scanner might already be stopped, ignore this error
        }
        // Clear the scanner
        await scanner.clear();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      } finally {
        scannerRef.current = null;
        setIsScanning(false);
      }
    }
  };

  const handleScan = async (scannedSessionId: string) => {
    if (isProcessing || !scannedSessionId || isScannerPaused) return;

    // PAUSE SCANNER IMMEDIATELY to prevent multiple scans
    setIsScannerPaused(true);
    
    // Stop scanning immediately
    await stopScanning();

    // If sessionId was provided in URL, validate that scanned QR matches it
    if (sessionIdFromUrl && scannedSessionId !== sessionIdFromUrl) {
      setMessageType('error');
      setMessage('QR code does not match the selected session. Please scan the correct QR code.');
      setIsProcessing(false);
      // Don't auto-restart - wait for user to click retry
      return;
    }

    // Use sessionId from URL if available, otherwise use scanned sessionId
    const sessionId = sessionIdFromUrl || scannedSessionId;

    setIsProcessing(true);
    setMessageType('info');
    setMessage('QR Code detected! Getting your location...');

    // 1. Get User's Geolocation
    navigator.geolocation.getCurrentPosition(
      (position) => {
        // 2. Location successful
        setMessageType('info');
        setMessage('Location found. Verifying attendance...');
        const userLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        // 3. Get the unique device ID
        const deviceId = getOrCreateDeviceId();

        // 4. Call the backend API
        markAttendance(sessionId, userLocation, deviceId);
      },
      (error) => {
        // 2. Location failed
        setMessageType('error');
        setMessage(`Error: Could not get location. Please enable GPS. (${error.message})`);
        setIsProcessing(false);
        // Don't auto-restart - wait for user to click retry
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // This function sends all data to our backend
  const markAttendance = async (sessionId: string, userLocation: any, deviceId: string) => {
    try {
      const { data } = await api.post('/api/attendance/scan', {
        sessionId,
        userLocation,
        deviceId, // Send the device "fingerprint"
      });

      setMessageType('success');
      setMessage(data.msg || 'Attendance marked successfully!');
      setIsSuccess(true);
      setIsProcessing(false);
      // Scanner stays paused - user must click "Scan Another" to continue
    } catch (err: any) {
      // Extract the exact error message from backend
      const errorMsg = err.response?.data?.msg || err.response?.data?.errors?.[0]?.msg || 'Failed to mark attendance';
      setMessageType('error');
      setMessage(errorMsg); // Show the exact backend error message
      setIsProcessing(false);
      // Don't auto-restart - wait for user to click retry
    }
  };

  const handleRetry = async () => {
    // Reset all state
    setMessage('');
    setMessageType('');
    setIsProcessing(false);
    setCameraError(false);
    setIsSuccess(false);
    setIsScannerPaused(false); // Unpause scanner
    
    // Stop any existing scanner
    await stopScanning();
    
    // Small delay to ensure cleanup, then restart
    setTimeout(() => {
      startScanning();
    }, 100);
  };

  // Success State
  if (isSuccess) {
    return (
      <div className="group/design-root relative flex min-h-screen w-full flex-col bg-background-light dark:bg-background-dark">
        <div className="layout-container flex h-full grow flex-col">
          <div className="flex flex-1 items-center justify-center bg-background-light p-4 dark:bg-background-dark">
            <div className="flex w-full max-w-sm flex-col items-center gap-6 rounded-xl bg-white p-8 text-center shadow-lg dark:bg-gray-800">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50">
                <span className="material-symbols-outlined text-green-600 dark:text-green-400" style={{ fontSize: '40px' }}>check</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <p className="text-lg font-bold leading-tight tracking-[-0.015em] text-[#181511] dark:text-white">Attendance Marked!</p>
                {message && (
                  <p className="text-sm font-normal leading-normal text-[#8a7b60] dark:text-gray-400">{message}</p>
                )}
              </div>
              <button
                onClick={handleRetry}
                className="flex h-10 min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl bg-primary px-4 text-sm font-bold leading-normal tracking-[0.015em] text-white hover:bg-[#d63a25] transition-colors"
              >
                <span className="truncate">Scan Another QR Code</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error State (non-camera errors)
  if (messageType === 'error' && !cameraError) {
    return (
      <div className="group/design-root relative flex min-h-screen w-full flex-col bg-background-light dark:bg-background-dark">
        <div className="layout-container flex h-full grow flex-col">
          <div className="flex flex-1 items-center justify-center bg-background-light p-4 dark:bg-background-dark">
            <div className="flex w-full max-w-sm flex-col items-center gap-6 rounded-xl bg-white p-8 text-center shadow-lg dark:bg-gray-800">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
                <span className="material-symbols-outlined text-red-600 dark:text-red-400" style={{ fontSize: '40px' }}>close</span>
              </div>
              <div className="flex max-w-[480px] flex-col items-center gap-2">
                <p className="text-lg font-bold leading-tight tracking-[-0.015em] text-[#181511] dark:text-white">Scan Failed</p>
                <p className="text-sm font-normal leading-normal text-[#181511] dark:text-gray-300">{message || 'Invalid QR code. Please try again.'}</p>
              </div>
              <button
                onClick={handleRetry}
                className="flex h-10 min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-xl bg-primary px-4 text-sm font-bold leading-normal tracking-[0.015em] text-white hover:bg-[#d63a25] transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
                <span className="truncate">Retry Scan</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Camera Error State
  if (cameraError) {
    return (
      <div className="group/design-root relative flex min-h-screen w-full flex-col bg-background-light dark:bg-background-dark">
        <div className="layout-container flex h-full grow flex-col">
          <div className="flex flex-1 items-center justify-center bg-background-light p-4 dark:bg-background-dark">
            <div className="flex w-full max-w-sm flex-col items-center gap-6 rounded-xl bg-white p-8 text-center shadow-lg dark:bg-gray-800">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
                <span className="material-symbols-outlined text-red-600 dark:text-red-400" style={{ fontSize: '40px' }}>camera_alt</span>
              </div>
              <div className="flex max-w-[480px] flex-col items-center gap-2">
                <p className="text-lg font-bold leading-tight tracking-[-0.015em] text-[#181511] dark:text-white">Camera Access Required</p>
                <p className="text-sm font-normal leading-normal text-[#181511] dark:text-gray-300">{message || 'Please allow camera access to scan QR codes.'}</p>
                <div className="mt-4 text-left w-full">
                  <p className="text-xs font-semibold text-[#181511] dark:text-white mb-2">Camera Access Help:</p>
                  <ul className="text-xs text-[#8a7b60] dark:text-gray-400 space-y-1 list-disc list-inside">
                    <li>Make sure you've granted camera permissions to this website</li>
                    <li>Check your browser settings if the camera isn't working</li>
                    <li>Try refreshing the page and allowing camera access when prompted</li>
                  </ul>
                </div>
              </div>
              <button
                onClick={handleRetry}
                className="flex h-10 min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-xl bg-primary px-4 text-sm font-bold leading-normal tracking-[0.015em] text-white hover:bg-[#d63a25] transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
                <span className="truncate">Retry</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main Scanner View
  return (
    <div className="group/design-root relative flex min-h-screen w-full flex-col bg-background-light dark:bg-background-dark">
      <div className="layout-container flex h-full grow flex-col">
        {/* QR Scanner Active State */}
        <div className="flex flex-1 flex-col bg-[#0f172a]">
          <header className="absolute top-0 z-10 flex w-full justify-center p-6">
            <h1 className="text-2xl font-bold text-white">Scan Session QR</h1>
          </header>

          {/* Session Info Banner (if available) */}
          {sessionInfo && (
            <div className="absolute top-20 left-0 right-0 z-10 mx-4">
              <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-white/20 rounded-lg p-4 shadow-lg">
                <h3 className="font-semibold text-sm mb-1 text-[#181511] dark:text-white">{sessionInfo.name}</h3>
                {sessionInfo.description && (
                  <p className="text-xs text-[#8a7b60] dark:text-gray-300 mb-1">{sessionInfo.description}</p>
                )}
                <p className="text-xs text-[#8a7b60] dark:text-gray-300">
                  <strong>Time:</strong> {sessionInfo.startTime} - {sessionInfo.endTime}
                </p>
              </div>
            </div>
          )}

          <main className="flex flex-1 items-center justify-center">
            <div className="relative flex h-80 w-80 items-center justify-center sm:h-96 sm:w-96">
              {/* Corner Borders */}
              <span className="absolute left-0 top-0 h-8 w-8 rounded-tl-lg border-l-4 border-t-4 border-primary"></span>
              <span className="absolute right-0 top-0 h-8 w-8 rounded-tr-lg border-r-4 border-t-4 border-primary"></span>
              <span className="absolute bottom-0 left-0 h-8 w-8 rounded-bl-lg border-b-4 border-l-4 border-primary"></span>
              <span className="absolute bottom-0 right-0 h-8 w-8 rounded-br-lg border-b-4 border-r-4 border-primary"></span>

              {/* Scanner Viewport */}
              <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-lg">
                {/* Show scanner if not processing and not paused */}
                {!isProcessing && !isScannerPaused ? (
                  <div id={qrCodeRegionId} className="h-full w-full"></div>
                ) : (
                  /* Show placeholder when processing or paused */
                  <div className="flex flex-col items-center justify-center gap-4">
                    {isProcessing && messageType === 'info' ? (
                      <>
                        <svg className="animate-spin h-12 w-12 text-primary" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"></path>
                        </svg>
                        <p className="text-white text-sm font-medium">{message || 'Processing...'}</p>
                      </>
                    ) : (
                      <span className="material-symbols-outlined text-primary" style={{ fontSize: '64px' }}>qr_code_scanner</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </main>

          <footer className="absolute bottom-0 w-full rounded-t-3xl bg-white p-6 text-center shadow-lg dark:bg-background-dark">
            {isProcessing && messageType === 'info' ? (
              <p className="text-lg font-semibold text-[#181511] dark:text-white">{message || 'Processing...'}</p>
            ) : (
              <p className="text-lg font-semibold text-[#181511] dark:text-white">
                {message || 'Searching for QR code...'}
              </p>
            )}
          </footer>
        </div>
      </div>
    </div>
  );
};

export default ScanQR;

