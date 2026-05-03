import mongoose from 'mongoose';

const connectWithUri = async (uri, label) => {
  const conn = await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
  });
  console.log(`MongoDB connected (${label}): ${conn.connection.host}`);
  return conn;
};

const connectDB = async () => {
  const primaryUri = process.env.MONGO_URI;
  const fallbackUri = process.env.MONGO_URI_FALLBACK;

  if (!primaryUri) {
    throw new Error('MONGO_URI is not defined. Please add it to your environment variables.');
  }

  try {
    return await connectWithUri(primaryUri, 'primary');
  } catch (primaryError) {
    if (!fallbackUri) {
      throw primaryError;
    }

    console.warn(`Primary MongoDB connection failed: ${primaryError.message}`);
    console.warn('Trying fallback MongoDB URI...');

    return connectWithUri(fallbackUri, 'fallback');
  }
};

export default connectDB;
