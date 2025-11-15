import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../api';
import { getOrCreateDeviceId } from '../utils/deviceId';
import './ScanQR.css';

const ScanQR: React.FC = () => {
  const [message, setMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info' | ''>('');
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const qrCodeRegionId = 'qr-reader';

  useEffect(() => {
    // Start scanning when component mounts
    startScanning();

    // Cleanup: stop scanning when component unmounts
    return () => {
      stopScanning();
    };
  }, []);

  const startScanning = async () => {
    // Prevent starting if already scanning
    if (isScanning || scannerRef.current) {
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
          // QR code detected
          handleScan(decodedText);
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

  const handleScan = (sessionId: string) => {
    if (isProcessing || !sessionId) return;

    setIsProcessing(true);
    setMessageType('info');
    setMessage('QR Code detected! Getting your location...');

    // Stop scanning once QR code is detected
    stopScanning();

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
        setIsProcessing(false); // Allow retrying
        // Restart scanning
        startScanning();
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
      // isProcessing stays true to prevent re-scans
    } catch (err: any) {
      const errorMsg = err.response?.data?.msg || 'Failed to mark attendance';
      setMessageType('error');
      setMessage(`Error: ${errorMsg}`);
      setIsProcessing(false); // Allow retrying
      // Restart scanning after error
      setTimeout(() => {
        startScanning();
      }, 2000);
    }
  };

  const handleRetry = () => {
    setMessage('');
    setMessageType('');
    setIsProcessing(false);
    setCameraError(false);
    startScanning();
  };

  return (
    <div className="scan-qr-container">
      <h2>Scan Session QR Code</h2>
      <p>Point your camera at the QR code displayed by your admin.</p>

      {/* Show the scanner ONLY if we are not processing and haven't succeeded */}
      {messageType !== 'success' && !isProcessing && !cameraError && (
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

      {message && messageType !== 'info' && (
        <div className={`scan-message ${messageType}`}>
          {message}
          {messageType === 'error' && !isProcessing && (
            <button onClick={handleRetry} className="retry-button">
              Try Again
            </button>
          )}
        </div>
      )}

      {messageType === 'success' && (
        <div className="success-actions">
          <div className="success-icon">✓</div>
          <p className="success-note">Your attendance has been recorded successfully!</p>
          <button onClick={handleRetry} className="scan-another-button">
            Scan Another QR Code
          </button>
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

