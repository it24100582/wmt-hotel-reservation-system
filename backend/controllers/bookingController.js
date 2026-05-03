import Booking from '../models/Booking.js';
import Room from '../models/Room.js';
import Promotion from '../models/Promotion.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  calculateDiscountAmount,
  isPromotionValidNow,
  normalizePromotionCode,
} from '../utils/promotionUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const paymentProofDir = path.join(__dirname, '..', 'uploads', 'payment-proofs');
if (!fs.existsSync(paymentProofDir)) {
  fs.mkdirSync(paymentProofDir, { recursive: true });
}

const paymentProofStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, paymentProofDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `proof-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const paymentProofFilter = (_req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/jpg',
    'image/webp',
    'application/pdf',
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, WebP images or PDF files are allowed'), false);
  }
};

export const bankTransferProofUpload = multer({
  storage: paymentProofStorage,
  fileFilter: paymentProofFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

export const uploadBankTransferProof = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No proof file provided' });
  }

  return res.json({
    message: 'Payment proof uploaded successfully',
    proofUrl: `/uploads/payment-proofs/${req.file.filename}`,
    filename: req.file.filename,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
  });
};

export const handleBankTransferProofUploadError = (err, _req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Proof file size must not exceed 10MB' });
    }
    return res.status(400).json({ error: err.message });
  }

  if (err) {
    return res.status(400).json({ error: err.message });
  }

  return next();
};

export const createBooking = async (req, res) => {
  const {
    roomId,
    startDate,
    endDate,
    notes,
    promotionCode,
    paymentMethod,
    paymentProofUrl,
    paymentProofName,
    paymentProofMime,
  } = req.body;

  if (req.user?.emailVerified === false) {
    return res.status(403).json({ error: 'Please verify your email with OTP before creating a booking' });
  }

  if (!roomId || !startDate || !endDate) {
    return res.status(400).json({ error: 'roomId, startDate, and endDate are required' });
  }

  const room = await Room.findById(roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  if (room.availabilityStatus !== 'Available') {
    return res.status(400).json({ error: 'Room is not available for booking' });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (end <= start) {
    return res.status(400).json({ error: 'End date must be after start date' });
  }

  const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  const dailyRate = Number(room.pricePerDay ?? room.pricePerMonth ?? 0);
  const subtotalAmount = parseFloat((days * dailyRate).toFixed(2));
  const normalizedPaymentMethod = ['Card', 'Bank Transfer', 'Pay at Hotel'].includes(paymentMethod)
    ? paymentMethod
    : 'Card';

  if (normalizedPaymentMethod === 'Bank Transfer' && !String(paymentProofUrl || '').trim()) {
    return res.status(400).json({ error: 'Payment proof is required for Bank Transfer' });
  }

  let discountAmount = 0;
  let appliedPromotionCode = '';
  let appliedPromotionId = null;

  if (String(promotionCode || '').trim()) {
    appliedPromotionCode = normalizePromotionCode(promotionCode);
    const promotion = await Promotion.findOne({ code: appliedPromotionCode });

    if (!promotion) {
      return res.status(400).json({ error: 'Invalid promotion code' });
    }

    if (!isPromotionValidNow(promotion)) {
      return res.status(400).json({ error: 'Promotion code is expired or inactive' });
    }

    discountAmount = Number(calculateDiscountAmount({ amount: subtotalAmount, promotion }).toFixed(2));
    appliedPromotionId = promotion._id;
  }

  const totalAmount = Number(Math.max(subtotalAmount - discountAmount, 0).toFixed(2));

  const booking = await Booking.create({
    userId: req.user._id,
    roomId,
    startDate: start,
    endDate: end,
    totalAmount,
    subtotalAmount,
    discountAmount,
    promotionCode: appliedPromotionCode,
    paymentMethod: normalizedPaymentMethod,
    paymentProofUrl: String(paymentProofUrl || '').trim(),
    paymentProofName: String(paymentProofName || '').trim(),
    paymentProofMime: String(paymentProofMime || '').trim(),
    notes: notes || '',
    status: 'Pending',
  });

  await booking.populate('roomId', 'roomNumber roomType pricePerDay imageUrl');
  await booking.populate('userId', 'name email');

  if (appliedPromotionId) {
    await Promotion.findByIdAndUpdate(appliedPromotionId, { $inc: { usedCount: 1 } });
  }

  return res.status(201).json({ message: 'Booking created successfully', booking });
};

export const getMyBookings = async (req, res) => {
  const bookings = await Booking.find({ userId: req.user._id })
    .populate('roomId', 'roomNumber roomType pricePerDay imageUrl availabilityStatus')
    .sort({ createdAt: -1 });

  return res.json({ count: bookings.length, bookings });
};

export const getAllBookings = async (req, res) => {
  const bookings = await Booking.find()
    .populate('roomId', 'roomNumber roomType pricePerDay')
    .populate('userId', 'name email phone')
    .sort({ createdAt: -1 });

  return res.json({ count: bookings.length, bookings });
};

export const updateBookingStatus = async (req, res) => {
  const { status } = req.body;
  const allowed = ['Pending', 'Approved', 'Rejected'];

  if (!allowed.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${allowed.join(', ')}` });
  }

  const booking = await Booking.findByIdAndUpdate(req.params.id, { status }, { new: true }).populate(
    'roomId',
    'roomNumber roomType'
  );

  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  return res.json({ message: 'Booking status updated', booking });
};

export const cancelBooking = async (req, res) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  if (booking.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized to cancel this booking' });
  }

  if (booking.status === 'Approved') {
    return res.status(400).json({ error: 'Cannot cancel an approved booking. Contact the hotel.' });
  }

  await Booking.findByIdAndDelete(req.params.id);
  return res.json({ message: 'Booking cancelled successfully' });
};

