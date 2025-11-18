import { Router } from 'express';
import { check } from 'express-validator';
import { protect } from '../middleware/authMiddleware';
import { createSession, getSessions, getSessionById, updateSession } from '../controllers/sessionController';

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
    check('sessionType', 'Session type is required').optional().isIn(['PHYSICAL', 'REMOTE', 'HYBRID']),
  ],
  createSession
);

// @route   GET /api/sessions
// @desc    Get all sessions for the user's organization
// @access  Private
router.get('/', protect, getSessions);

// @route   GET /api/sessions/:id
// @desc    Get a single session by its ID
// @access  Private
router.get('/:id', protect, getSessionById);

// @route   PUT /api/sessions/:id
// @desc    Update a session (only SuperAdmin or assigned SessionAdmin)
// @access  Private
router.put(
  '/:id',
  protect,
  [
    check('name', 'Session name is required').optional().not().isEmpty(),
    check('frequency', 'Frequency is required').optional().isIn(['OneTime', 'Daily', 'Weekly', 'Monthly']),
    check('startDate', 'Start date is required').optional().not().isEmpty(),
    check('startTime', 'Start time is required').optional().matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
    check('endTime', 'End time is required').optional().matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
    check('locationType', 'Location type is required').optional().isIn(['Physical', 'Virtual', 'Hybrid']),
  ],
  updateSession
);

export default router;

