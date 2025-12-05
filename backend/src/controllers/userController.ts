import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import createUserModel from '../models/User';
import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { sendEmail } from '../utils/email';

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

    // Send welcome email with login credentials
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const welcomeEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h3 style="color: #f04129;">Welcome to AttendMark!</h3>
        <p>Your account has been created by your administrator.</p>
        <p><strong>Email:</strong> ${email.toLowerCase()}</p>
        <p><strong>Temporary Password:</strong> <code style="background-color: #f0f0f0; padding: 2px 6px; border-radius: 3px;">${password}</code></p>
        <p>Please log in at: <a href="${clientUrl}">${clientUrl}</a></p>
        <p style="color: #666; font-size: 14px;">Note: You will be asked to change this password on your first login.</p>
      </div>
    `;

    try {
      await sendEmail({
        email: email.toLowerCase(),
        subject: 'Welcome to AttendMark - Your Login Credentials',
        message: welcomeEmailHtml,
      });
    } catch (emailErr: any) {
      console.error('User created but failed to send welcome email:', emailErr.message);
      // Don't fail user creation if email fails
    }

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

// @route   POST /api/users/bulk
// @desc    Bulk create EndUsers from CSV data
// @access  Private (SuperAdmin or CompanyAdmin)
export const bulkCreateUsers = async (req: Request, res: Response) => {
  const { collectionPrefix, role: requesterRole } = req.user!;

  // 1. Security Check: Only SuperAdmin or CompanyAdmin can bulk create users
  if (requesterRole !== 'SuperAdmin' && requesterRole !== 'CompanyAdmin') {
    return res.status(403).json({ msg: 'Not authorized' });
  }

  const { users, temporaryPassword } = req.body;

  // Validate input
  if (!Array.isArray(users) || users.length === 0) {
    return res.status(400).json({ msg: 'Users array is required and must not be empty' });
  }

  if (!temporaryPassword || temporaryPassword.length < 6) {
    return res.status(400).json({ msg: 'Temporary password is required and must be at least 6 characters' });
  }

  try {
    const UserCollection = createUserModel(`${collectionPrefix}_users`);
    let successCount = 0;
    let duplicateCount = 0;
    const errors: string[] = [];
    const emailPromises: Promise<void>[] = [];
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

    // Process each user
    for (const userData of users) {
      const { name, email, phone } = userData;

      // Validate required fields
      if (!name || !email) {
        errors.push(`Skipped: Missing name or email for entry`);
        continue;
      }

      // Parse name into firstName and lastName
      const nameParts = name.trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      if (!firstName) {
        errors.push(`Skipped: Invalid name format for ${email}`);
        continue;
      }

      // Check if user already exists
      const existingUser = await UserCollection.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        duplicateCount++;
        errors.push(`Duplicate: ${email} already exists`);
        continue;
      }

      // Create new EndUser with the temporary password
      const newEndUser = new UserCollection({
        email: email.toLowerCase(),
        password: temporaryPassword, // Will be hashed by the pre-save hook
        role: 'EndUser',
        profile: {
          firstName,
          lastName,
          phone: phone || undefined,
        },
        mustResetPassword: true,
      });

      await newEndUser.save();
      successCount++;

      // Queue welcome email (don't await - collect for Promise.all)
      const welcomeEmailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h3 style="color: #f04129;">Welcome to AttendMark!</h3>
          <p>Your account has been created by your administrator.</p>
          <p><strong>Email:</strong> ${email.toLowerCase()}</p>
          <p><strong>Temporary Password:</strong> <code style="background-color: #f0f0f0; padding: 2px 6px; border-radius: 3px;">${temporaryPassword}</code></p>
          <p>Please log in at: <a href="${clientUrl}">${clientUrl}</a></p>
          <p style="color: #666; font-size: 14px;">Note: You will be asked to change this password on your first login.</p>
        </div>
      `;

      emailPromises.push(
        sendEmail({
          email: email.toLowerCase(),
          subject: 'Welcome to AttendMark - Your Login Credentials',
          message: welcomeEmailHtml,
        }).catch((emailErr: any) => {
          console.error(`User ${email} created but failed to send welcome email:`, emailErr.message);
          // Don't fail - just log
        })
      );
    }

    // Send all welcome emails in parallel (don't block response)
    Promise.all(emailPromises).catch((err) => {
      console.error('Error sending bulk welcome emails:', err);
    });

    res.status(201).json({
      msg: `Bulk import completed: ${successCount} users created, ${duplicateCount} duplicates skipped`,
      successCount,
      duplicateCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: any) {
    console.error('Error in bulk user creation:', err);
    res.status(500).json({ msg: 'Server error during bulk import', error: err.message });
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

    // Send welcome email with login credentials
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const welcomeEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h3 style="color: #f04129;">Welcome to AttendMark!</h3>
        <p>Your account has been created by your administrator.</p>
        <p><strong>Email:</strong> ${email.toLowerCase()}</p>
        <p><strong>Temporary Password:</strong> <code style="background-color: #f0f0f0; padding: 2px 6px; border-radius: 3px;">${password}</code></p>
        <p>Please log in at: <a href="${clientUrl}">${clientUrl}</a></p>
        <p style="color: #666; font-size: 14px;">Note: You will be asked to change this password on your first login.</p>
      </div>
    `;

    try {
      await sendEmail({
        email: email.toLowerCase(),
        subject: 'Welcome to AttendMark - Your Login Credentials',
        message: welcomeEmailHtml,
      });
    } catch (emailErr: any) {
      console.error('User created but failed to send welcome email:', emailErr.message);
      // Don't fail user creation if email fails
    }

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
// @desc    Reset a user's registered device ID and generate new password
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
    // Data Integrity: Using findById (not delete methods) to preserve all user data
    const user = await UserCollection.findById(userId);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // 4. Clear Security Locks: Set registeredDeviceId and registeredUserAgent to null
    // Data Integrity: Only modifying these 3 fields. All other fields (Name, Email, Profile Picture, etc.) are preserved
    user.registeredDeviceId = undefined;
    user.registeredUserAgent = undefined;

    // 5. Generate New Password: Create a random 8-character string
    const newPassword = crypto.randomBytes(4).toString('hex').substring(0, 8);

    // 6. Hash Password: Hash this new password using bcrypt
    // Note: The User model has a pre-save hook that automatically hashes passwords
    // We'll set the plain password and let the pre-save hook handle the hashing
    // This ensures consistency with the rest of the codebase
    user.password = newPassword;
    user.mustResetPassword = true;
    
    // 7. Update User: Save the new password (will be hashed by pre-save hook) and cleared device fields
    // Data Integrity: Updating credentials only. User history and profile data are preserved because _id remains unchanged.
    // Using user.save() ensures only modified fields are updated, preserving all other data
    await user.save();

    // 8. Send Email: Email the user with the new temporary password
    const emailSubject = 'Your Account Device has been Reset';
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f04129;">Device Reset Notification</h2>
        <p>Your device lock has been cleared by an administrator.</p>
        <p><strong>Your new temporary password is: <code style="background-color: #f0f0f0; padding: 2px 6px; border-radius: 3px; font-size: 16px;">${newPassword}</code></strong></p>
        <p>Please log in on your new device to secure it. You will be required to change your password on first login.</p>
        <p style="color: #666; font-size: 12px; margin-top: 20px;">If you did not request this reset, please contact your administrator immediately.</p>
      </div>
    `;

    try {
      await sendEmail({
        email: user.email,
        subject: emailSubject,
        message: emailHtml,
      });
    } catch (emailErr: any) {
      console.error('Error sending reset email:', emailErr);
      // Don't fail the request if email fails, but log it
      // The password was already reset, so we continue
    }

    // 9. Return user object (excluding password) to confirm account still exists with all data intact
    // Fetch the updated user without password field to return in response
    const updatedUser = await UserCollection.findById(userId).select('-password');
    
    res.json({
      msg: 'Device restriction removed. User can now link a new device.',
      user: updatedUser, // Return user object to confirm Name/Email/profile data are preserved
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

  // Validate userId is a valid ObjectId (prevent route conflicts like "profile-picture")
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ msg: 'Invalid user ID format' });
  }

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

// @route   POST /api/users/profile-picture
// @desc    Upload profile picture for the logged-in user
// @access  Private
export const uploadProfilePicture = async (req: Request, res: Response) => {
  const { collectionPrefix, id: userId } = req.user!;

  try {
    if (!req.file) {
      return res.status(400).json({ msg: 'No file uploaded' });
    }

    const UserCollection = createUserModel(`${collectionPrefix}_users`);
    const user = await UserCollection.findById(userId);

    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Delete old profile picture if exists
    if (user.profilePicture) {
      const oldImagePath = path.join(__dirname, '../../public', user.profilePicture);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    // Save new profile picture URL (relative to public folder)
    const profilePictureUrl = `/uploads/${req.file.filename}`;
    user.profilePicture = profilePictureUrl;
    await user.save();

    res.json({
      msg: 'Profile picture uploaded successfully',
      profilePicture: profilePictureUrl,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        profile: user.profile,
        profilePicture: user.profilePicture,
        createdAt: user.createdAt,
      },
    });
  } catch (err: any) {
    console.error('Error uploading profile picture:', err);
    res.status(500).json({ msg: 'Server error while uploading profile picture' });
  }
};

// @route   PUT /api/users/profile
// @desc    Update user profile (firstName, lastName, phone, bio)
// @access  Private
export const updateProfile = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { collectionPrefix, id: userId } = req.user!;
  const { firstName, lastName, phone, bio } = req.body;

  try {
    const UserCollection = createUserModel(`${collectionPrefix}_users`);
    const user = await UserCollection.findById(userId);

    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Update profile fields
    if (firstName) user.profile.firstName = firstName;
    if (lastName) user.profile.lastName = lastName;
    if (phone !== undefined) user.profile.phone = phone || undefined;
    if (bio !== undefined) user.profile.bio = bio || undefined;

    await user.save();

    res.json({
      msg: 'Profile updated successfully',
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        profile: user.profile,
        profilePicture: user.profilePicture,
        createdAt: user.createdAt,
      },
    });
  } catch (err: any) {
    console.error('Error updating profile:', err);
    res.status(500).json({ msg: 'Server error while updating profile' });
  }
};

