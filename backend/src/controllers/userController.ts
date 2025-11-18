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
    // Include registeredDeviceId explicitly using + prefix (it's marked select: false in schema)
    const users = await UserCollection.find().select(
      'profile.firstName profile.lastName profile.phone email role +registeredDeviceId'
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

// @route   POST /api/users/end-user
// @desc    Create a new EndUser
// @access  Private (SuperAdmin or CompanyAdmin)
export const createEndUser = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { collectionPrefix, role: requesterRole } = req.user!;

  // 1. Security Check: Only SuperAdmin or CompanyAdmin can create users
  if (requesterRole !== 'SuperAdmin' && requesterRole !== 'CompanyAdmin') {
    return res.status(403).json({ msg: 'Not authorized' });
  }

  const { email, password, firstName, lastName, phone } = req.body;

  try {
    // 2. Get the correct User collection
    const UserCollection = createUserModel(`${collectionPrefix}_users`);

    // 3. Check if user already exists
    const existingUser = await UserCollection.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ msg: 'User with this email already exists' });
    }

    // 4. Create new EndUser
    const newEndUser = new UserCollection({
      email: email.toLowerCase(),
      password, // Will be hashed by the pre-save hook
      role: 'EndUser', // Hard-code the role
      profile: {
        firstName,
        lastName,
        phone: phone || undefined,
      },
      mustResetPassword: true,
    });

    await newEndUser.save();

    // Return user without password
    const userResponse = await UserCollection.findById(newEndUser._id).select('-password');

    res.status(201).json({
      msg: 'EndUser created successfully',
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

// @route   PUT /api/users/:userId/reset-device
// @desc    Reset a user's registered device ID
// @access  Private (SuperAdmin or CompanyAdmin)
export const resetDevice = async (req: Request, res: Response) => {
  const { collectionPrefix, role: requesterRole } = req.user!;
  const { userId } = req.params;

  // 1. Security Check
  if (requesterRole !== 'SuperAdmin' && requesterRole !== 'CompanyAdmin') {
    return res.status(403).json({ msg: 'Not authorized' });
  }

  try {
    // 2. Get the User collection
    const UserCollection = createUserModel(`${collectionPrefix}_users`);

    // 3. Find the user
    const user = await UserCollection.findById(userId);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // 4. Clear the device ID and save
    user.registeredDeviceId = undefined;
    await user.save();

    res.json({
      msg: 'User device has been reset. They can register a new device on their next scan.',
    });
  } catch (err: any) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @route   DELETE /api/users/:userId
// @desc    Delete a user account - Only SuperAdmin can delete users
// @access  Private (SuperAdmin only)
export const deleteUser = async (req: Request, res: Response) => {
  const { collectionPrefix, role: requesterRole, id: requesterId } = req.user!;
  const { userId } = req.params;

  // 1. Security Check - Only SuperAdmin can delete users
  if (requesterRole !== 'SuperAdmin') {
    return res.status(403).json({ msg: 'Only Super Admin can delete users' });
  }

  // 2. Prevent SuperAdmin from deleting themselves
  if (userId === requesterId) {
    return res.status(400).json({ msg: 'You cannot delete your own account' });
  }

  try {
    // 3. Get the User collection
    const UserCollection = createUserModel(`${collectionPrefix}_users`);

    // 4. Find the user
    const user = await UserCollection.findById(userId);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // 5. Prevent deleting SuperAdmin accounts (except the one making the request, which is already blocked above)
    if (user.role === 'SuperAdmin') {
      return res.status(400).json({ msg: 'Cannot delete Super Admin accounts' });
    }

    // 6. Delete the user
    await UserCollection.findByIdAndDelete(userId);

    res.json({
      msg: 'User account deleted successfully',
    });
  } catch (err: any) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

