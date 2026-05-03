import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: [true, 'Room is required'],
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'Cancelled'],
      default: 'Pending',
    },
    totalAmount: {
      type: Number,
      default: 0,
    },
    subtotalAmount: {
      type: Number,
      default: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
    },
    promotionCode: {
      type: String,
      default: '',
      trim: true,
      uppercase: true,
    },
    paymentMethod: {
      type: String,
      enum: ['Card', 'Bank Transfer', 'Pay at Hotel'],
      default: 'Card',
    },
    paymentProofUrl: {
      type: String,
      default: '',
      trim: true,
    },
    paymentProofName: {
      type: String,
      default: '',
      trim: true,
    },
    paymentProofMime: {
      type: String,
      default: '',
      trim: true,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

export default mongoose.model('Booking', bookingSchema);
