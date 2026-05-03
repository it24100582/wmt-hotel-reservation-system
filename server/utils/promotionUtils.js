export const normalizePromotionCode = (code) => String(code || '').trim().toUpperCase();

export const isPromotionValidNow = (promotion, at = new Date()) => {
  if (!promotion || !promotion.isActive) return false;

  const from = new Date(promotion.validFrom);
  const until = new Date(promotion.validUntil);
  if (Number.isNaN(from.getTime()) || Number.isNaN(until.getTime())) return false;
  if (from > at || until < at) return false;

  if (promotion.usageLimit !== null && promotion.usageLimit !== undefined) {
    if (Number(promotion.usedCount || 0) >= Number(promotion.usageLimit)) return false;
  }

  return true;
};

export const calculateDiscountAmount = ({ amount, promotion }) => {
  const safeAmount = Number(amount) || 0;
  const value = Number(promotion?.discountValue) || 0;

  if (safeAmount <= 0 || value <= 0) return 0;

  if (promotion.discountType === 'fixed') {
    return Math.min(safeAmount, value);
  }

  const percentage = Math.min(Math.max(value, 0), 100);
  return (safeAmount * percentage) / 100;
};
