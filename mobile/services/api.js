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

const nativeHost = getNativeBundleHost();
const DEFAULT_BASE_URL = Platform.select({
  web: 'http://localhost:5001',
  default: nativeHost ? `http://${nativeHost}:5001` : 'http://172.28.20.171:5001',
});

const normalizedEnvUrl = process.env.EXPO_PUBLIC_API_URL
  ? process.env.EXPO_PUBLIC_API_URL.trim().replace(/\/+$/, '').replace(/\/api$/i, '')
  : '';

const BASE_URL = normalizedEnvUrl || DEFAULT_BASE_URL;
const API_BASE_URL = `${BASE_URL}/api`;

if (__DEV__) {
  console.log('API BASE URL:', API_BASE_URL);
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
      return Promise.reject(new Error('Cannot connect to server'));
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
export const loginUser = (data) => {
  console.log('Login API:', `${API_BASE_URL}/auth/login`);
  return api.post('/auth/login', data);
};
export const getMe = () => api.get('/auth/me');

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

// Admin user APIs
export const getAdminUsers = () => api.get('/admin/users');
export const updateAdminUser = (id, data) => api.put(`/admin/users/${id}`, data);

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
