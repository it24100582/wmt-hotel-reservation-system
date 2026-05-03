import express from 'express';
import asyncHandler from '../middleware/asyncHandler.js';
import { getActivePromotions, validatePromotionCode } from '../controllers/promotionController.js';

const router = express.Router();

router.get('/active', asyncHandler(getActivePromotions));
router.post('/validate', asyncHandler(validatePromotionCode));

export default router;
