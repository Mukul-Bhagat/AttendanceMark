import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import createSessionModel from '../models/Session';

// @route   POST /api/sessions
// @desc    Create a new session
export const createSession = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { collectionPrefix, id: userId, role: userRole } = req.user!;
  const {
    name,
    description,
    frequency,
    startDate,
    endDate,
    startTime,
    endTime,
    locationType,
    sessionType, // New field: PHYSICAL, REMOTE, or HYBRID
    physicalLocation,
    virtualLocation,
    geolocation,
    radius,
    assignedUsers,
    weeklyDays,
    sessionAdmin, // Optional: ID of SessionAdmin to assign (only SuperAdmin can set this)
  } = req.body;

  try {
    // 1. Get the organization-specific Session model
    const SessionCollection = createSessionModel(`${collectionPrefix}_sessions`);

    // 2. Validate location requirements based on sessionType
    const finalSessionType = sessionType || 'PHYSICAL'; // Default to PHYSICAL if not provided
    
    if (finalSessionType === 'PHYSICAL' || finalSessionType === 'HYBRID') {
      // For PHYSICAL or HYBRID sessions, geolocation is required
      if (!geolocation || !geolocation.latitude || !geolocation.longitude) {
        return res.status(400).json({ 
          msg: 'Geolocation (latitude and longitude) is required for Physical or Hybrid sessions.' 
        });
      }
    }
    // For REMOTE sessions, geolocation is optional (ignored)

    // 3. Determine sessionAdmin
    // If creator is SessionAdmin, auto-assign them
    // If SuperAdmin provided a sessionAdmin ID, use that
    let assignedSessionAdmin: string | undefined;
    if (userRole === 'SessionAdmin') {
      assignedSessionAdmin = userId; // Auto-assign the creator
    } else if (userRole === 'SuperAdmin' && sessionAdmin) {
      assignedSessionAdmin = sessionAdmin; // SuperAdmin can assign any SessionAdmin
    }

    // 4. Create the session
    const session = new SessionCollection({
      name,
      description,
      frequency,
      startDate,
      endDate: endDate || undefined,
      startTime,
      endTime,
      locationType: locationType || (finalSessionType === 'PHYSICAL' ? 'Physical' : finalSessionType === 'REMOTE' ? 'Virtual' : 'Hybrid'), // Map sessionType to locationType for backward compatibility
      sessionType: finalSessionType,
      physicalLocation: finalSessionType === 'PHYSICAL' || finalSessionType === 'HYBRID' ? physicalLocation : undefined,
      virtualLocation: finalSessionType === 'REMOTE' || finalSessionType === 'HYBRID' ? virtualLocation : undefined,
      geolocation: (finalSessionType === 'PHYSICAL' || finalSessionType === 'HYBRID') && geolocation ? geolocation : undefined,
      radius: (finalSessionType === 'PHYSICAL' || finalSessionType === 'HYBRID') && radius ? radius : undefined,
      assignedUsers: assignedUsers || [],
      weeklyDays: frequency === 'Weekly' ? weeklyDays : undefined,
      sessionAdmin: assignedSessionAdmin,
      createdBy: userId,
      organizationPrefix: collectionPrefix,
    });

    await session.save();

    res.status(201).json({
      msg: 'Session created successfully',
      session,
    });
  } catch (err: any) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @route   GET /api/sessions
// @desc    Get all sessions for the user's organization
// @access  Private
export const getSessions = async (req: Request, res: Response) => {
  try {
    const { collectionPrefix } = req.user!;

    // Get the organization-specific Session model
    const SessionCollection = createSessionModel(`${collectionPrefix}_sessions`);

    // Find all sessions for this organization, sorted by creation date (newest first)
    const sessions = await SessionCollection.find()
      .sort({ createdAt: -1 })
      .lean();

    res.json(sessions);
  } catch (err: any) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @route   GET /api/sessions/:id
// @desc    Get a single session by its ID
// @access  Private
export const getSessionById = async (req: Request, res: Response) => {
  try {
    const { collectionPrefix } = req.user!;
    const { id } = req.params;

    // Get the organization-specific Session model
    const SessionCollection = createSessionModel(`${collectionPrefix}_sessions`);

    // Find the session by ID
    const session = await SessionCollection.findById(id).lean();

    if (!session) {
      return res.status(404).json({ msg: 'Session not found' });
    }

    res.json(session);
  } catch (err: any) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Session not found' });
    }
    res.status(500).send('Server error');
  }
};

