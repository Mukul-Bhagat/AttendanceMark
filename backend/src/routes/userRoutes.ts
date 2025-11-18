import { Router } from 'express';
import { check } from 'express-validator';
import { protect } from '../middleware/authMiddleware';
import { getOrganizationUsers, createStaff, createEndUser, resetDevice, deleteUser } from '../controllers/userController';

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
    check('phone', 'Phone must be a valid phone number').optional().isMobilePhone('any'),
  ],
  createStaff
);

// @route   POST /api/users/end-user
// @desc    Create a new EndUser
// @access  Private (SuperAdmin or CompanyAdmin)
router.post(
  '/end-user',
  protect,
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password must be at least 6 characters').isLength({ min: 6 }),
    check('firstName', 'First name is required').not().isEmpty(),
    check('lastName', 'Last name is required').not().isEmpty(),
    check('phone', 'Phone must be a valid phone number').optional().isMobilePhone('any'),
  ],
  createEndUser
);

// @route   PUT /api/users/:userId/reset-device
// @desc    Reset a user's registered device ID
// @access  Private (SuperAdmin or CompanyAdmin)
router.put('/:userId/reset-device', protect, resetDevice);

// @route   DELETE /api/users/:userId
// @desc    Delete a user account - Only SuperAdmin
// @access  Private (SuperAdmin only)
router.delete('/:userId', protect, deleteUser);

export default router;

