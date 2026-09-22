import axios from 'axios';

const PRODUCTION_API = 'https://bpserp.onrender.com/api';

const getBaseUrl = () => {
  // If explicitly provided via environment variable as a full URL
  if (process.env.NEXT_PUBLIC_API_URL) {
    const url = process.env.NEXT_PUBLIC_API_URL.trim().replace(/\/+$/, '');
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url.endsWith('/api') ? url : `${url}/api`;
    }
  }

  // Local development fallback
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.')) {
      return `http://${host}:5000/api`;
    }
  }

  // Production fallback
  return PRODUCTION_API;
};

const api = axios.create({
  baseURL: getBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('erp_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(err)
);

export default api;
