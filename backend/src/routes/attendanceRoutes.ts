import { Router } from 'express';
import { check } from 'express-validator';
import { protect } from '../middleware/authMiddleware';
import { markAttendance, getMyAttendance, getSessionAttendance, getUserAttendance } from '../controllers/attendanceController';

const router = Router();

// @route   POST /api/attendance/scan
// @desc    Mark attendance (handles geo-check and device-lock)
// @access  Private
router.post(
  '/scan',
  protect, // Must be logged in
  [
    check('sessionId', 'Session ID is required').not().isEmpty(),
    check('userLocation.latitude', 'User latitude is required').isNumeric(),
    check('userLocation.longitude', 'User longitude is required').isNumeric(),
    check('deviceId', 'Device ID is required').not().isEmpty(),
    check('userAgent', 'User Agent is required').not().isEmpty(),
  ],
  markAttendance
);

// @route   GET /api/attendance/me
// @desc    Get all attendance records for the logged-in user
// @access  Private
router.get('/me', protect, getMyAttendance);

// @route   GET /api/attendance/session/:id
// @desc    Get all attendance records for a specific session (with user data)
// @access  Private (Manager, SuperAdmin only)
router.get('/session/:id', protect, getSessionAttendance);

// @route   GET /api/attendance/user/:id
// @desc    Get all attendance records for a specific user (with session data)
// @access  Private (Manager, SuperAdmin only)
router.get('/user/:id', protect, getUserAttendance);

export default router;

