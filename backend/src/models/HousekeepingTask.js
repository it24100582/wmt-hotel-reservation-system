import mongoose from 'mongoose';

const housekeepingTaskSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: [true, 'Room reference is required'],
      index: true,
    },
    status: {
      type: String,
      enum: ['clean', 'dirty', 'in-progress'],
      default: 'dirty',
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
  },
  { timestamps: true }
);

const HousekeepingTask =
  mongoose.models.HousekeepingTask || mongoose.model('HousekeepingTask', housekeepingTaskSchema);

export default HousekeepingTask;
