import { Router } from 'express';
import { check } from 'express-validator';
import { protect } from '../middleware/authMiddleware';
import { registerSuperAdmin, login, getMe, forceResetPassword } from '../controllers/authController';

const router = Router();

// @route   POST /api/auth/register-super-admin
// @desc    Register a new Organization AND create its user table
// @access  Public
router.post(
  '/register-super-admin',
  [
    check('organizationName', 'Organization name is required').not().isEmpty(),
    check('firstName', 'First name is required').not().isEmpty(),
    check('lastName', 'Last name is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password must be 6 or more characters').isLength({ min: 6 }),
  ],
  registerSuperAdmin
);

// @route   POST /api/auth/login
// @desc    Login user - requires organizationName, email, and password
// @access  Public
router.post(
  '/login',
  [
    check('organizationName', 'Organization name is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists(),
  ],
  login
);

// @route   GET /api/auth/me
// @desc    Get the logged-in user's data from their token
// @access  Private
router.get('/me', protect, getMe);

// @route   POST /api/auth/force-reset-password
// @desc    Force password reset - requires old password and new password
// @access  Private
router.post(
  '/force-reset-password',
  protect,
  [
    check('oldPassword', 'Old password is required').exists(),
    check('newPassword', 'New password must be at least 6 characters').isLength({ min: 6 }),
  ],
  forceResetPassword
);

export default router;

