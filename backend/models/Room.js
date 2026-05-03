import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema(
  {
    roomNumber: {
      type: String,
      required: [true, 'Room number is required'],
      unique: true,
      trim: true,
    },
    roomType: {
      type: String,
      required: [true, 'Room type is required'],
      enum: ['Single', 'Double', 'Deluxe', 'Suite', 'Family'],
    },
    pricePerDay: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    // Deprecated legacy field kept temporarily for migration compatibility.
    pricePerMonth: {
      type: Number,
      default: undefined,
    },
    capacity: {
      type: Number,
      required: [true, 'Capacity is required'],
      min: [1, 'Capacity must be at least 1'],
    },
    currentOccupancy: {
      type: Number,
      default: 0,
      min: 0,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    imageUrl: {
      type: String,
      default: '',
    },
    availabilityStatus: {
      type: String,
      enum: ['Available', 'Occupied', 'Maintenance'],
      default: 'Available',
    },
    amenities: {
      type: [String],
      default: [],
    },
    view: {
      type: String,
      default: 'Garden View',
    },
  },
  { timestamps: true }
);

export default mongoose.model('Room', roomSchema);
