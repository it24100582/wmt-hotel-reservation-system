export const normalizeNameInput = (value) =>
  String(value || '')
    .trim()
    .replace(/\s+/g, ' ');

export const isValidPersonName = (value) => {
  const normalized = normalizeNameInput(value);
  if (!normalized) return false;

  return /^[A-Za-z]+(?: [A-Za-z]+)*$/.test(normalized);
};