// @route   PUT /api/sessions/:id
// @desc    Update a session (only SuperAdmin or assigned SessionAdmin can update)
// @access  Private
export const updateSession = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { collectionPrefix, id: userId, role: userRole } = req.user!;
  const { id } = req.params;
  const {
    name,
    description,
    frequency,
    startDate,
    endDate,
    startTime,
    endTime,
    locationType,
    sessionType, // New field: PHYSICAL, REMOTE, or HYBRID
    physicalLocation,
    virtualLocation,
    assignedUsers,
    weeklyDays,
    geolocation,
    radius,
    sessionAdmin, // Optional: Only SuperAdmin can change this
  } = req.body;

  try {
    // 1. Get the organization-specific Session model
    const SessionCollection = createSessionModel(`${collectionPrefix}_sessions`);

    // 2. Find the session
    const session = await SessionCollection.findById(id);
    if (!session) {
      return res.status(404).json({ msg: 'Session not found' });
    }

    // 3. Security check: Only SuperAdmin or assigned SessionAdmin can update
    if (userRole !== 'SuperAdmin' && session.sessionAdmin?.toString() !== userId) {
      return res.status(403).json({ msg: 'Not authorized to edit this session' });
    }

    // 4. Only SuperAdmin can change the sessionAdmin assignment
    let updatedSessionAdmin = session.sessionAdmin;
    if (userRole === 'SuperAdmin' && sessionAdmin !== undefined) {
      updatedSessionAdmin = sessionAdmin || undefined;
    }

    // 5. Validate location requirements based on sessionType (if updating)
    const finalSessionType = sessionType || session.sessionType;
    if (sessionType && (finalSessionType === 'PHYSICAL' || finalSessionType === 'HYBRID')) {
      // For PHYSICAL or HYBRID sessions, geolocation is required
      if (!geolocation || !geolocation.latitude || !geolocation.longitude) {
        return res.status(400).json({ 
          msg: 'Geolocation (latitude and longitude) is required for Physical or Hybrid sessions.' 
        });
      }
    }

    // 6. Update the session
    if (name) session.name = name;
    if (description !== undefined) session.description = description;
    if (frequency) session.frequency = frequency;
    if (startDate) session.startDate = startDate;
    if (endDate !== undefined) session.endDate = endDate || undefined;
    if (startTime) session.startTime = startTime;
    if (endTime) session.endTime = endTime;
    if (locationType) session.locationType = locationType;
    if (sessionType) session.sessionType = sessionType;
    if (physicalLocation !== undefined) {
      session.physicalLocation = (finalSessionType === 'PHYSICAL' || finalSessionType === 'HYBRID') ? physicalLocation : undefined;
    }
    if (virtualLocation !== undefined) {
      session.virtualLocation = (finalSessionType === 'REMOTE' || finalSessionType === 'HYBRID') ? virtualLocation : undefined;
    }
    if (assignedUsers !== undefined) session.assignedUsers = assignedUsers;
    if (weeklyDays !== undefined) {
      session.weeklyDays = frequency === 'Weekly' ? weeklyDays : undefined;
    }
    if (geolocation !== undefined) {
      // Only set geolocation for PHYSICAL or HYBRID sessions
      if (finalSessionType === 'PHYSICAL' || finalSessionType === 'HYBRID') {
        session.geolocation = geolocation;
      } else {
        session.geolocation = undefined;
      }
    }
    if (radius !== undefined) {
      // Only set radius for PHYSICAL or HYBRID sessions
      if (finalSessionType === 'PHYSICAL' || finalSessionType === 'HYBRID') {
        session.radius = radius;
      } else {
        session.radius = undefined;
      }
    }
    session.sessionAdmin = updatedSessionAdmin;

    await session.save();

    res.json({
      msg: 'Session updated successfully',
      session,
    });
  } catch (err: any) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Session not found' });
    }
    res.status(500).send('Server error');
  }
};

