import mongoose from 'mongoose';

const maintenanceRequestSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: [true, 'Room reference is required'],
      index: true,
    },
    issue: {
      type: String,
      required: [true, 'Issue description is required'],
      trim: true,
      minlength: [5, 'Issue must be at least 5 characters'],
      maxlength: [1000, 'Issue cannot exceed 1000 characters'],
    },
    status: {
      type: String,
      enum: ['pending', 'resolved'],
      default: 'pending',
      index: true,
    },
    reportedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const MaintenanceRequest =
  mongoose.models.MaintenanceRequest || mongoose.model('MaintenanceRequest', maintenanceRequestSchema);

export default MaintenanceRequest;
