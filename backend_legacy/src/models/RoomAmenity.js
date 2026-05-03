import mongoose from 'mongoose';

const roomAmenitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Amenity name is required'],
      unique: true,
      trim: true,
      minlength: [2, 'Amenity name must be at least 2 characters'],
      maxlength: [100, 'Amenity name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [300, 'Description cannot exceed 300 characters'],
    },
  },
  { timestamps: true }
);

const RoomAmenity = mongoose.models.RoomAmenity || mongoose.model('RoomAmenity', roomAmenitySchema);

export default RoomAmenity;
