import Booking from '../models/Booking.js';
import Room from '../models/Room.js';

export const createBooking = async (req, res) => {
  const { roomId, startDate, endDate, notes } = req.body;

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
  const dailyRate = room.pricePerMonth / 30;
  const totalAmount = parseFloat((days * dailyRate).toFixed(2));

  const booking = await Booking.create({
    userId: req.user._id,
    roomId,
    startDate: start,
    endDate: end,
    totalAmount,
    notes: notes || '',
    status: 'Pending',
  });

  await booking.populate('roomId', 'roomNumber roomType pricePerMonth imageUrl');
  await booking.populate('userId', 'name email');

  return res.status(201).json({ message: 'Booking created successfully', booking });
};

export const getMyBookings = async (req, res) => {
  const bookings = await Booking.find({ userId: req.user._id })
    .populate('roomId', 'roomNumber roomType pricePerMonth imageUrl availabilityStatus')
    .sort({ createdAt: -1 });

  return res.json({ count: bookings.length, bookings });
};

export const getAllBookings = async (req, res) => {
  const bookings = await Booking.find()
    .populate('roomId', 'roomNumber roomType pricePerMonth')
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
