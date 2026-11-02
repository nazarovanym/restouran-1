import axios from 'axios';

// Əgər brauzerdə işləyirsə cari hostu (lokal şəbəkə IP və ya internet ünvanı), əks halda localhost:5000
export const getBaseOrigin = (): string => {
  if (typeof window !== 'undefined' && window.location.origin) {
    // Əgər frontend 5173 portunda dev rejimdədirsə, backend 5000-ə yönləndir
    if (window.location.port === '5173') {
      return `${window.location.protocol}//${window.location.hostname}:5000`;
    }
    return window.location.origin;
  }
  return 'http://localhost:5000';
};

export const API_BASE_URL = `${getBaseOrigin()}/api/v1`;

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor: add auth token
api.interceptors.request.use((config) => {
  config.baseURL = `${getBaseOrigin()}/api/v1`;
  const token = localStorage.getItem('rms_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Response interceptor
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.message || error.message || 'Xəta baş verdi';
    return Promise.reject(new Error(message));
  }
);
