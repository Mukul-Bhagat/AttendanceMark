import { Router } from 'express';
import { check } from 'express-validator';
import { protect } from '../middleware/authMiddleware';
import {
  applyLeave,
  getMyLeaves,
  getOrganizationLeaves,
  updateLeaveStatus,
} from '../controllers/leaveController';

const router = Router();

// @route   POST /api/leaves
// @desc    Apply for leave
// @access  Private (All authenticated users)
router.post(
  '/',
  protect,
  [
    check('leaveType', 'Leave type is required').isIn(['Personal', 'Casual', 'Sick', 'Extra']),
    check('startDate', 'Start date is required').not().isEmpty(),
    check('endDate', 'End date is required').not().isEmpty(),
    check('reason', 'Reason is required').not().isEmpty().trim(),
  ],
  applyLeave
);

// @route   GET /api/leaves/my-leaves
// @desc    Get leave requests for the logged-in user
// @access  Private (All authenticated users)
router.get('/my-leaves', protect, getMyLeaves);

// @route   GET /api/leaves/organization
// @desc    Get all leave requests for the organization (for Admins/Staff)
// @access  Private (SuperAdmin, CompanyAdmin, Manager, SessionAdmin)
router.get('/organization', protect, getOrganizationLeaves);

// @route   PUT /api/leaves/:id/status
// @desc    Update leave request status (Approve/Reject)
// @access  Private (SuperAdmin, CompanyAdmin, Manager, SessionAdmin)
router.put(
  '/:id/status',
  protect,
  [
    check('status', 'Status is required').isIn(['Approved', 'Rejected']),
    check('rejectionReason', 'Rejection reason is required when status is Rejected')
      .optional()
      .custom((value, { req }) => {
        if (req.body.status === 'Rejected' && !value) {
          throw new Error('Rejection reason is required when rejecting a leave request');
        }
        return true;
      }),
  ],
  updateLeaveStatus
);

export default router;

