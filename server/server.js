import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';

import authRoutes from './routes/auth.js';
import roomRoutes from './routes/rooms.js';
import bookingRoutes from './routes/bookings.js';
import uploadRoutes from './routes/upload.js';
import adminRoutes from './routes/admin.js';

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'OK',
    message: 'WMT API is running',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);

app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.originalUrl} not found` });
});

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const startServer = async () => {
  try {
    await connectDB();
    const basePort = Number(process.env.PORT) || 5001;

    const listenWithFallback = (port) => {
      const server = app.listen(port, () => {
        console.log(`WMT API server running on port ${port}`);
      });

      server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
          const nextPort = port + 1;
          console.warn(`Port ${port} is already in use. Retrying on port ${nextPort}...`);
          listenWithFallback(nextPort);
          return;
        }

        console.error('Server listen error:', error.message);
        process.exit(1);
      });
    };

    listenWithFallback(basePort);
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
