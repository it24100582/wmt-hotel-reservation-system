import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Promotion from '../models/Promotion.js';

dotenv.config();

const now = new Date();
const daysFromNow = (days) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

const promotions = [
  {
    title: 'Welcome Saver',
    description: 'New guests get 12% off on bookings.',
    code: 'WELCOME12',
    discountType: 'percentage',
    discountValue: 12,
    validFrom: daysFromNow(-2),
    validUntil: daysFromNow(90),
    usageLimit: 500,
    isActive: true,
  },
  {
    title: 'Family Escape',
    description: '15% off for family stays.',
    code: 'FAMILY15',
    discountType: 'percentage',
    discountValue: 15,
    validFrom: daysFromNow(-1),
    validUntil: daysFromNow(60),
    usageLimit: 300,
    isActive: true,
  },
  {
    title: 'Suite Upgrade Deal',
    description: 'Flat Rs. 6000 discount for suite and deluxe bookings.',
    code: 'SUITE6000',
    discountType: 'fixed',
    discountValue: 6000,
    validFrom: daysFromNow(-7),
    validUntil: daysFromNow(45),
    usageLimit: 200,
    isActive: true,
  },
  {
    title: 'Weekend Bliss',
    description: '10% off for weekend getaway bookings.',
    code: 'WEEKEND10',
    discountType: 'percentage',
    discountValue: 10,
    validFrom: daysFromNow(-3),
    validUntil: daysFromNow(120),
    usageLimit: 800,
    isActive: true,
  },
  {
    title: 'Long Stay Bonus',
    description: 'Flat Rs. 8000 discount for extended stays.',
    code: 'LONG8000',
    discountType: 'fixed',
    discountValue: 8000,
    validFrom: daysFromNow(0),
    validUntil: daysFromNow(180),
    usageLimit: 150,
    isActive: true,
  },
  {
    title: 'Loyalty Gold',
    description: '18% loyalty discount for returning guests.',
    code: 'LOYAL18',
    discountType: 'percentage',
    discountValue: 18,
    validFrom: daysFromNow(-5),
    validUntil: daysFromNow(75),
    usageLimit: 250,
    isActive: true,
  },
  {
    title: 'Ocean View Special',
    description: 'Rs. 4500 off selected ocean-view rooms.',
    code: 'OCEAN4500',
    discountType: 'fixed',
    discountValue: 4500,
    validFrom: daysFromNow(-10),
    validUntil: daysFromNow(50),
    usageLimit: 220,
    isActive: true,
  },
  {
    title: 'Early Bird Advance',
    description: 'Book early and get 14% discount.',
    code: 'EARLY14',
    discountType: 'percentage',
    discountValue: 14,
    validFrom: daysFromNow(0),
    validUntil: daysFromNow(140),
    usageLimit: 400,
    isActive: true,
  },
];

const seedPromotions = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is missing in environment variables.');
  }

  await mongoose.connect(process.env.MONGO_URI);

  let inserted = 0;
  let updated = 0;

  for (const promo of promotions) {
    const code = String(promo.code).trim().toUpperCase();
    const existing = await Promotion.findOne({ code });

    if (existing) {
      await Promotion.updateOne(
        { _id: existing._id },
        {
          $set: {
            ...promo,
            code,
            usedCount: 0,
          },
        }
      );
      updated += 1;
    } else {
      await Promotion.create({
        ...promo,
        code,
        usedCount: 0,
      });
      inserted += 1;
    }
  }

  const total = await Promotion.countDocuments();
  console.log(`Promotion seeding complete. Inserted: ${inserted}, Updated: ${updated}, Total: ${total}`);

  await mongoose.disconnect();
};

seedPromotions()
  .then(() => process.exit(0))
  .catch(async (error) => {
    console.error('Failed to seed promotions:', error.message);
    try {
      await mongoose.disconnect();
    } catch {
      // ignore disconnect errors
    }
    process.exit(1);
  });
