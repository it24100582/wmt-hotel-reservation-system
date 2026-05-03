import User from '../models/User.js';
import { isValidSriLankanPhone, toStoredSriLankanPhone } from '../utils/phoneUtils.js';
import { isValidPersonName, normalizeNameInput } from '../utils/nameUtils.js';

export const getUsers = async (_req, res) => {
  const users = await User.find().select('-password').sort({ createdAt: -1 });
  return res.json({ count: users.length, users });
};

export const updateUser = async (req, res) => {
  const { name, email, phone, role } = req.body;
  const allowedRoles = ['guest', 'admin'];
  const normalizedName = normalizeNameInput(name);
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (!normalizedName || !normalizedEmail) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  if (!isValidPersonName(normalizedName)) {
    return res.status(400).json({ error: 'Name can only contain letters and spaces' });
  }

  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ error: 'Role must be guest or admin' });
  }

  if (!isValidSriLankanPhone(phone)) {
    return res.status(400).json({
      error: 'Please enter a valid Sri Lankan phone number (e.g. 0771234567 or +94771234567)',
    });
  }

  const emailExists = await User.findOne({
    email: normalizedEmail,
    _id: { $ne: req.params.id },
  });

  if (emailExists) {
    return res.status(400).json({ error: 'Email already in use by another account' });
  }

  const updated = await User.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        name: normalizedName,
        email: normalizedEmail,
        phone: toStoredSriLankanPhone(phone),
        role,
      },
    },
    { new: true, runValidators: true }
  ).select('-password');

  if (!updated) {
    return res.status(404).json({ error: 'User not found' });
  }

  return res.json({ message: 'User updated successfully', user: updated });
};
