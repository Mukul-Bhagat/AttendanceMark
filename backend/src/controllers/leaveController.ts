import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { Types } from 'mongoose';
import createLeaveRequestModel from '../models/LeaveRequest';
import createUserModel from '../models/User';
import createOrganizationSettingsModel from '../models/OrganizationSettings';

// Helper function to calculate days between two dates (inclusive)
const calculateDaysCount = (startDate: Date, endDate: Date): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Set both dates to midnight for accurate day calculation
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  // Calculate difference in milliseconds
  const diffTime = end.getTime() - start.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  
  // Add 1 to include both start and end dates (inclusive)
  return diffDays + 1;
};

// @route   POST /api/leaves
// @desc    Apply for leave
// @access  Private (All authenticated users)
export const applyLeave = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { collectionPrefix, id: userId } = req.user!;
    const { leaveType, startDate, endDate, reason } = req.body;

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if dates are valid
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ msg: 'Invalid date format' });
    }

    // Check if start date is before end date
    if (start > end) {
      return res.status(400).json({ msg: 'Start date must be before or equal to end date' });
    }

    // Check if start date is in the past (optional validation - you may want to allow past dates)
    // Uncomment if you want to prevent past date leave applications
    // if (start < today) {
    //   return res.status(400).json({ msg: 'Cannot apply for leave with past dates' });
    // }

    // Calculate days count
    const daysCount = calculateDaysCount(start, end);

    // Get the organization-specific LeaveRequest model
    const LeaveRequestCollection = createLeaveRequestModel(`${collectionPrefix}_leave_requests`);

    // Create new leave request
    const leaveRequest = new LeaveRequestCollection({
      userId,
      leaveType,
      startDate: start,
      endDate: end,
      daysCount,
      reason,
      status: 'Pending',
      organizationPrefix: collectionPrefix,
    });

    await leaveRequest.save();

    // Populate user details for response
    await leaveRequest.populate('userId', 'email profile.firstName profile.lastName');

    res.status(201).json({
      msg: 'Leave request submitted successfully',
      leaveRequest,
    });
  } catch (err: any) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

// @route   GET /api/leaves/my-leaves
// @desc    Get leave requests for the logged-in user
// @access  Private (All authenticated users)
export const getMyLeaves = async (req: Request, res: Response) => {
  try {
    const { collectionPrefix, id: userId } = req.user!;

    // Get the organization-specific LeaveRequest model
    const LeaveRequestCollection = createLeaveRequestModel(`${collectionPrefix}_leave_requests`);

    // Find all leave requests for this user, sorted by createdAt (newest first)
    const leaveRequests = await LeaveRequestCollection.find({ userId })
      .populate('approvedBy', 'email profile.firstName profile.lastName')
      .sort({ createdAt: -1 });

    res.json(leaveRequests);
  } catch (err: any) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

// @route   GET /api/leaves/organization
// @desc    Get all leave requests for the organization (for Admins/Staff)
// @access  Private (SuperAdmin, CompanyAdmin, Manager, SessionAdmin)
export const getOrganizationLeaves = async (req: Request, res: Response) => {
  try {
    const { collectionPrefix, role } = req.user!;

    // Only Admins and Staff can view all leaves
    const allowedRoles = ['SuperAdmin', 'CompanyAdmin', 'Manager', 'SessionAdmin'];
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ msg: 'Not authorized to view organization leaves' });
    }

    // Get query parameters for filtering
    const { status, leaveType, userId } = req.query;

    // Build filter object
    const filter: any = { organizationPrefix: collectionPrefix };
    if (status) {
      filter.status = status;
    }
    if (leaveType) {
      filter.leaveType = leaveType;
    }
    if (userId) {
      filter.userId = userId;
    }

    // Get the organization-specific LeaveRequest model
    const LeaveRequestCollection = createLeaveRequestModel(`${collectionPrefix}_leave_requests`);

    // Find all leave requests matching the filter, sorted by createdAt (newest first)
    const leaveRequests = await LeaveRequestCollection.find(filter)
      .populate('userId', 'email profile.firstName profile.lastName')
      .populate('approvedBy', 'email profile.firstName profile.lastName')
      .sort({ createdAt: -1 });

    res.json(leaveRequests);
  } catch (err: any) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

// @route   PUT /api/leaves/:id/status
// @desc    Update leave request status (Approve/Reject)
// @access  Private (SuperAdmin, CompanyAdmin, Manager, SessionAdmin)
export const updateLeaveStatus = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { collectionPrefix, id: approverId, role } = req.user!;
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    // Only Admins and Staff can approve/reject leaves
    const allowedRoles = ['SuperAdmin', 'CompanyAdmin', 'Manager', 'SessionAdmin'];
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ msg: 'Not authorized to update leave status' });
    }

    // Validate status
    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ msg: 'Status must be either "Approved" or "Rejected"' });
    }

    // If rejected, rejectionReason is required
    if (status === 'Rejected' && !rejectionReason) {
      return res.status(400).json({ msg: 'Rejection reason is required when rejecting a leave request' });
    }

    // Get the organization-specific LeaveRequest model
    const LeaveRequestCollection = createLeaveRequestModel(`${collectionPrefix}_leave_requests`);

    // Find the leave request
    const leaveRequest = await LeaveRequestCollection.findById(id);

    if (!leaveRequest) {
      return res.status(404).json({ msg: 'Leave request not found' });
    }

    // Check if leave request belongs to the same organization
    if (leaveRequest.organizationPrefix !== collectionPrefix) {
      return res.status(403).json({ msg: 'Not authorized to update this leave request' });
    }

    // Check if already processed
    if (leaveRequest.status !== 'Pending') {
      return res.status(400).json({ msg: `Leave request has already been ${leaveRequest.status.toLowerCase()}` });
    }

    // Update leave request status
    leaveRequest.status = status;
    leaveRequest.approvedBy = new Types.ObjectId(approverId);
    if (status === 'Rejected' && rejectionReason) {
      leaveRequest.rejectionReason = rejectionReason;
    }

    await leaveRequest.save();

    // Populate user details for response
    await leaveRequest.populate('userId', 'email profile.firstName profile.lastName');
    await leaveRequest.populate('approvedBy', 'email profile.firstName profile.lastName');

    // TODO: When Approved, deduct from user's quota
    // This would require tracking leavesTaken in the User model
    // For now, we'll just save the leave request
    // Future enhancement: Add leavesTaken tracking to User model

    res.json({
      msg: `Leave request ${status.toLowerCase()} successfully`,
      leaveRequest,
    });
  } catch (err: any) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

