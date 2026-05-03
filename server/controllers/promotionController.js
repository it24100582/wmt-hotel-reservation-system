import Promotion from '../models/Promotion.js';
import {
  calculateDiscountAmount,
  isPromotionValidNow,
  normalizePromotionCode,
} from '../utils/promotionUtils.js';

const toDate = (value) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const validatePromotionPayload = ({
  title,
  code,
  discountType,
  discountValue,
  validFrom,
  validUntil,
  usageLimit,
}) => {
  if (!String(title || '').trim()) return 'Title is required';
  if (!String(code || '').trim()) return 'Code is required';

  if (!['percentage', 'fixed'].includes(discountType)) {
    return 'Discount type must be percentage or fixed';
  }

  const numericDiscount = Number(discountValue);
  if (!Number.isFinite(numericDiscount) || numericDiscount <= 0) {
    return 'Discount value must be greater than 0';
  }

  if (discountType === 'percentage' && numericDiscount > 100) {
    return 'Percentage discount cannot be more than 100';
  }

  const fromDate = toDate(validFrom);
  const untilDate = toDate(validUntil);
  if (!fromDate || !untilDate) return 'Valid from and valid until must be valid dates';
  if (untilDate < fromDate) return 'Valid until must be on or after valid from date';

  if (usageLimit !== null && usageLimit !== undefined && usageLimit !== '') {
    const parsedLimit = Number(usageLimit);
    if (!Number.isInteger(parsedLimit) || parsedLimit < 1) {
      return 'Usage limit must be a whole number greater than 0';
    }
  }

  return '';
};

const toPublicPromotion = (promotion) => {
  const obj = promotion.toObject();
  delete obj.usedCount;
  delete obj.usageLimit;
  delete obj.createdBy;
  return obj;
};

export const getActivePromotions = async (_req, res) => {
  const now = new Date();

  const promotions = await Promotion.find({ isActive: true }).sort({ validUntil: 1, createdAt: -1 });
  const active = promotions.filter((item) => isPromotionValidNow(item, now)).map(toPublicPromotion);

  return res.json({ count: active.length, promotions: active });
};

export const validatePromotionCode = async (req, res) => {
  const code = normalizePromotionCode(req.body?.code);
  const amount = Number(req.body?.amount);

  if (!code) {
    return res.status(400).json({ error: 'Promotion code is required' });
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Amount must be greater than 0' });
  }

  const promotion = await Promotion.findOne({ code });
  if (!promotion) {
    return res.status(404).json({ error: 'Invalid promotion code' });
  }

  if (!isPromotionValidNow(promotion)) {
    return res.status(400).json({ error: 'Promotion code is expired or inactive' });
  }

  const discountAmount = Number(calculateDiscountAmount({ amount, promotion }).toFixed(2));
  const finalAmount = Number(Math.max(amount - discountAmount, 0).toFixed(2));

  return res.json({
    message: 'Promotion applied successfully',
    promotion: toPublicPromotion(promotion),
    amount: Number(amount.toFixed(2)),
    discountAmount,
    finalAmount,
  });
};

export const getAdminPromotions = async (_req, res) => {
  const promotions = await Promotion.find().sort({ createdAt: -1 });
  return res.json({ count: promotions.length, promotions });
};

export const createPromotion = async (req, res) => {
  const {
    title,
    description,
    code,
    discountType = 'percentage',
    discountValue,
    validFrom,
    validUntil,
    usageLimit = null,
    isActive = true,
  } = req.body || {};

  const validationError = validatePromotionPayload({
    title,
    code,
    discountType,
    discountValue,
    validFrom,
    validUntil,
    usageLimit,
  });
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const normalizedCode = normalizePromotionCode(code);
  const exists = await Promotion.findOne({ code: normalizedCode });
  if (exists) {
    return res.status(400).json({ error: 'Promotion code already exists' });
  }

  const promotion = await Promotion.create({
    title: String(title).trim(),
    description: String(description || '').trim(),
    code: normalizedCode,
    discountType,
    discountValue: Number(discountValue),
    validFrom: new Date(validFrom),
    validUntil: new Date(validUntil),
    usageLimit: usageLimit === '' || usageLimit === null || usageLimit === undefined ? null : Number(usageLimit),
    isActive: Boolean(isActive),
    createdBy: req.user?._id || null,
  });

  return res.status(201).json({ message: 'Promotion created successfully', promotion });
};

export const updatePromotion = async (req, res) => {
  const promotion = await Promotion.findById(req.params.id);
  if (!promotion) {
    return res.status(404).json({ error: 'Promotion not found' });
  }

  const {
    title = promotion.title,
    description = promotion.description,
    code = promotion.code,
    discountType = promotion.discountType,
    discountValue = promotion.discountValue,
    validFrom = promotion.validFrom,
    validUntil = promotion.validUntil,
    usageLimit = promotion.usageLimit,
    isActive = promotion.isActive,
  } = req.body || {};

  const validationError = validatePromotionPayload({
    title,
    code,
    discountType,
    discountValue,
    validFrom,
    validUntil,
    usageLimit,
  });
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const normalizedCode = normalizePromotionCode(code);
  const codeOwner = await Promotion.findOne({ code: normalizedCode, _id: { $ne: promotion._id } });
  if (codeOwner) {
    return res.status(400).json({ error: 'Promotion code already exists' });
  }

  promotion.title = String(title).trim();
  promotion.description = String(description || '').trim();
  promotion.code = normalizedCode;
  promotion.discountType = discountType;
  promotion.discountValue = Number(discountValue);
  promotion.validFrom = new Date(validFrom);
  promotion.validUntil = new Date(validUntil);
  promotion.usageLimit =
    usageLimit === '' || usageLimit === null || usageLimit === undefined ? null : Number(usageLimit);
  promotion.isActive = Boolean(isActive);

  await promotion.save();

  return res.json({ message: 'Promotion updated successfully', promotion });
};
