import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';

dotenv.config();

const now = () => new Date();

const buildContactMessages = () => [
  {
    name: 'Kasun Perera',
    email: 'kasun.perera@example.com',
    message: 'Need details about sea-view room availability for next weekend.',
    createdAt: now(),
    updatedAt: now(),
  },
  {
    name: 'Nadeesha Silva',
    email: 'nadeesha.silva@example.com',
    message: 'Can you confirm airport pickup options and charges?',
    createdAt: now(),
    updatedAt: now(),
  },
  {
    name: 'Amila Fernando',
    email: 'amila.fernando@example.com',
    message: 'I want to host a small event. Please share package options.',
    createdAt: now(),
    updatedAt: now(),
  },
  {
    name: 'Ishara Wickramasinghe',
    email: 'ishara.wick@example.com',
    message: 'Do you provide early check-in for family bookings?',
    createdAt: now(),
    updatedAt: now(),
  },
  {
    name: 'Tharindu Jayasinghe',
    email: 'tharindu.j@example.com',
    message: 'Please let me know if breakfast is included for deluxe rooms.',
    createdAt: now(),
    updatedAt: now(),
  },
];

const buildCoupons = () => [
  {
    code: 'WELCOME10',
    discountPercentage: 10,
    expiryDate: new Date('2026-12-31'),
    isActive: true,
    createdAt: now(),
    updatedAt: now(),
  },
  {
    code: 'SUMMER15',
    discountPercentage: 15,
    expiryDate: new Date('2026-09-30'),
    isActive: true,
    createdAt: now(),
    updatedAt: now(),
  },
  {
    code: 'FAMILY20',
    discountPercentage: 20,
    expiryDate: new Date('2026-11-30'),
    isActive: true,
    createdAt: now(),
    updatedAt: now(),
  },
  {
    code: 'WEEKDAY8',
    discountPercentage: 8,
    expiryDate: new Date('2026-10-31'),
    isActive: true,
    createdAt: now(),
    updatedAt: now(),
  },
  {
    code: 'LOYAL5',
    discountPercentage: 5,
    expiryDate: new Date('2027-01-31'),
    isActive: true,
    createdAt: now(),
    updatedAt: now(),
  },
];

const buildInventoryItems = () => [
  { name: 'Bath Towels', quantity: 120, status: 'in-stock' },
  { name: 'Bed Sheets', quantity: 80, status: 'in-stock' },
  { name: 'Shampoo Bottles', quantity: 45, status: 'low-stock' },
  { name: 'Toothbrush Kits', quantity: 0, status: 'out-of-stock' },
  { name: 'Mineral Water 500ml', quantity: 200, status: 'in-stock' },
].map((item) => ({ ...item, createdAt: now(), updatedAt: now() }));

const buildRoomAmenities = () => [
  {
    name: 'Free Wi-Fi',
    description: 'High-speed wireless internet available in all rooms.',
  },
  {
    name: 'Air Conditioning',
    description: 'Individually controlled air-conditioning system.',
  },
  {
    name: 'Mini Bar',
    description: 'In-room mini bar with snacks and beverages.',
  },
  {
    name: 'Ocean View Balcony',
    description: 'Private balcony with panoramic ocean view.',
  },
  {
    name: 'Smart TV',
    description: 'Flat-screen smart TV with streaming apps.',
  },
].map((item) => ({ ...item, createdAt: now(), updatedAt: now() }));

const buildPricings = () => [
  {
    roomType: 'single',
    pricePerNight: 18000,
    seasonalRates: [
      {
        seasonName: 'Peak Season',
        startDate: new Date('2026-12-01'),
        endDate: new Date('2027-01-15'),
        pricePerNight: 22000,
      },
    ],
  },
  {
    roomType: 'double',
    pricePerNight: 26000,
    seasonalRates: [
      {
        seasonName: 'Peak Season',
        startDate: new Date('2026-12-01'),
        endDate: new Date('2027-01-15'),
        pricePerNight: 31000,
      },
    ],
  },
  {
    roomType: 'deluxe',
    pricePerNight: 34000,
    seasonalRates: [
      {
        seasonName: 'Peak Season',
        startDate: new Date('2026-12-01'),
        endDate: new Date('2027-01-15'),
        pricePerNight: 39000,
      },
    ],
  },
  {
    roomType: 'suite',
    pricePerNight: 52000,
    seasonalRates: [
      {
        seasonName: 'Peak Season',
        startDate: new Date('2026-12-01'),
        endDate: new Date('2027-01-15'),
        pricePerNight: 59000,
      },
    ],
  },
  {
    roomType: 'family',
    pricePerNight: 42000,
    seasonalRates: [
      {
        seasonName: 'Peak Season',
        startDate: new Date('2026-12-01'),
        endDate: new Date('2027-01-15'),
        pricePerNight: 48000,
      },
    ],
  },
].map((item) => ({ ...item, createdAt: now(), updatedAt: now() }));

const pickRoomId = (rooms, index) => {
  if (!rooms.length) return new mongoose.Types.ObjectId();
  return rooms[index % rooms.length]._id;
};

const pickUserId = (users, index) => {
  if (!users.length) return null;
  return users[index % users.length]._id;
};

const buildHousekeepingTasks = (rooms, users) =>
  Array.from({ length: 5 }).map((_, index) => ({
    room: pickRoomId(rooms, index),
    status: ['dirty', 'in-progress', 'clean', 'dirty', 'in-progress'][index],
    assignedTo: pickUserId(users, index),
    notes: `Routine housekeeping task #${index + 1}`,
    createdAt: now(),
    updatedAt: now(),
  }));

const buildMaintenanceRequests = (rooms) =>
  [
    'Air conditioner cooling is weak.',
    'Bathroom shower tap is leaking.',
    'TV remote is not working properly.',
    'Door lock needs inspection.',
    'Balcony light needs replacement.',
  ].map((issue, index) => ({
    room: pickRoomId(rooms, index),
    issue,
    status: index % 2 === 0 ? 'pending' : 'resolved',
    reportedAt: now(),
    createdAt: now(),
    updatedAt: now(),
  }));

const seedIfEmpty = async (db, collectionName, rows) => {
  const collection = db.collection(collectionName);
  const count = await collection.countDocuments();

  if (count > 0) {
    console.log(`Skip ${collectionName}: already has ${count} documents.`);
    return;
  }

  await collection.insertMany(rows);
  console.log(`Inserted ${rows.length} documents into ${collectionName}.`);
};

const run = async () => {
  try {
    await connectDB();
    const db = mongoose.connection.db;

    const rooms = await db.collection('rooms').find({}, { projection: { _id: 1 } }).toArray();
    const users = await db.collection('users').find({}, { projection: { _id: 1 } }).toArray();

    await seedIfEmpty(db, 'contactmessages', buildContactMessages());
    await seedIfEmpty(db, 'coupons', buildCoupons());
    await seedIfEmpty(db, 'inventoryitems', buildInventoryItems());
    await seedIfEmpty(db, 'roomamenities', buildRoomAmenities());
    await seedIfEmpty(db, 'pricings', buildPricings());
    await seedIfEmpty(db, 'housekeepingtasks', buildHousekeepingTasks(rooms, users));
    await seedIfEmpty(db, 'maintenancerequests', buildMaintenanceRequests(rooms));

    console.log('Done. Empty collections are seeded with 5 records each.');
  } catch (error) {
    console.error(`Seed failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

run();
