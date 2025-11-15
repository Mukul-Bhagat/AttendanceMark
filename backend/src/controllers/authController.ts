import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import Organization from '../models/Organization';
import createUserModel from '../models/User'; // Import the factory

// Utility to create a safe collection name
const createCollectionPrefix = (name: string): string => {
  return "org_" + name.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 50);
};

// @route   POST /api/auth/register-super-admin
export const registerSuperAdmin = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { organizationName, firstName, lastName, email, password, phone } = req.body;

  try {
    // 1. Check if organization already exists in the MASTER list
    let org = await Organization.findOne({ name: organizationName });
    if (org) {
      return res.status(400).json({ msg: 'An organization with this name already exists' });
    }

    // 2. Create the unique collection prefix
    const collectionPrefix = createCollectionPrefix(organizationName);
    
    // 3. Save the new organization to the MASTER list
    org = new Organization({
      name: organizationName,
      collectionPrefix: collectionPrefix,
    });
    await org.save();

    // 4. *** THIS IS THE MAGIC ***
    // Create a new User Model pointing to the new, unique collection
    const UserCollection = createUserModel(`${collectionPrefix}_users`);

    // 5. Check if the email is already in use *in that specific collection*
    // (This check is fast because the collection is brand new)
    let user = await UserCollection.findOne({ email });
    if (user) {
      // This should never happen on a new org, but it's good practice
      return res.status(400).json({ msg: 'This email is already in use' });
    }

    // 6. Create the new SuperAdmin user in their OWN collection
    user = new UserCollection({
      email,
      password,
      role: 'SuperAdmin',
      profile: {
        firstName,
        lastName,
        phone,
      },
    });

    await user.save();

    // 7. TODO: Generate and return a JWT token (we'll do this next)

    res.status(201).json({
      msg: `Organization '${organizationName}' and Super Admin created.`,
      collectionPrefix: collectionPrefix,
    });
  } catch (err: any) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @route   POST /api/auth/login
// @desc    Login user - finds the correct collection using organizationName
export const login = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { organizationName, email, password } = req.body;

  try {
    // 1. Find the organization in the MASTER list to get the collectionPrefix
    const org = await Organization.findOne({ name: organizationName });
    if (!org) {
      return res.status(401).json({ msg: 'Invalid organization name' });
    }

    // 2. Use the collectionPrefix to get the correct user collection
    const UserCollection = createUserModel(`${org.collectionPrefix}_users`);

    // 3. Find the user by email - MUST select password since it's select: false by default
    const user = await UserCollection.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ msg: 'Invalid credentials' });
    }

    // 4. Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ msg: 'Invalid credentials' });
    }

    // 5. Generate JWT token
    // The token includes collectionPrefix so we know which collection to use for future requests
    const payload = {
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        collectionPrefix: org.collectionPrefix,
        organizationName: org.name,
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' },
      (err, token) => {
        if (err) throw err;
        res.json({
          token,
          user: {
            id: user._id,
            email: user.email,
            role: user.role,
            profile: user.profile,
            mustResetPassword: user.mustResetPassword,
          },
        });
      }
    );
  } catch (err: any) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @route   GET /api/auth/me
// @desc    Get the logged-in user's data from their token
// @access  Private
export const getMe = async (req: Request, res: Response) => {
  const { id: userId, collectionPrefix } = req.user!;

  try {
    // 1. Get the correct user collection
    const UserCollection = createUserModel(`${collectionPrefix}_users`);

    // 2. Find the user by their ID (from the token)
    const user = await UserCollection.findById(userId);

    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // 3. Find the organization name
    const org = await Organization.findOne({ collectionPrefix });
    if (!org) {
      return res.status(404).json({ msg: 'Organization not found' });
    }

    // 4. Send back the same user object as the login route (plus organization)
    res.json({
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        profile: user.profile,
        mustResetPassword: user.mustResetPassword,
        organization: org.name,
      },
    });
  } catch (err: any) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

