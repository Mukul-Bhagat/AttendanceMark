import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useSearchParams } from 'react-router-dom';
import api from '../api';
import { getOrCreateDeviceId } from '../utils/deviceId';
import './ScanQR.css';

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

  // Show PhonePe-style success screen
  if (isSuccess) {
    return (
      <div className="scan-qr-container">
        <div className="success-screen">
          <div className="checkmark-container">
            <svg className="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
              <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
              <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
            </svg>
          </div>
          <h2 className="success-title">Attendance Marked!</h2>
          <p className="success-message">{message}</p>
          <button onClick={handleRetry} className="scan-another-button">
            Scan Another QR Code
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="scan-qr-container">
      <h2>Scan Session QR Code</h2>
      {sessionInfo ? (
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#0369a1' }}>{sessionInfo.name}</h3>
          {sessionInfo.description && <p style={{ margin: '5px 0', color: '#64748b' }}>{sessionInfo.description}</p>}
          <p style={{ margin: '5px 0', fontSize: '0.9rem', color: '#64748b' }}>
            <strong>Time:</strong> {sessionInfo.startTime} - {sessionInfo.endTime}
          </p>
        </div>
      ) : null}
      <p>Point your camera at the QR code displayed by your admin.</p>

      {/* Show the scanner ONLY if we are not processing, haven't succeeded, and scanner is not paused */}
      {!isProcessing && !cameraError && !isScannerPaused && (
        <div className="qr-reader-wrapper">
          <div id={qrCodeRegionId}></div>
        </div>
      )}

      {/* Show loading indicator when processing */}
      {isProcessing && messageType === 'info' && (
        <div className="processing-indicator">
          <div className="spinner-small"></div>
          <p>{message}</p>
        </div>
      )}

      {message && messageType !== 'info' && messageType !== 'success' && (
        <div className={`scan-message ${messageType}`}>
          {message}
          {messageType === 'error' && (
            <button onClick={handleRetry} className="retry-button">
              Retry Scan
            </button>
          )}
        </div>
      )}

      {cameraError && (
        <div className="camera-help">
          <h3>Camera Access Help</h3>
          <ul>
            <li>Make sure you've granted camera permissions to this website</li>
            <li>Check your browser settings if the camera isn't working</li>
            <li>Try refreshing the page and allowing camera access when prompted</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default ScanQR;

