import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { isValidSriLankanPhone } from '../utils/phoneUtils.js';
import { isValidPersonName } from '../utils/nameUtils.js';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
      validate: {
        validator: isValidPersonName,
        message: 'Name can only contain letters and spaces',
      },
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
      validate: {
        validator: isValidSriLankanPhone,
        message: 'Please enter a valid Sri Lankan phone number',
      },
    },
    role: {
      type: String,
      enum: ['guest', 'admin'],
      default: 'guest',
    },
    emailVerified: {
      type: Boolean,
      default: true,
    },
    emailOtpHash: {
      type: String,
      select: false,
      default: null,
    },
    emailOtpExpiresAt: {
      type: Date,
      default: null,
    },
    emailOtpLastSentAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

userSchema.pre('save', async function savePassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  return next();
});

userSchema.methods.comparePassword = async function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('User', userSchema);
