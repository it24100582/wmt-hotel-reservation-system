import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Booking user is required'],
      index: true,
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: [true, 'Booking room is required'],
      index: true,
    },
    checkInDate: {
      type: Date,
      required: [true, 'Check-in date is required'],
    },
    checkOutDate: {
      type: Date,
      required: [true, 'Check-out date is required'],
      validate: {
        validator(value) {
          return this.checkInDate ? value > this.checkInDate : true;
        },
        message: 'Check-out date must be after check-in date',
      },
    },
    totalPrice: {
      type: Number,
      required: [true, 'Total price is required'],
      min: [0, 'Total price cannot be negative'],
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled'],
      default: 'pending',
      index: true,
    },
  },
  { timestamps: true }
);

const Booking = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);

export default Booking;
