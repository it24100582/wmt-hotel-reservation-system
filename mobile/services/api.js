import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform } from 'react-native';

// Normalization:
// - Accept EXPO_PUBLIC_API_URL with or without /api
// - Use localhost by default for web
// - Use LAN IP by default for real mobile devices
const getNativeBundleHost = () => {
  try {
    const scriptURL = NativeModules?.SourceCode?.scriptURL || '';
    if (!scriptURL) return '';

    // Example:
    // exp://192.168.43.118:8081
    // http://192.168.43.118:8081/index.bundle?platform=android
    const normalized = scriptURL.replace('exp://', 'http://');
    const match = normalized.match(/^https?:\/\/([^:/]+)/i);
    return match?.[1] || '';
  } catch (_error) {
    return '';
  }
};

const isLikelyLocalHost = (host) => {
  if (!host) return false;
  const value = String(host).toLowerCase();
  if (value === 'localhost' || value === '127.0.0.1' || value === '10.0.2.2') return true;
  if (value.endsWith('.local')) return true;
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(value);
};

const isAndroidEmulator = () => {
  if (Platform.OS !== 'android') return false;

  try {
    const constants = Platform?.constants || NativeModules?.PlatformConstants || {};
    const fingerprint = String(constants.Fingerprint || '').toLowerCase();
    const model = String(constants.Model || '').toLowerCase();
    const manufacturer = String(constants.Manufacturer || '').toLowerCase();
    const brand = String(constants.Brand || '').toLowerCase();
    const product = String(constants.Product || '').toLowerCase();

    return (
      fingerprint.includes('generic') ||
      fingerprint.includes('emulator') ||
      model.includes('sdk') ||
      model.includes('emulator') ||
      manufacturer.includes('genymotion') ||
      brand.includes('generic') ||
      product.includes('sdk')
    );
  } catch (_error) {
    return false;
  }
};

const replaceHostWithAndroidEmulatorLoopback = (url) => {
  if (!url) return '';
  return url.replace(/^https?:\/\/([^/:]+)/i, (_match, host) => {
    const isAlreadyLoopback =
      String(host).toLowerCase() === '10.0.2.2' ||
      String(host).toLowerCase() === '127.0.0.1' ||
      String(host).toLowerCase() === 'localhost';
    if (isAlreadyLoopback) return _match;
    return _match.replace(host, '10.0.2.2');
  });
};

const nativeHost = getNativeBundleHost();
const safeNativeHost = isLikelyLocalHost(nativeHost) ? nativeHost : '';
const DEFAULT_BASE_URL = Platform.select({
  web: 'http://localhost:5001',
  default: safeNativeHost ? `http://${safeNativeHost}:5001` : 'http://172.28.20.171:5001',
});

const normalizedEnvUrl = process.env.EXPO_PUBLIC_API_URL
  ? process.env.EXPO_PUBLIC_API_URL.trim().replace(/\/+$/, '').replace(/\/api$/i, '')
  : '';

const forceAndroidEmulatorLoopback = /^(1|true|yes)$/i.test(
  String(process.env.EXPO_PUBLIC_ANDROID_EMULATOR_LOOPBACK || '').trim()
);
const shouldUseAndroidEmulatorLoopback = forceAndroidEmulatorLoopback || isAndroidEmulator();
const resolvedEnvUrl = shouldUseAndroidEmulatorLoopback
  ? replaceHostWithAndroidEmulatorLoopback(normalizedEnvUrl)
  : normalizedEnvUrl;

const BASE_URL = resolvedEnvUrl || DEFAULT_BASE_URL;
const API_BASE_URL = `${BASE_URL}/api`;

if (__DEV__) {
  console.log('API BASE URL:', API_BASE_URL);
  console.log('Detected bundle host:', nativeHost || '(none)');
  console.log('EXPO_PUBLIC_API_URL:', normalizedEnvUrl || '(not set)');
  console.log(
    'EXPO_PUBLIC_ANDROID_EMULATOR_LOOPBACK:',
    forceAndroidEmulatorLoopback ? 'true' : '(not set)'
  );
  console.log('Android emulator mode:', shouldUseAndroidEmulatorLoopback ? 'yes' : 'no');
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - attach JWT token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (_e) {
      // ignore token read errors
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - return backend error when available, network-safe message otherwise
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      return Promise.reject(new Error(`Cannot connect to server (${API_BASE_URL})`));
    }

    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'Something went wrong';

    return Promise.reject(new Error(message));
  }
);

// Auth APIs
export const registerUser = async (data) => {
  console.log('Register API:', `${API_BASE_URL}/auth/register`);
  return api.post('/auth/register', data);
};
export const requestRegisterOtp = async (data) => {
  console.log('Request OTP API:', `${API_BASE_URL}/auth/register/request-otp`);
  return api.post('/auth/register/request-otp', data);
};
export const verifyRegisterOtp = async (data) => {
  console.log('Verify OTP API:', `${API_BASE_URL}/auth/register/verify-otp`);
  return api.post('/auth/register/verify-otp', data);
};
export const loginUser = (data) => {
  console.log('Login API:', `${API_BASE_URL}/auth/login`);
  return api.post('/auth/login', data);
};
export const getMe = () => api.get('/auth/me');
export const updateMe = (data) => api.put('/auth/me', data);

// Room APIs
export const getRooms = (params) => api.get('/rooms', { params });
export const getRoomById = (id) => api.get(`/rooms/${id}`);
export const createRoom = (data) => api.post('/rooms', data);
export const updateRoom = (id, data) => api.put(`/rooms/${id}`, data);
export const deleteRoom = (id) => api.delete(`/rooms/${id}`);

// Booking APIs
export const createBooking = (data) => api.post('/bookings', data);
export const getMyBookings = () => api.get('/bookings/my');
export const getAllBookings = () => api.get('/bookings');
export const updateBookingStatus = (id, status) => api.put(`/bookings/${id}/status`, { status });
export const cancelBooking = (id) => api.delete(`/bookings/${id}`);
export const uploadBankTransferProof = async (file) => {
  const formData = new FormData();
  formData.append('proof', {
    uri: file.uri,
    name: file.name || `proof-${Date.now()}`,
    type: file.mimeType || file.type || 'application/octet-stream',
  });

  const token = await AsyncStorage.getItem('token');
  const response = await axios.post(`${BASE_URL}/api/bookings/upload-proof`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};

// Admin user APIs
export const getAdminUsers = () => api.get('/admin/users');
export const updateAdminUser = (id, data) => api.put(`/admin/users/${id}`, data);
export const getAdminPromotions = () => api.get('/admin/promotions');
export const createAdminPromotion = (data) => api.post('/admin/promotions', data);
export const updateAdminPromotion = (id, data) => api.put(`/admin/promotions/${id}`, data);

// Public promotion APIs
export const getActivePromotions = () => api.get('/promotions/active');
export const validatePromotionCode = (data) => api.post('/promotions/validate', data);

// Upload API
export const uploadImage = async (imageUri) => {
  const formData = new FormData();
  const filename = imageUri.split('/').pop();
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : 'image/jpeg';
  formData.append('image', { uri: imageUri, name: filename, type });

  const token = await AsyncStorage.getItem('token');
  const response = await axios.post(`${BASE_URL}/api/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

export default api;
export { BASE_URL, API_BASE_URL };
