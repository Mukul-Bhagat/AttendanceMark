import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import Organization from '../models/Organization';
import createUserModel from '../models/User'; // Import the factory
import { sendEmail } from '../utils/email';

// Utility to create a safe collection name
const createCollectionPrefix = (name: string): string => {
  return "org_" + name.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 50);
};

// @route   GET /api/auth/organizations
// @desc    Get list of all organizations for dropdown
// @access  Public
export const getOrganizations = async (_req: Request, res: Response) => {
  try {
    // Query all organizations, sorted alphabetically by name
    const organizations = await Organization.find({})
      .select('name collectionPrefix')
      .sort({ name: 1 });

    // Return lightweight array with name and prefix
    const orgList = organizations.map((org) => ({
      name: org.name,
      prefix: org.collectionPrefix,
    }));

    res.json(orgList);
  } catch (err: any) {
    console.error('Error fetching organizations:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
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
            profilePicture: user.profilePicture,
            createdAt: user.createdAt,
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
        profilePicture: user.profilePicture,
        createdAt: user.createdAt,
        mustResetPassword: user.mustResetPassword,
        organization: org.name,
      },
    });
  } catch (err: any) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @route   POST /api/auth/force-reset-password
// @desc    Force password reset - requires old password and new password
// @access  Private
export const forceResetPassword = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id: userId, collectionPrefix } = req.user!;
  const { oldPassword, newPassword } = req.body;

  try {
    // 1. Get the correct user collection
    const UserCollection = createUserModel(`${collectionPrefix}_users`);

    // 2. Find the user by their ID - MUST select password since it's select: false by default
    const user = await UserCollection.findById(userId).select('+password');

    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // 3. Verify the old password matches
    const isMatch = await user.matchPassword(oldPassword);
    if (!isMatch) {
      return res.status(401).json({ msg: 'Old password is incorrect' });
    }

    // 4. Update the password and set mustResetPassword to false
    user.password = newPassword; // Will be hashed by the pre-save hook
    user.mustResetPassword = false;

    // 5. Save the user
    await user.save();

    res.json({
      msg: 'Password reset successfully. Please log in again with your new password.',
    });
  } catch (err: any) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @route   POST /api/auth/forgot-password
// @desc    Send password reset email
// @access  Public
export const forgotPassword = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { organizationName, email } = req.body;

  try {
    // 1. Find the organization in the MASTER list to get the collectionPrefix
    const org = await Organization.findOne({ name: organizationName });
    if (!org) {
      // Don't reveal that the organization doesn't exist (security best practice)
      return res.json({
        msg: 'If that email exists in our system, you will receive a password reset link.',
      });
    }

    // 2. Get the correct user collection
    const UserCollection = createUserModel(`${org.collectionPrefix}_users`);

    // 3. Find the user by email - MUST select reset token fields
    const user = await UserCollection.findOne({ email }).select('+resetPasswordToken +resetPasswordExpire');

    if (!user) {
      // Don't reveal that the email doesn't exist (security best practice)
      return res.json({
        msg: 'If that email exists in our system, you will receive a password reset link.',
      });
    }

    // 4. Generate reset token
    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    // 5. Create reset URL
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const resetUrl = `${clientUrl}/reset-password/${org.collectionPrefix}/${resetToken}`;

    // 6. Create HTML message
    const message = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h3 style="color: #333;">Password Reset Request</h3>
        <p>You requested a password reset for your AttendMark account.</p>
        <p>Click the button below to reset it (valid for 10 minutes):</p>
        <p style="margin: 25px 0;">
          <a href="${resetUrl}" style="background-color: #f04129; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Reset Password</a>
        </p>
        <p style="color: #666; font-size: 14px;">If you did not request this, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #999; font-size: 12px;">If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="color: #999; font-size: 12px; word-break: break-all;">${resetUrl}</p>
      </div>
    `;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Password Reset Request - AttendMark',
        message: message,
      });

      res.json({
        msg: 'If that email exists in our system, you will receive a password reset link.',
      });
    } catch (err: any) {
      console.error('Failed to send password reset email:', err.message);
      // Clear the reset token since email failed
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });

      return res.status(500).json({ msg: 'Email could not be sent' });
    }
  } catch (err: any) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @route   PUT /api/auth/reset-password/:collectionPrefix/:resetToken
// @desc    Reset password with token
// @access  Public
export const resetPassword = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { collectionPrefix, resetToken } = req.params;
  const { newPassword } = req.body;

  try {
    // 1. Hash the token from the URL to compare with the stored hash
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // 2. Get the correct user collection
    const UserCollection = createUserModel(`${collectionPrefix}_users`);

    // 3. Find user with matching token that hasn't expired
    const user = await UserCollection.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    }).select('+resetPasswordToken +resetPasswordExpire');

    if (!user) {
      return res.status(400).json({ msg: 'Invalid or expired reset token' });
    }

    // 4. Set new password
    user.password = newPassword; // Will be hashed by the pre-save hook
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    user.mustResetPassword = false; // Also clear the force reset flag

    // 5. Save the user
    await user.save();

    res.json({
      msg: 'Password reset successful. You can now log in with your new password.',
    });
  } catch (err: any) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

