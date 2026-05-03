export const normalizePhoneInput = (value) =>
  String(value || '')
    .replace(/[\s()-]/g, '')
    .trim();

export const isValidSriLankanPhone = (value) => {
  const normalized = normalizePhoneInput(value);
  if (!normalized) return true; // optional field

  return (
    /^0[1-9]\d{8}$/.test(normalized) ||
    /^94[1-9]\d{8}$/.test(normalized) ||
    /^\+94[1-9]\d{8}$/.test(normalized)
  );
};

export const toStoredSriLankanPhone = (value) => {
  const normalized = normalizePhoneInput(value);
  if (!normalized) return '';

  if (/^\+94[1-9]\d{8}$/.test(normalized)) return normalized;
  if (/^94[1-9]\d{8}$/.test(normalized)) return `+${normalized}`;
  if (/^0[1-9]\d{8}$/.test(normalized)) return `+94${normalized.slice(1)}`;
  return normalized;
};
