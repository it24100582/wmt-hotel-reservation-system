import User from '../models/User.js';

export const getUsers = async (_req, res) => {
  const users = await User.find().select('-password').sort({ createdAt: -1 });
  return res.json({ count: users.length, users });
};

export const updateUser = async (req, res) => {
  const { name, email, phone, role } = req.body;
  const allowedRoles = ['guest', 'admin'];

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ error: 'Role must be guest or admin' });
  }

  const emailExists = await User.findOne({
    email: String(email).trim().toLowerCase(),
    _id: { $ne: req.params.id },
  });

  if (emailExists) {
    return res.status(400).json({ error: 'Email already in use by another account' });
  }

  const updated = await User.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        name: String(name).trim(),
        email: String(email).trim().toLowerCase(),
        phone: String(phone || '').trim(),
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
