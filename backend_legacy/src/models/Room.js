import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema(
  {
    roomNumber: {
      type: String,
      required: [true, 'Room number is required'],
      unique: true,
      trim: true,
      maxlength: [30, 'Room number cannot exceed 30 characters'],
    },
    type: {
      type: String,
      required: [true, 'Room type is required'],
      trim: true,
      enum: ['single', 'double', 'deluxe', 'suite', 'family'],
      index: true,
    },
    price: {
      type: Number,
      required: [true, 'Room price is required'],
      min: [0, 'Price cannot be negative'],
    },
    status: {
      type: String,
      enum: ['available', 'occupied'],
      default: 'available',
      index: true,
    },
    amenities: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RoomAmenity',
      },
    ],
  },
  { timestamps: true }
);

const Room = mongoose.models.Room || mongoose.model('Room', roomSchema);

export default Room;
