import axios from 'axios';

const getBaseUrl = () => {
  // If explicitly provided via environment variable
  if (process.env.NEXT_PUBLIC_API_URL) {
    let url = process.env.NEXT_PUBLIC_API_URL.trim();
    // Strip trailing slashes
    url = url.replace(/\/+$/, '');
    // If it is just a path like "/api", return as-is
    if (url.startsWith('/') && url.length > 1) {
      return url;
    }
    // If it's a full URL and doesn't end with /api, append /api
    if (url.startsWith('http://') || url.startsWith('https://')) {
      if (!url.endsWith('/api')) {
        url = `${url}/api`;
      }
      return url;
    }
    return url;
  }

  // Local development fallback
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.')) {
      return `http://${host}:5000/api`;
    }
  }

  // Production fallback if NEXT_PUBLIC_API_URL was not set in Vercel
  return 'https://bpserp.onrender.com/api';
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
