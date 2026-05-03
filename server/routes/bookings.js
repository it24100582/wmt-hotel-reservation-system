import express from 'express';
import {
  cancelBooking,
  createBooking,
  getAllBookings,
  getMyBookings,
  updateBookingStatus,
} from '../controllers/bookingController.js';
import { adminOnly, protect } from '../middleware/auth.js';
import asyncHandler from '../middleware/asyncHandler.js';

const router = express.Router();

router.post('/', protect, asyncHandler(createBooking));
router.get('/my', protect, asyncHandler(getMyBookings));
router.get('/', protect, adminOnly, asyncHandler(getAllBookings));
router.put('/:id/status', protect, adminOnly, asyncHandler(updateBookingStatus));
router.delete('/:id', protect, asyncHandler(cancelBooking));

export default router;
