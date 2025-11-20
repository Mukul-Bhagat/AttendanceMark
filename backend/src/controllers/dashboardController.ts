import { Request, Response } from 'express';
import createClassBatchModel from '../models/ClassBatch';
import createSessionModel from '../models/Session';
import createUserModel from '../models/User';
import createAttendanceModel from '../models/Attendance';

// @route   GET /api/dashboard/stats
// @desc    Get dashboard statistics for the logged-in user's organization
// @access  Private
export const getDashboardStats = async (req: Request, res: Response) => {
  const { collectionPrefix, organizationName } = req.user!;

  try {
    // Get organization-specific models
    const ClassBatchCollection = createClassBatchModel(`${collectionPrefix}_classbatches`);
    const SessionCollection = createSessionModel(`${collectionPrefix}_sessions`);
    const UserCollection = createUserModel(`${collectionPrefix}_users`);
    const AttendanceCollection = createAttendanceModel(`${collectionPrefix}_attendance`);

    // 1. Organization Name
    const orgName = organizationName || collectionPrefix;

    // 2. Active Classes - Count all ClassBatch documents for this org
    const activeClasses = await ClassBatchCollection.countDocuments();

    // 3. Total Users - Count all EndUser documents for this org
    const totalUsers = await UserCollection.countDocuments({ role: 'EndUser' });

    // 4. This Month's Attendance Percentage
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Find all sessions in the current month
    const sessionsThisMonth = await SessionCollection.find({
      startDate: {
        $gte: startOfMonth,
        $lte: endOfMonth,
      },
      isCancelled: { $ne: true }, // Exclude cancelled sessions
    });

    let totalAssignedUsers = 0;
    let totalPresent = 0;

    // Calculate attendance for each session
    for (const session of sessionsThisMonth) {
      // Count assigned users for this session
      const assignedCount = session.assignedUsers?.length || 0;
      totalAssignedUsers += assignedCount;

      if (assignedCount > 0) {
        // Find attendance records for this session
        const attendanceRecords = await AttendanceCollection.find({
          sessionId: session._id.toString(),
        });

        // Count unique users who marked attendance (presence of record = present)
        const presentUserIds = new Set(
          attendanceRecords.map((record: any) => record.userId?.toString())
        );

        totalPresent += presentUserIds.size;
      }
    }

    // Calculate attendance percentage
    let attendancePercentage = 0;
    if (totalAssignedUsers > 0) {
      attendancePercentage = Math.round((totalPresent / totalAssignedUsers) * 100);
    }

    res.json({
      orgName,
      activeClasses,
      totalUsers,
      attendancePercentage,
    });
  } catch (err: any) {
    console.error('Error fetching dashboard stats:', err);
    res.status(500).json({ msg: 'Server error while fetching dashboard stats' });
  }
};

