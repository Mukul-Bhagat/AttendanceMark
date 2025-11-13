import { Request, Response } from 'express';
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

