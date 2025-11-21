import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import createOrganizationSettingsModel from '../models/OrganizationSettings';

// @route   GET /api/organization/settings
// @desc    Get organization settings (lateAttendanceLimit)
// @access  Private (SuperAdmin only)
export const getOrganizationSettings = async (req: Request, res: Response) => {
  try {
    const { collectionPrefix, role } = req.user!;

    // Only SuperAdmin can access organization settings
    if (role !== 'SuperAdmin') {
      return res.status(403).json({ msg: 'Not authorized. Only SuperAdmin can access organization settings.' });
    }

    const OrganizationSettings = createOrganizationSettingsModel();

    // Find or create default settings for this organization
    let settings = await OrganizationSettings.findOne({ organizationPrefix: collectionPrefix });

    if (!settings) {
      // Create default settings if they don't exist
      settings = new OrganizationSettings({
        organizationPrefix: collectionPrefix,
        lateAttendanceLimit: 30, // Default: 30 minutes
      });
      await settings.save();
    }

    res.json({
      lateAttendanceLimit: settings.lateAttendanceLimit,
      isStrictAttendance: settings.isStrictAttendance || false,
    });
  } catch (err: any) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @route   PUT /api/organization/settings
// @desc    Update organization settings (lateAttendanceLimit)
// @access  Private (SuperAdmin only)
export const updateOrganizationSettings = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { collectionPrefix, role } = req.user!;
    const { lateAttendanceLimit, isStrictAttendance } = req.body;

    // Only SuperAdmin can update organization settings
    if (role !== 'SuperAdmin') {
      return res.status(403).json({ msg: 'Not authorized. Only SuperAdmin can update organization settings.' });
    }

    // Validate lateAttendanceLimit
    if (lateAttendanceLimit === undefined || lateAttendanceLimit === null) {
      return res.status(400).json({ msg: 'lateAttendanceLimit is required' });
    }

    if (typeof lateAttendanceLimit !== 'number' || lateAttendanceLimit < 0) {
      return res.status(400).json({ msg: 'lateAttendanceLimit must be a non-negative number' });
    }

    // Validate isStrictAttendance (optional, defaults to false)
    if (isStrictAttendance !== undefined && typeof isStrictAttendance !== 'boolean') {
      return res.status(400).json({ msg: 'isStrictAttendance must be a boolean' });
    }

    const OrganizationSettings = createOrganizationSettingsModel();

    // Find or create settings for this organization
    let settings = await OrganizationSettings.findOne({ organizationPrefix: collectionPrefix });

    if (!settings) {
      // Create new settings if they don't exist
      settings = new OrganizationSettings({
        organizationPrefix: collectionPrefix,
        lateAttendanceLimit,
        isStrictAttendance: isStrictAttendance !== undefined ? isStrictAttendance : false,
      });
    } else {
      // Update existing settings
      settings.lateAttendanceLimit = lateAttendanceLimit;
      if (isStrictAttendance !== undefined) {
        settings.isStrictAttendance = isStrictAttendance;
      }
    }

    await settings.save();

    res.json({
      msg: 'Organization settings updated successfully',
      lateAttendanceLimit: settings.lateAttendanceLimit,
      isStrictAttendance: settings.isStrictAttendance,
    });
  } catch (err: any) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

