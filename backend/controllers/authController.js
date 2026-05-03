import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import User from '../models/User.js';
import RegistrationOtp from '../models/RegistrationOtp.js';
import { isValidSriLankanPhone, toStoredSriLankanPhone } from '../utils/phoneUtils.js';
import { isValidPersonName, normalizeNameInput } from '../utils/nameUtils.js';

const OTP_EXPIRY_MINUTES = Number(process.env.OTP_EXPIRY_MINUTES || 10);
const OTP_RESEND_INTERVAL_SECONDS = Number(process.env.OTP_RESEND_INTERVAL_SECONDS || 60);

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const isValidEmail = (value) => /^\S+@\S+\.\S+$/.test(value);
const generateOtpCode = () => String(Math.floor(100000 + Math.random() * 900000));

const hashOtpCode = (email, otp) =>
  crypto
    .createHash('sha256')
    .update(`${normalizeEmail(email)}:${String(otp)}:${process.env.JWT_SECRET || 'otp-secret'}`)
    .digest('hex');

const buildPublicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  emailVerified: user.emailVerified !== false,
});

const getMailTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
};

const sendOtpEmail = async ({ to, otp, name }) => {
  const transporter = getMailTransporter();
  if (!transporter) return { sent: false, reason: 'not_configured' };

  try {
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    await transporter.sendMail({
      from,
      to,
      subject: 'WMT account verification OTP',
      text: `Hello ${name || 'Guest'}, your WMT verification OTP is ${otp}. It expires in ${OTP_EXPIRY_MINUTES} minutes.`,
      html: `<p>Hello ${name || 'Guest'},</p><p>Your WMT verification OTP is <b>${otp}</b>.</p><p>This code expires in ${OTP_EXPIRY_MINUTES} minutes.</p>`,
    });
    return { sent: true };
  } catch (error) {
    return { sent: false, reason: 'send_failed', error };
  }
};

export const requestRegisterOtp = async (req, res) => {
  const { email, name } = req.body;
  const normalizedEmail = normalizeEmail(email);
  const normalizedName = normalizeNameInput(name);

  if (!normalizedEmail) {
    return res.status(400).json({ error: 'Please provide email' });
  }

  if (!isValidEmail(normalizedEmail)) {
    return res.status(400).json({ error: 'Please provide a valid email address' });
  }

  if (!isValidPersonName(normalizedName)) {
    return res.status(400).json({ error: 'Name can only contain letters and spaces' });
  }

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser && existingUser.emailVerified !== false) {
    return res.status(400).json({ error: 'Email already registered' });
  }

  const now = new Date();
  let otpRecord = await RegistrationOtp.findOne({ email: normalizedEmail }).select('+otpHash');

  if (otpRecord?.lastSentAt) {
    const elapsedSeconds = Math.floor((now.getTime() - new Date(otpRecord.lastSentAt).getTime()) / 1000);
    if (elapsedSeconds < OTP_RESEND_INTERVAL_SECONDS) {
      return res.status(429).json({
        error: `Please wait ${OTP_RESEND_INTERVAL_SECONDS - elapsedSeconds}s before requesting another OTP`,
      });
    }
  }

  const otp = generateOtpCode();
  const otpHash = hashOtpCode(normalizedEmail, otp);
  const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000);

  if (!otpRecord) {
    otpRecord = await RegistrationOtp.create({
      email: normalizedEmail,
      otpHash,
      expiresAt,
      lastSentAt: now,
      verified: false,
      verifiedAt: null,
    });
  } else {
    otpRecord.otpHash = otpHash;
    otpRecord.expiresAt = expiresAt;
    otpRecord.lastSentAt = now;
    otpRecord.verified = false;
    otpRecord.verifiedAt = null;
    await otpRecord.save();
  }

  const mailResult = await sendOtpEmail({ to: normalizedEmail, otp, name: normalizedName });
  if (!mailResult.sent && mailResult.reason === 'send_failed') {
    return res.status(500).json({ error: 'Failed to send OTP email. Please try again.' });
  }

  if (!mailResult.sent && process.env.NODE_ENV === 'production') {
    return res.status(500).json({ error: 'Email service is not configured' });
  }

  const response = {
    message: 'OTP sent to your email address',
    expiresInSeconds: OTP_EXPIRY_MINUTES * 60,
  };

  if (!mailResult.sent && process.env.NODE_ENV !== 'production') {
    response.devOtp = otp;
    response.message = 'OTP generated (email service not configured). Use devOtp in development.';
  }

  return res.status(200).json(response);
};

