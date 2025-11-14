import { Router } from 'express';
import { check } from 'express-validator';
import { protect } from '../middleware/authMiddleware';
import { getOrganizationUsers, createStaff } from '../controllers/userController';

const router = Router();

// @route   GET /api/users/my-organization
// @desc    Get all users in the token's organization
// @access  Private
router.get('/my-organization', protect, getOrganizationUsers);

// @route   POST /api/users/staff
// @desc    Create a new staff member (Manager or SessionAdmin) - Only SuperAdmin
// @access  Private (SuperAdmin only)
router.post(
  '/staff',
  protect,
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password must be at least 6 characters').isLength({ min: 6 }),
    check('role', 'Role is required').isIn(['Manager', 'SessionAdmin']),
    check('firstName', 'First name is required').not().isEmpty(),
    check('lastName', 'Last name is required').not().isEmpty(),
    check('phone', 'Phone must be a valid phone number').optional().isMobilePhone(),
  ],
  createStaff
);

export default router;