// @route   PUT /api/users/change-password
// @desc    Change user password
// @access  Private
export const changePassword = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { collectionPrefix, id: userId } = req.user!;
  const { oldPassword, newPassword } = req.body;

  try {
    const UserCollection = createUserModel(`${collectionPrefix}_users`);
    const user = await UserCollection.findById(userId).select('+password');

    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Verify old password
    const isMatch = await user.matchPassword(oldPassword);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Current password is incorrect' });
    }

    // Update password (will be hashed by pre-save hook)
    user.password = newPassword;
    await user.save();

    res.json({ msg: 'Password changed successfully' });
  } catch (err: any) {
    console.error('Error changing password:', err);
    res.status(500).json({ msg: 'Server error while changing password' });
  }
};

// @route   PUT /api/users/:userId/quota
// @desc    Update a user's custom leave quota (or reset to default)
// @access  Private (SuperAdmin or CompanyAdmin)
export const updateUserQuota = async (req: Request, res: Response) => {
  const { collectionPrefix, role: requesterRole } = req.user!;
  const { userId } = req.params;
  const { pl, cl, sl, resetToDefault } = req.body;

  // Security Check: Only SuperAdmin or CompanyAdmin can update quotas
  if (requesterRole !== 'SuperAdmin' && requesterRole !== 'CompanyAdmin') {
    return res.status(403).json({ msg: 'Not authorized' });
  }

  // Validate userId is a valid ObjectId
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ msg: 'Invalid user ID format' });
  }

  try {
    const UserCollection = createUserModel(`${collectionPrefix}_users`);
    const user = await UserCollection.findById(userId);

    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // If resetToDefault is true, set customLeaveQuota to null
    if (resetToDefault === true) {
      user.customLeaveQuota = null;
      await user.save();

      return res.json({
        msg: 'User quota reset to organization default',
        user: {
          id: user._id,
          email: user.email,
          customLeaveQuota: null,
        },
      });
    }

    // Validate quota values if provided
    if (pl !== undefined && (typeof pl !== 'number' || pl < 0)) {
      return res.status(400).json({ msg: 'PL (Personal Leave) must be a non-negative number' });
    }
    if (cl !== undefined && (typeof cl !== 'number' || cl < 0)) {
      return res.status(400).json({ msg: 'CL (Casual Leave) must be a non-negative number' });
    }
    if (sl !== undefined && (typeof sl !== 'number' || sl < 0)) {
      return res.status(400).json({ msg: 'SL (Sick Leave) must be a non-negative number' });
    }

    // Update custom quota
    if (user.customLeaveQuota === null || user.customLeaveQuota === undefined) {
      user.customLeaveQuota = {
        pl: pl !== undefined ? pl : 0,
        cl: cl !== undefined ? cl : 0,
        sl: sl !== undefined ? sl : 0,
      };
    } else {
      if (pl !== undefined) user.customLeaveQuota.pl = pl;
      if (cl !== undefined) user.customLeaveQuota.cl = cl;
      if (sl !== undefined) user.customLeaveQuota.sl = sl;
    }

    await user.save();

    res.json({
      msg: 'User quota updated successfully',
      user: {
        id: user._id,
        email: user.email,
        customLeaveQuota: user.customLeaveQuota,
      },
    });
  } catch (err: any) {
    console.error('Error updating user quota:', err);
    res.status(500).json({ msg: 'Server error while updating quota' });
  }
};

// @route   DELETE /api/users/profile-picture
// @desc    Remove profile picture for the logged-in user
// @access  Private
export const removeProfilePicture = async (req: Request, res: Response) => {
  const { collectionPrefix, id: userId } = req.user!;

  try {
    const UserCollection = createUserModel(`${collectionPrefix}_users`);
    const user = await UserCollection.findById(userId);

    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Delete profile picture file if exists
    if (user.profilePicture) {
      const oldImagePath = path.join(__dirname, '../../public', user.profilePicture);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    // Clear profile picture from user (set to undefined to remove it)
    user.profilePicture = undefined;
    await user.save();

    res.json({
      msg: 'Profile picture removed successfully',
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        profile: user.profile,
        profilePicture: user.profilePicture,
        createdAt: user.createdAt,
      },
    });
  } catch (err: any) {
    console.error('Error removing profile picture:', err);
    res.status(500).json({ msg: 'Server error while removing profile picture' });
  }
};