export const verifyRegisterOtp = async (req, res) => {
  const { email, otp } = req.body;
  const normalizedEmail = normalizeEmail(email);
  const normalizedOtp = String(otp || '').trim();

  if (!normalizedEmail || !normalizedOtp) {
    return res.status(400).json({ error: 'Please provide email and OTP' });
  }

  const otpRecord = await RegistrationOtp.findOne({ email: normalizedEmail }).select('+otpHash');
  if (!otpRecord) {
    return res.status(400).json({ error: 'Please request OTP first' });
  }

  if (new Date() > new Date(otpRecord.expiresAt)) {
    return res.status(400).json({ error: 'OTP has expired. Please request a new OTP.' });
  }

  if (hashOtpCode(normalizedEmail, normalizedOtp) !== otpRecord.otpHash) {
    return res.status(400).json({ error: 'Invalid OTP code' });
  }

  otpRecord.verified = true;
  otpRecord.verifiedAt = new Date();
  await otpRecord.save();

  return res.json({ message: 'OTP verified successfully. You can now set your password.' });
};

export const register = async (req, res) => {
  const { name, email, password, phone, role } = req.body;
  const normalizedName = normalizeNameInput(name);
  const normalizedEmail = normalizeEmail(email);
  const plainPassword = String(password || '');
  const normalizedPhone = String(phone || '').trim();

  if (!normalizedName || !normalizedEmail || !plainPassword) {
    return res.status(400).json({ error: 'Please provide name, email and password' });
  }

  if (!isValidPersonName(normalizedName)) {
    return res.status(400).json({ error: 'Name can only contain letters and spaces' });
  }

  if (!isValidEmail(normalizedEmail)) {
    return res.status(400).json({ error: 'Please provide a valid email address' });
  }

  if (plainPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  if (!isValidSriLankanPhone(normalizedPhone)) {
    return res.status(400).json({
      error: 'Please enter a valid Sri Lankan phone number (e.g. 0771234567 or +94771234567)',
    });
  }

  const otpRecord = await RegistrationOtp.findOne({ email: normalizedEmail });
  if (!otpRecord || !otpRecord.verified) {
    return res.status(400).json({ error: 'Please verify OTP before creating account' });
  }

  if (new Date() > new Date(otpRecord.expiresAt)) {
    return res.status(400).json({ error: 'OTP verification has expired. Please request OTP again.' });
  }

  let user = await User.findOne({ email: normalizedEmail }).select('+password +emailOtpHash');
  if (user && user.emailVerified !== false) {
    return res.status(400).json({ error: 'Email already registered' });
  }

  if (!user) {
    user = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      password: plainPassword,
      phone: toStoredSriLankanPhone(normalizedPhone),
      role: role === 'admin' ? 'guest' : role || 'guest',
      emailVerified: true,
    });
  } else {
    user.name = normalizedName;
    user.password = plainPassword;
    user.phone = toStoredSriLankanPhone(normalizedPhone);
    user.role = role === 'admin' ? 'guest' : role || 'guest';
    user.emailVerified = true;
    user.emailOtpHash = null;
    user.emailOtpExpiresAt = null;
    user.emailOtpLastSentAt = null;
    await user.save();
  }

  await RegistrationOtp.deleteOne({ email: normalizedEmail });

  const token = signToken(user._id);

  return res.status(201).json({
    message: 'Registration successful',
    token,
    user: buildPublicUser(user),
  });
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !password) {
    return res.status(400).json({ error: 'Please provide email and password' });
  }

  const user = await User.findOne({ email: normalizedEmail }).select('+password');
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  if (user.emailVerified === false) {
    return res.status(403).json({ error: 'Please verify your email with OTP before signing in' });
  }

  const token = signToken(user._id);

  return res.json({
    message: 'Login successful',
    token,
    user: buildPublicUser(user),
  });
};

export const me = async (req, res) => {
  return res.json({ user: req.user });
};

export const updateMe = async (req, res) => {
  const { name, email, phone } = req.body || {};

  const normalizedName = normalizeNameInput(name);
  const normalizedEmail = normalizeEmail(email);
  const normalizedPhone = String(phone || '').trim();

  if (!normalizedName || !normalizedEmail) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  if (!isValidPersonName(normalizedName)) {
    return res.status(400).json({ error: 'Name can only contain letters and spaces' });
  }

  if (!isValidEmail(normalizedEmail)) {
    return res.status(400).json({ error: 'Please provide a valid email address' });
  }

  if (!isValidSriLankanPhone(normalizedPhone)) {
    return res.status(400).json({
      error: 'Please enter a valid Sri Lankan phone number (e.g. 0771234567 or +94771234567)',
    });
  }

  const emailOwner = await User.findOne({
    email: normalizedEmail,
    _id: { $ne: req.user._id },
  });

  if (emailOwner) {
    return res.status(400).json({ error: 'Email already in use by another account' });
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  user.name = normalizedName;
  user.email = normalizedEmail;
  user.phone = toStoredSriLankanPhone(normalizedPhone);
  await user.save();

  return res.json({
    message: 'Profile updated successfully',
    user: buildPublicUser(user),
  });
};
