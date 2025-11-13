import { Router } from 'express';
import { check } from 'express-validator';
import { registerSuperAdmin, login } from '../controllers/authController';

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

export default router;

