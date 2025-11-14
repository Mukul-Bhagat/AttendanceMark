import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import createUserModel from '../models/User';

// @route   GET /api/users/my-organization
export const getOrganizationUsers = async (req: Request, res: Response) => {
  const { collectionPrefix } = req.user!;

  try {
    // 1. Get the organization-specific User model
    const UserCollection = createUserModel(`${collectionPrefix}_users`);

    // 2. Find all users in that collection
    // We only select fields the admin needs to see
    const users = await UserCollection.find().select(
      'profile.firstName profile.lastName email role'
    );

    res.json(users);
  } catch (err: any) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @route   POST /api/users/staff
// @desc    Create a new staff member (Manager or SessionAdmin) - Only SuperAdmin can do this
// @access  Private (SuperAdmin only)
export const createStaff = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { collectionPrefix, role: requesterRole } = req.user!;

  // Only SuperAdmin can create staff members
  if (requesterRole !== 'SuperAdmin') {
    return res.status(403).json({ msg: 'Only Super Admin can create staff members' });
  }

  const { email, password, role, firstName, lastName, phone } = req.body;

  // Validate that the role is either Manager or SessionAdmin
  if (role !== 'Manager' && role !== 'SessionAdmin') {
    return res.status(400).json({ msg: 'Role must be either Manager or SessionAdmin' });
  }

  try {
    // Get the organization-specific User model
    const UserCollection = createUserModel(`${collectionPrefix}_users`);

    // Check if user already exists
    const existingUser = await UserCollection.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ msg: 'User with this email already exists' });
    }

    // Create the new staff member
    const newStaff = new UserCollection({
      email: email.toLowerCase(),
      password, // Will be hashed by the pre-save hook
      role,
      profile: {
        firstName,
        lastName,
        phone: phone || undefined,
      },
      mustResetPassword: true, // Staff members must reset password on first login
    });

    await newStaff.save();

    // Return user without password
    const userResponse = await UserCollection.findById(newStaff._id).select('-password');

    res.status(201).json({
      msg: `${role} created successfully`,
      user: userResponse,
    });
  } catch (err: any) {
    console.error(err.message);
    if (err.code === 11000) {
      return res.status(400).json({ msg: 'User with this email already exists' });
    }
    res.status(500).send('Server error');
  }
};

