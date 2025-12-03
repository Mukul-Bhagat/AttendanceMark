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

    // Validate and parse dates - HTML date inputs send YYYY-MM-DD format
    let start: Date;
    let end: Date;
    
    try {
      // HTML date inputs send dates in YYYY-MM-DD format
      // Parse directly - JavaScript Date constructor handles YYYY-MM-DD correctly
      start = new Date(startDate);
      end = new Date(endDate);
      
      // Validate the dates are valid
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        console.error('Invalid date format received:', { startDate, endDate });
        return res.status(400).json({ 
          msg: 'Invalid date format. Please use YYYY-MM-DD format.',
          received: { startDate, endDate }
        });
      }
    } catch (parseErr: any) {
      console.error('Date parsing error:', parseErr);
      return res.status(400).json({ 
        msg: 'Invalid date format. Please use YYYY-MM-DD format.',
        error: parseErr?.message 
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if dates are valid
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ msg: 'Invalid date format. Please use YYYY-MM-DD format.' });
    }

    // Normalize dates to start of day for accurate comparison
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

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

    // Validate daysCount
    if (daysCount <= 0) {
      return res.status(400).json({ msg: 'Invalid date range. End date must be after or equal to start date.' });
    }

    // Get the organization-specific LeaveRequest model
    const LeaveRequestCollection = createLeaveRequestModel(`${collectionPrefix}_leave_requests`);

    // Convert userId to ObjectId
    let userIdObjectId: Types.ObjectId;
    try {
      userIdObjectId = new Types.ObjectId(userId.toString());
    } catch (err: any) {
      console.error('Invalid userId format:', userId);
      return res.status(400).json({ msg: 'Invalid user ID format' });
    }

    // Create new leave request
    const leaveRequest = new LeaveRequestCollection({
      userId: userIdObjectId,
      leaveType,
      startDate: start,
      endDate: end,
      daysCount,
      reason: reason.trim(),
      status: 'Pending',
      organizationPrefix: collectionPrefix,
    });

    await leaveRequest.save();

    // Manually populate user details for response (can't use Mongoose populate with org-specific collections)
    const UserCollection = createUserModel(`${collectionPrefix}_users`);
    const user = await UserCollection.findById(userIdObjectId)
      .select('email profile.firstName profile.lastName')
      .lean();

    const leaveRequestObj = leaveRequest.toObject();
    if (user) {
      leaveRequestObj.userId = {
        _id: user._id,
        email: user.email,
        profile: user.profile,
      };
    }

    res.status(201).json({
      msg: 'Leave request submitted successfully',
      leaveRequest: leaveRequestObj,
    });
  } catch (err: any) {
    console.error('Error in applyLeave:', {
      message: err?.message || 'Unknown error',
      stack: err?.stack,
      body: req.body,
    });
    res.status(500).json({ 
      msg: 'Server error while applying for leave', 
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
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

    // Convert userId to ObjectId for proper query
    const userIdObjectId = new Types.ObjectId(userId.toString());

    // Find all leave requests for this user, sorted by createdAt (newest first)
    // Mongoose will return empty array if collection doesn't exist
    const leaveRequests = await LeaveRequestCollection.find({ userId: userIdObjectId })
      .sort({ createdAt: -1 })
      .lean();

    // Manually populate approvedBy user data
    const UserCollection = createUserModel(`${collectionPrefix}_users`);
    const populatedLeaves = await Promise.all(
      (leaveRequests || []).map(async (leave: any) => {
        if (leave.approvedBy) {
          try {
            const approver = await UserCollection.findById(leave.approvedBy)
              .select('email profile.firstName profile.lastName')
              .lean();
            if (approver) {
              leave.approvedBy = {
                _id: approver._id,
                email: approver.email,
                profile: approver.profile,
              };
            }
          } catch (err) {
            console.error('Error populating approvedBy:', err);
          }
        }
        return leave;
      })
    );

    res.json(populatedLeaves);
  } catch (err: any) {
    console.error('Error in getMyLeaves:', {
      message: err?.message || 'Unknown error',
      stack: err?.stack,
      collectionPrefix: req.user?.collectionPrefix,
      userId: req.user?.id,
    });
    res.status(500).json({ 
      msg: 'Server error while fetching leaves', 
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
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
      // Convert userId to ObjectId if provided
      try {
        filter.userId = new Types.ObjectId(userId as string);
      } catch (err) {
        return res.status(400).json({ msg: 'Invalid userId format' });
      }
    }

    // Get the organization-specific LeaveRequest model
    const LeaveRequestCollection = createLeaveRequestModel(`${collectionPrefix}_leave_requests`);

    // Find all leave requests matching the filter, sorted by createdAt (newest first)
    // Mongoose will return empty array if collection doesn't exist
    const leaveRequests = await LeaveRequestCollection.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    // Manually populate userId and approvedBy user data
    const UserCollection = createUserModel(`${collectionPrefix}_users`);
    const populatedLeaves = await Promise.all(
      (leaveRequests || []).map(async (leave: any) => {
        // Populate userId
        if (leave.userId) {
          try {
            const user = await UserCollection.findById(leave.userId)
              .select('email profile.firstName profile.lastName')
              .lean();
            if (user) {
              leave.userId = {
                _id: user._id,
                email: user.email,
                profile: user.profile,
              };
            }
          } catch (err) {
            console.error('Error populating userId:', err);
          }
        }

        // Populate approvedBy
        if (leave.approvedBy) {
          try {
            const approver = await UserCollection.findById(leave.approvedBy)
              .select('email profile.firstName profile.lastName')
              .lean();
            if (approver) {
              leave.approvedBy = {
                _id: approver._id,
                email: approver.email,
                profile: approver.profile,
              };
            }
          } catch (err) {
            console.error('Error populating approvedBy:', err);
          }
        }

        return leave;
      })
    );

    res.json(populatedLeaves);
  } catch (err: any) {
    console.error('Error in getOrganizationLeaves:', {
      message: err?.message || 'Unknown error',
      stack: err?.stack,
      collectionPrefix: req.user?.collectionPrefix,
      role: req.user?.role,
    });
    res.status(500).json({ 
      msg: 'Server error while fetching organization leaves', 
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
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

    // Manually populate user details for response
    const UserCollection = createUserModel(`${collectionPrefix}_users`);
    const leaveRequestObj = leaveRequest.toObject();

    // Populate userId
    if (leaveRequestObj.userId) {
      try {
        const user = await UserCollection.findById(leaveRequestObj.userId)
          .select('email profile.firstName profile.lastName')
          .lean();
        if (user) {
          leaveRequestObj.userId = {
            _id: user._id,
            email: user.email,
            profile: user.profile,
          };
        }
      } catch (err) {
        console.error('Error populating userId:', err);
      }
    }

    // Populate approvedBy
    if (leaveRequestObj.approvedBy) {
      try {
        const approver = await UserCollection.findById(leaveRequestObj.approvedBy)
          .select('email profile.firstName profile.lastName')
          .lean();
        if (approver) {
          leaveRequestObj.approvedBy = {
            _id: approver._id,
            email: approver.email,
            profile: approver.profile,
          };
        }
      } catch (err) {
        console.error('Error populating approvedBy:', err);
      }
    }

    // TODO: When Approved, deduct from user's quota
    // This would require tracking leavesTaken in the User model
    // For now, we'll just save the leave request
    // Future enhancement: Add leavesTaken tracking to User model

    res.json({
      msg: `Leave request ${status.toLowerCase()} successfully`,
      leaveRequest: leaveRequestObj,
    });
  } catch (err: any) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

