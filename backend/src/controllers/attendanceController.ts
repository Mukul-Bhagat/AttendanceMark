import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import mongoose from 'mongoose';
import { getDistance } from 'geolib'; // For geolocation
import createSessionModel from '../models/Session';
import createAttendanceModel from '../models/Attendance';
import createUserModel from '../models/User'; // We need this now

// @route   POST /api/attendance/scan
export const markAttendance = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // 1. GET ALL DATA
  const { id: userId, collectionPrefix } = req.user!;
  const { sessionId, userLocation, deviceId } = req.body;

  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    return res.status(400).json({ msg: 'Invalid Session ID' });
  }

  try {
    // 2. LOAD ALL ORG-SPECIFIC COLLECTIONS
    const UserCollection = createUserModel(`${collectionPrefix}_users`);
    const SessionCollection = createSessionModel(`${collectionPrefix}_sessions`);
    const AttendanceCollection = createAttendanceModel(`${collectionPrefix}_attendance`);

    // 3. FIND THE USER AND SESSION (in parallel)
    const [user, session] = await Promise.all([
      UserCollection.findById(userId).select('+registeredDeviceId'), // Get the locked ID
      SessionCollection.findById(sessionId)
    ]);

    if (!user) return res.status(404).json({ msg: 'User not found' });
    if (!session) return res.status(404).json({ msg: 'Session not found' });

    // 4. CHECK IF SESSION IS ACTIVE
    // Since startTime and endTime are strings (HH:mm), we need to combine with startDate
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Parse startTime and endTime (HH:mm format)
    const [startHour, startMinute] = session.startTime.split(':').map(Number);
    const [endHour, endMinute] = session.endTime.split(':').map(Number);
    
    let isActive = false;
    
    if (session.frequency === 'OneTime') {
      // For one-time sessions, check the exact start/end datetime
      const sessionStartDateTime = new Date(session.startDate);
      sessionStartDateTime.setHours(startHour, startMinute, 0, 0);
      
      const sessionEndDateTime = new Date(session.startDate);
      sessionEndDateTime.setHours(endHour, endMinute, 59, 999);
      
      isActive = now >= sessionStartDateTime && now <= sessionEndDateTime;
    } else {
      // For recurring sessions, check if today is within the date range and time window
      const sessionStartDate = new Date(session.startDate);
      sessionStartDate.setHours(0, 0, 0, 0);
      
      const sessionEndDate = session.endDate 
        ? new Date(session.endDate)
        : null;
      if (sessionEndDate) {
        sessionEndDate.setHours(23, 59, 59, 999);
      }
      
      // Check if today is within the date range
      const isWithinDateRange = now >= sessionStartDate && 
        (!sessionEndDate || now <= sessionEndDate);
      
      if (isWithinDateRange) {
        // Check if current time is within the time window
        const todayStart = new Date(today);
        todayStart.setHours(startHour, startMinute, 0, 0);
        
        const todayEnd = new Date(today);
        todayEnd.setHours(endHour, endMinute, 59, 999);
        
        isActive = now >= todayStart && now <= todayEnd;
      }
    }
    
    if (!isActive) {
      return res.status(400).json({ msg: 'Session is not currently active' });
    }

    // 5. CHECK FOR DUPLICATE ATTENDANCE
    const existingAttendance = await AttendanceCollection.findOne({ userId, sessionId });
    if (existingAttendance) {
      return res.status(400).json({ msg: 'Attendance already marked' });
    }

    // 6. *** DEVICE-LOCKING CHECK ***
    if (!user.registeredDeviceId) {
      // This is the user's FIRST scan. Register this device.
      user.registeredDeviceId = deviceId;
      await user.save();
    } else if (user.registeredDeviceId !== deviceId) {
      // Device IDs DO NOT match.
      return res.status(403).json({
        msg: 'This is not your registered device. Please use your own phone or contact your admin to reset your device.',
      });
    }
    // If user.registeredDeviceId === deviceId, the check passes.

    // 7. *** GEOLOCATION CHECK ***
    // Only check geolocation if session has geolocation data
    let locationVerified = false;
    if (session.geolocation && session.geolocation.latitude && session.geolocation.longitude) {
      const sessionLocation = {
        latitude: session.geolocation.latitude,
        longitude: session.geolocation.longitude,
      };
      
      const distance = getDistance(userLocation, sessionLocation);
      const radius = session.radius || 100; // Default to 100 meters if not set
      
      if (distance <= radius) {
        locationVerified = true;
      } else {
        // Strictly enforce location
        return res.status(403).json({
          msg: `You are too far from the session. You are ${distance}m away; must be within ${radius}m.`,
        });
      }
    } else {
      // If no geolocation is set, mark as verified (for virtual sessions)
      locationVerified = true;
    }

    // 8. ALL CHECKS PASSED: CREATE ATTENDANCE RECORD
    const newAttendance = new AttendanceCollection({
      userId,
      sessionId,
      userLocation,
      locationVerified,
      deviceId, // Log the device used for this scan
      checkInTime: now,
    });

    await newAttendance.save();

    res.status(201).json({
      msg: 'Attendance marked successfully!',
      attendance: newAttendance,
    });
  } catch (err: any) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @route   GET /api/attendance/me
