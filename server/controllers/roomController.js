import Room from '../models/Room.js';

export const getRooms = async (req, res) => {
  const { roomType, availabilityStatus, maxPrice, minPrice } = req.query;
  const filter = {};

  if (roomType) filter.roomType = roomType;
  if (availabilityStatus) filter.availabilityStatus = availabilityStatus;
  if (maxPrice) filter.pricePerMonth = { ...filter.pricePerMonth, $lte: Number(maxPrice) };
  if (minPrice) filter.pricePerMonth = { ...filter.pricePerMonth, $gte: Number(minPrice) };

  const rooms = await Room.find(filter).sort({ pricePerMonth: 1 });
  return res.json({ count: rooms.length, rooms });
};

export const getRoomById = async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  return res.json(room);
};

export const createRoom = async (req, res) => {
  const {
    roomNumber,
    roomType,
    pricePerMonth,
    capacity,
    description,
    imageUrl,
    availabilityStatus,
    amenities,
    view,
  } = req.body;

  if (!roomNumber || !roomType || !pricePerMonth || !capacity) {
    return res.status(400).json({ error: 'roomNumber, roomType, pricePerMonth and capacity are required' });
  }

  const room = await Room.create({
    roomNumber,
    roomType,
    pricePerMonth,
    capacity,
    description,
    imageUrl,
    availabilityStatus,
    amenities,
    view,
  });

  return res.status(201).json({ message: 'Room created successfully', room });
};

export const updateRoom = async (req, res) => {
  const room = await Room.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });

  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  return res.json({ message: 'Room updated successfully', room });
};

export const deleteRoom = async (req, res) => {
  const room = await Room.findByIdAndDelete(req.params.id);

  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  return res.json({ message: 'Room deleted successfully' });
};
