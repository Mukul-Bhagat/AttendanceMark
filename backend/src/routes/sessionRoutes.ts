import { Router } from 'express';
import { check } from 'express-validator';
import { protect } from '../middleware/authMiddleware';
import { createSession } from '../controllers/sessionController';

const router = Router();

// @route   POST /api/sessions
// @desc    Create a new session
// @access  Private
router.post(
  '/',
  protect,
  [
    check('name', 'Session name is required').not().isEmpty(),
    check('frequency', 'Frequency is required').isIn(['OneTime', 'Daily', 'Weekly', 'Monthly']),
    check('startDate', 'Start date is required').not().isEmpty(),
    check('startTime', 'Start time is required').matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
    check('endTime', 'End time is required').matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
    check('locationType', 'Location type is required').isIn(['Physical', 'Virtual', 'Hybrid']),
  ],
  createSession
);

export default router;

