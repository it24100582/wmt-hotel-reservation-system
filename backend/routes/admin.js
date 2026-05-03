import express from 'express';
import { getUsers, updateUser } from '../controllers/adminController.js';
import {
  createPromotion,
  getAdminPromotions,
  updatePromotion,
} from '../controllers/promotionController.js';
import { adminOnly, protect } from '../middleware/auth.js';
import asyncHandler from '../middleware/asyncHandler.js';

const router = express.Router();

router.get('/users', protect, adminOnly, asyncHandler(getUsers));
router.put('/users/:id', protect, adminOnly, asyncHandler(updateUser));
router.get('/promotions', protect, adminOnly, asyncHandler(getAdminPromotions));
router.post('/promotions', protect, adminOnly, asyncHandler(createPromotion));
router.put('/promotions/:id', protect, adminOnly, asyncHandler(updatePromotion));

export default router;
