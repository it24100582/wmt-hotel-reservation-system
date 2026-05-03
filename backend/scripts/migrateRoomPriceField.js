import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Room from '../models/Room.js';

dotenv.config();

const migrateRoomPriceField = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is missing in environment variables.');
  }

  await mongoose.connect(process.env.MONGO_URI);

  // 1) Copy legacy value to new field where needed.
  const copyResult = await Room.updateMany(
    {
      $and: [
        { $or: [{ pricePerDay: { $exists: false } }, { pricePerDay: null }] },
        { pricePerMonth: { $exists: true } },
      ],
    },
    [
      {
        $set: {
          pricePerDay: '$pricePerMonth',
        },
      },
    ]
  );

  // 2) Remove legacy field.
  const unsetResult = await Room.updateMany(
    { pricePerMonth: { $exists: true } },
    { $unset: { pricePerMonth: '' } }
  );

  const total = await Room.countDocuments();
  console.log(
    `Room price field migration complete. Copied: ${copyResult.modifiedCount}, RemovedLegacyField: ${unsetResult.modifiedCount}, TotalRooms: ${total}`
  );

  await mongoose.disconnect();
};

migrateRoomPriceField()
  .then(() => process.exit(0))
  .catch(async (error) => {
    console.error('Failed to migrate room price field:', error.message);
    try {
      await mongoose.disconnect();
    } catch {
      // ignore disconnect errors
    }
    process.exit(1);
  });
