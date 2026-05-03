import express from 'express';
import {
  login,
  me,
  register,
  requestRegisterOtp,
  verifyRegisterOtp,
  updateMe,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import asyncHandler from '../middleware/asyncHandler.js';

const router = express.Router();

router.post('/register/request-otp', asyncHandler(requestRegisterOtp));
router.post('/register/verify-otp', asyncHandler(verifyRegisterOtp));
router.post('/register', asyncHandler(register));
router.post('/login', asyncHandler(login));
router.get('/me', protect, asyncHandler(me));
router.put('/me', protect, asyncHandler(updateMe));

export default router;
