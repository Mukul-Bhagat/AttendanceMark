import { Router } from 'express';
import { check } from 'express-validator';
import { protect } from '../middleware/authMiddleware';
import { getOrganizationUsers, createStaff, createEndUser, resetDevice, deleteUser, uploadProfilePicture, updateProfile, changePassword, removeProfilePicture, bulkCreateUsers, bulkCreateStaff, updateUserQuota } from '../controllers/userController';
import { upload } from '../middleware/uploadMiddleware';

const router = Router();

// @route   GET /api/users/my-organization
// @desc    Get all users in the token's organization
// @access  Private
router.get('/my-organization', protect, getOrganizationUsers);

// @route   POST /api/users/profile-picture
// @desc    Upload profile picture
// @access  Private
router.post('/profile-picture', protect, upload.single('profilePicture'), uploadProfilePicture);

// @route   DELETE /api/users/profile-picture
// @desc    Remove profile picture
// @access  Private
router.delete('/profile-picture', protect, removeProfilePicture);

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put(
  '/profile',
  protect,
  [
    check('firstName', 'First name is required').optional().not().isEmpty(),
    check('lastName', 'Last name is required').optional().not().isEmpty(),
    check('phone', 'Phone must be a valid phone number').optional().isMobilePhone('any'),
  ],
  updateProfile
);

// @route   PUT /api/users/change-password
// @desc    Change user password
// @access  Private
router.put(
  '/change-password',
  protect,
  [
    check('oldPassword', 'Current password is required').not().isEmpty(),
    check('newPassword', 'New password must be at least 6 characters').isLength({ min: 6 }),
  ],
  changePassword
);

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

// @route   POST /api/users/bulk
// @desc    Bulk create EndUsers from CSV data
// @access  Private (SuperAdmin or CompanyAdmin)
router.post(
  '/bulk',
  protect,
  [
    check('users', 'Users array is required').isArray(),
    // temporaryPassword is optional if useRandomPassword is true
    check('temporaryPassword')
      .optional()
      .custom((value, { req }) => {
        if (req.body.useRandomPassword === true) {
          return true; // Skip validation if useRandomPassword is true
        }
        if (!value || value.length < 6) {
          throw new Error('Temporary password is required and must be at least 6 characters when not using random passwords');
        }
        return true;
      }),
  ],
  bulkCreateUsers
);

// @route   POST /api/users/staff/bulk
// @desc    Bulk create Staff members (Manager or SessionAdmin) from CSV data
// @access  Private (SuperAdmin only)
router.post(
  '/staff/bulk',
  protect,
  [
    check('staff', 'Staff array is required').isArray(),
    // temporaryPassword is optional if useRandomPassword is true
    check('temporaryPassword')
      .optional()
      .custom((value, { req }) => {
        if (req.body.useRandomPassword === true) {
          return true; // Skip validation if useRandomPassword is true
        }
        if (!value || value.length < 6) {
          throw new Error('Temporary password is required and must be at least 6 characters when not using random passwords');
        }
        return true;
      }),
  ],
  bulkCreateStaff
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

// @route   PUT /api/users/:userId/quota
// @desc    Update a user's custom leave quota
// @access  Private (SuperAdmin or CompanyAdmin)
router.put(
  '/:userId/quota',
  protect,
  [
    check('pl', 'PL must be a non-negative number').optional().isFloat({ min: 0 }),
    check('cl', 'CL must be a non-negative number').optional().isFloat({ min: 0 }),
    check('sl', 'SL must be a non-negative number').optional().isFloat({ min: 0 }),
    check('resetToDefault', 'resetToDefault must be a boolean').optional().isBoolean(),
  ],
  updateUserQuota
);

// @route   DELETE /api/users/:userId
// @desc    Delete a user account - Only SuperAdmin
// @access  Private (SuperAdmin only)
router.delete('/:userId', protect, deleteUser);

export default router;

