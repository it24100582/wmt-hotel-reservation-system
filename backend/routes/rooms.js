import express from 'express';
import {
  createRoom,
  deleteRoom,
  getRoomById,
  getRooms,
  updateRoom,
} from '../controllers/roomController.js';
import { adminOnly, protect } from '../middleware/auth.js';
import asyncHandler from '../middleware/asyncHandler.js';

const router = express.Router();

router.get('/', asyncHandler(getRooms));
router.get('/:id', asyncHandler(getRoomById));
router.post('/', protect, adminOnly, asyncHandler(createRoom));
router.put('/:id', protect, adminOnly, asyncHandler(updateRoom));
router.delete('/:id', protect, adminOnly, asyncHandler(deleteRoom));

export default router;
