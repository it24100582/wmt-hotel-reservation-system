import express from 'express';
import { handleUploadError, upload, uploadImage } from '../controllers/uploadController.js';
import { adminOnly, protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/', protect, adminOnly, upload.single('image'), uploadImage);
router.use(handleUploadError);

export default router;
