import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Room from '../models/Room.js';

dotenv.config();

const rooms = [
  {
    roomNumber: '101',
    roomType: 'Single',
    pricePerDay: 28000,
    capacity: 1,
    currentOccupancy: 0,
    description: 'Cozy single room ideal for solo stays.',
    imageUrl: '',
    availabilityStatus: 'Available',
    amenities: ['WiFi', 'AC', 'Study Desk'],
    view: 'Garden View',
  },
  {
    roomNumber: '102',
    roomType: 'Double',
    pricePerDay: 42000,
    capacity: 2,
    currentOccupancy: 0,
    description: 'Comfortable double room with modern furnishings.',
    imageUrl: '',
    availabilityStatus: 'Available',
    amenities: ['WiFi', 'AC', 'TV'],
    view: 'City View',
  },
  {
    roomNumber: '201',
    roomType: 'Deluxe',
    pricePerDay: 58000,
    capacity: 2,
    currentOccupancy: 1,
    description: 'Premium deluxe room with extra space and balcony.',
    imageUrl: '',
    availabilityStatus: 'Available',
    amenities: ['WiFi', 'AC', 'Mini Fridge', 'Balcony'],
    view: 'Ocean View',
  },
  {
    roomNumber: '202',
    roomType: 'Suite',
    pricePerDay: 85000,
    capacity: 3,
    currentOccupancy: 0,
    description: 'Luxury suite with separate lounge area.',
    imageUrl: '',
    availabilityStatus: 'Available',
    amenities: ['WiFi', 'AC', 'TV', 'Mini Bar', 'Room Service'],
    view: 'Ocean View',
  },
  {
    roomNumber: '301',
    roomType: 'Family',
    pricePerDay: 92000,
    capacity: 4,
    currentOccupancy: 0,
    description: 'Spacious family room with multiple beds.',
    imageUrl: '',
    availabilityStatus: 'Available',
    amenities: ['WiFi', 'AC', 'TV', 'Kitchenette'],
    view: 'Pool View',
  },
  {
    roomNumber: '302',
    roomType: 'Double',
    pricePerDay: 45000,
    capacity: 2,
    currentOccupancy: 0,
    description: 'Bright and airy double room near the pool wing.',
    imageUrl: '',
    availabilityStatus: 'Maintenance',
    amenities: ['WiFi', 'AC', 'TV'],
    view: 'Pool View',
  },
];

const seedRooms = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is missing in environment variables.');
  }

  await mongoose.connect(process.env.MONGO_URI);

  let inserted = 0;
  let updated = 0;

  for (const room of rooms) {
    const existing = await Room.findOne({ roomNumber: room.roomNumber });
    if (existing) {
      await Room.updateOne({ _id: existing._id }, { $set: room });
      updated += 1;
    } else {
      await Room.create(room);
      inserted += 1;
    }
  }

  const total = await Room.countDocuments();
  console.log(`Room seeding complete. Inserted: ${inserted}, Updated: ${updated}, Total: ${total}`);
  await mongoose.disconnect();
};

seedRooms()
  .then(() => process.exit(0))
  .catch(async (error) => {
    console.error('Failed to seed rooms:', error.message);
    try {
      await mongoose.disconnect();
    } catch {
      // ignore disconnect error
    }
    process.exit(1);
  });
