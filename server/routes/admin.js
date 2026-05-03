import express from 'express';
import { getUsers, updateUser } from '../controllers/adminController.js';
import { adminOnly, protect } from '../middleware/auth.js';
import asyncHandler from '../middleware/asyncHandler.js';

const router = express.Router();

router.get('/users', protect, adminOnly, asyncHandler(getUsers));
router.put('/users/:id', protect, adminOnly, asyncHandler(updateUser));

export default router;
