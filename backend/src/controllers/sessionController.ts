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

  const { collectionPrefix, id: userId } = req.user!;
  const {
    name,
    description,
    frequency,
    startDate,
    endDate,
    startTime,
    endTime,
    locationType,
    physicalLocation,
    virtualLocation,
    assignedUsers,
    weeklyDays,
  } = req.body;

  try {
    // 1. Get the organization-specific Session model
    const SessionCollection = createSessionModel(`${collectionPrefix}_sessions`);

    // 2. Create the session
    const session = new SessionCollection({
      name,
      description,
      frequency,
      startDate,
      endDate: endDate || undefined,
      startTime,
      endTime,
      locationType,
      physicalLocation: locationType === 'Physical' || locationType === 'Hybrid' ? physicalLocation : undefined,
      virtualLocation: locationType === 'Virtual' || locationType === 'Hybrid' ? virtualLocation : undefined,
      assignedUsers: assignedUsers || [],
      weeklyDays: frequency === 'Weekly' ? weeklyDays : undefined,
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

