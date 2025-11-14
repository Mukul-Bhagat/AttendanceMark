import { Router } from 'express';
import { check } from 'express-validator';
import { protect } from '../middleware/authMiddleware';
import { markAttendance } from '../controllers/attendanceController';

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
  ],
  markAttendance
);

export default router;

