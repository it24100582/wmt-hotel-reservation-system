import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const COLLECTIONS = [
  'users',
  'rooms',
  'bookings',
  'pricings',
  'roomamenities',
  'contactmessages',
  'housekeepingtasks',
  'inventoryitems',
  'maintenancerequests',
  'coupons',
];

const getConnectionPlan = (mode, primaryUri, fallbackUri) => {
  if (mode === 'primary') {
    return [{ label: 'primary', uri: primaryUri }];
  }

  if (mode === 'fallback') {
    return [{ label: 'fallback', uri: fallbackUri }];
  }

  return [
    { label: 'primary', uri: primaryUri },
    { label: 'fallback', uri: fallbackUri },
  ];
};

const connectByMode = async (mode) => {
  const primaryUri = process.env.MONGO_URI;
  const fallbackUri = process.env.MONGO_URI_FALLBACK;
  const plan = getConnectionPlan(mode, primaryUri, fallbackUri).filter((item) => Boolean(item.uri));

  if (plan.length === 0) {
    throw new Error('No valid MongoDB URI found. Check MONGO_URI / MONGO_URI_FALLBACK.');
  }

  let lastError = null;

  for (const candidate of plan) {
    try {
      const conn = await mongoose.connect(candidate.uri, { serverSelectionTimeoutMS: 10000 });
      return { conn, label: candidate.label };
    } catch (error) {
      lastError = error;
      console.warn(`Failed to connect with ${candidate.label} URI: ${error.message}`);
    }
  }

  throw lastError || new Error('Could not connect to MongoDB.');
};

const ensureCollections = async () => {
  const mode = (process.argv[2] || 'auto').toLowerCase();

  if (!['auto', 'primary', 'fallback'].includes(mode)) {
    throw new Error('Invalid mode. Use: auto | primary | fallback');
  }

  const { conn, label } = await connectByMode(mode);
  const db = conn.connection.db;

  const existing = await db.listCollections({}, { nameOnly: true }).toArray();
  const existingNames = new Set(existing.map((collection) => collection.name));

  let createdCount = 0;

  for (const collectionName of COLLECTIONS) {
    if (!existingNames.has(collectionName)) {
      await db.createCollection(collectionName);
      createdCount += 1;
      console.log(`Created collection: ${collectionName}`);
    } else {
      console.log(`Collection exists: ${collectionName}`);
    }
  }

  console.log(`Done. Mode=${mode}, Connected=${label}, Created=${createdCount}, Total=${COLLECTIONS.length}`);
  await mongoose.disconnect();
};

ensureCollections().catch(async (error) => {
  console.error(`Collection init failed: ${error.message}`);
  try {
    await mongoose.disconnect();
  } catch (_error) {
    // ignore
  }
  process.exit(1);
});