// @desc    Get all attendance records for the logged-in user with session details
// @access  Private
export const getMyAttendance = async (req: Request, res: Response) => {
  try {
    const { id: userId, collectionPrefix } = req.user!;

    // Load organization-specific collections
    const AttendanceCollection = createAttendanceModel(`${collectionPrefix}_attendance`);
    const SessionCollection = createSessionModel(`${collectionPrefix}_sessions`);

    // Find all attendance records for this user, sorted by check-in time (newest first)
    const attendanceRecords = await AttendanceCollection.find({ userId })
      .sort({ checkInTime: -1 })
      .lean();

    // Since we're using factory functions, we can't use Mongoose populate()
    // Instead, we'll manually join the session data
    const sessionIds = attendanceRecords
      .map(record => record.sessionId)
      .filter(id => id); // Filter out any null/undefined IDs
    
    let sessions: any[] = [];
    if (sessionIds.length > 0) {
      sessions = await SessionCollection.find({
        _id: { $in: sessionIds }
      }).lean();
    }

    // Create a map of sessionId -> session for quick lookup
    const sessionMap = new Map();
    sessions.forEach(session => {
      sessionMap.set(session._id.toString(), session);
    });

    // Combine attendance records with session data
    const recordsWithSessions = attendanceRecords.map(record => {
      const sessionIdStr = record.sessionId?.toString() || '';
      const session = sessionMap.get(sessionIdStr);
      return {
        ...record,
        sessionId: session || null, // Include full session data or null if deleted
      };
    });

    res.json(recordsWithSessions);
  } catch (err: any) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @route   GET /api/attendance/session/:id
// @desc    Get all attendance records for a specific session (with user data populated)
// @access  Private (Manager, SuperAdmin only)
export const getSessionAttendance = async (req: Request, res: Response) => {
  try {
    const { collectionPrefix, role: userRole } = req.user!;
    const { id: sessionId } = req.params;

    // Check if user has permission (Manager or SuperAdmin)
    if (userRole !== 'Manager' && userRole !== 'SuperAdmin') {
      return res.status(403).json({ msg: 'Not authorized to view attendance reports' });
    }

    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({ msg: 'Invalid Session ID' });
    }

    // Load organization-specific collections
    const AttendanceCollection = createAttendanceModel(`${collectionPrefix}_attendance`);
    const UserCollection = createUserModel(`${collectionPrefix}_users`);
    const SessionCollection = createSessionModel(`${collectionPrefix}_sessions`);

    // Verify session exists
    const session = await SessionCollection.findById(sessionId);
    if (!session) {
      return res.status(404).json({ msg: 'Session not found' });
    }

    // Find all attendance records for this session, sorted by check-in time
    const attendanceRecords = await AttendanceCollection.find({ sessionId })
      .sort({ checkInTime: -1 })
      .lean();

    // Get user IDs from attendance records
    const userIds = attendanceRecords
      .map(record => record.userId)
      .filter(id => id);

    // Fetch user data
    let users: any[] = [];
    if (userIds.length > 0) {
      users = await UserCollection.find({
        _id: { $in: userIds }
      }).select('email profile').lean();
    }

    // Create a map of userId -> user for quick lookup
    const userMap = new Map();
    users.forEach(user => {
      userMap.set(user._id.toString(), user);
    });

    // Combine attendance records with user data
    const recordsWithUsers = attendanceRecords.map(record => {
      const userIdStr = record.userId?.toString() || '';
      const user = userMap.get(userIdStr);
      return {
        _id: record._id,
        checkInTime: record.checkInTime,
        locationVerified: record.locationVerified,
        userId: user || null, // Include full user data or null if deleted
      };
    });

    res.json(recordsWithUsers);
  } catch (err: any) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Session not found' });
    }
    res.status(500).send('Server error');
  }
};

// @route   GET /api/attendance/user/:id
// @desc    Get all attendance records for a specific user (with session data populated)
// @access  Private (Manager, SuperAdmin only)
export const getUserAttendance = async (req: Request, res: Response) => {
  try {
    const { collectionPrefix, role: userRole } = req.user!;
    const { id: userId } = req.params;

    // Check if user has permission (Manager or SuperAdmin)
    if (userRole !== 'Manager' && userRole !== 'SuperAdmin') {
      return res.status(403).json({ msg: 'Not authorized to view attendance reports' });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ msg: 'Invalid User ID' });
    }

    // Load organization-specific collections
    const AttendanceCollection = createAttendanceModel(`${collectionPrefix}_attendance`);
    const UserCollection = createUserModel(`${collectionPrefix}_users`);
    const SessionCollection = createSessionModel(`${collectionPrefix}_sessions`);

    // Verify user exists
    const user = await UserCollection.findById(userId);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Find all attendance records for this user, sorted by check-in time (newest first)
    const attendanceRecords = await AttendanceCollection.find({ userId })
      .sort({ checkInTime: -1 })
      .lean();

    // Get session IDs from attendance records
    const sessionIds = attendanceRecords
      .map(record => record.sessionId)
      .filter(id => id);

    // Fetch session data
    let sessions: any[] = [];
    if (sessionIds.length > 0) {
      sessions = await SessionCollection.find({
        _id: { $in: sessionIds }
      }).lean();
    }

    // Create a map of sessionId -> session for quick lookup
    const sessionMap = new Map();
    sessions.forEach(session => {
      sessionMap.set(session._id.toString(), session);
    });

    // Combine attendance records with session data
    const recordsWithSessions = attendanceRecords.map(record => {
      const sessionIdStr = record.sessionId?.toString() || '';
      const session = sessionMap.get(sessionIdStr);
      const recordAny = record as any; // Type assertion for timestamps
      return {
        _id: record._id,
        userId: record.userId,
        sessionId: session || null, // Include full session data or null if deleted
        checkInTime: record.checkInTime,
        locationVerified: record.locationVerified,
        userLocation: record.userLocation,
        deviceId: record.deviceId,
        createdAt: recordAny.createdAt,
        updatedAt: recordAny.updatedAt,
      };
    });

    res.json(recordsWithSessions);
  } catch (err: any) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'User not found' });
    }
    res.status(500).send('Server error');
  }
};

