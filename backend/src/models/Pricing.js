import mongoose from 'mongoose';

const seasonalRateSchema = new mongoose.Schema(
  {
    seasonName: {
      type: String,
      trim: true,
      required: [true, 'Season name is required'],
      maxlength: [80, 'Season name cannot exceed 80 characters'],
    },
    startDate: {
      type: Date,
      required: [true, 'Season start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'Season end date is required'],
      validate: {
        validator(value) {
          return this.startDate ? value > this.startDate : true;
        },
        message: 'Season end date must be after start date',
      },
    },
    pricePerNight: {
      type: Number,
      required: [true, 'Seasonal price per night is required'],
      min: [0, 'Seasonal price cannot be negative'],
    },
  },
  { _id: false }
);

const pricingSchema = new mongoose.Schema(
  {
    roomType: {
      type: String,
      required: [true, 'Room type is required'],
      trim: true,
      enum: ['single', 'double', 'deluxe', 'suite', 'family'],
      unique: true,
      index: true,
    },
    pricePerNight: {
      type: Number,
      required: [true, 'Base price per night is required'],
      min: [0, 'Price per night cannot be negative'],
    },
    seasonalRates: {
      type: [seasonalRateSchema],
      default: [],
    },
  },
  { timestamps: true }
);

const Pricing = mongoose.models.Pricing || mongoose.model('Pricing', pricingSchema);

export default Pricing;
