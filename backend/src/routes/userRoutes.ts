import { Router } from 'express';
import { protect } from '../middleware/authMiddleware';
import { getOrganizationUsers } from '../controllers/userController';

const router = Router();

// @route   GET /api/users/my-organization
// @desc    Get all users in the token's organization
// @access  Private
router.get('/my-organization', protect, getOrganizationUsers);

export default router;

