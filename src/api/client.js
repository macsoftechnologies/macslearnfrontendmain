import axios from 'axios';
import toast from 'react-hot-toast';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from '../utils/tokenStorage';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
export const STATIC_BASE_URL = import.meta.env.VITE_STATIC_BASE_URL || 'http://localhost:5000';

export const buildStaticUrl = (path) => {
  if (!path) return '';
  if (typeof path === 'object' && path !== null) {
    path = path.url || path.src || '';
  }
  if (!path || typeof path !== 'string') return '';
  if (path.startsWith('http')) return path;
  
  const safePath = path.replace(/\\/g, '/');
  let normalizedPath = safePath.startsWith('/') ? safePath.substring(1) : safePath;

  if (normalizedPath.startsWith('public/')) {
    normalizedPath = normalizedPath.substring(7);
  }

  // Restore the public/ prefix specifically for launchpaad.tech as images rely on it
  if (normalizedPath.startsWith('uploads/') && STATIC_BASE_URL.includes('launchpaad.tech')) {
    normalizedPath = 'public/' + normalizedPath;
  }

  return `${STATIC_BASE_URL}/${encodeURI(normalizedPath)}`;
};

const client = axios.create({ baseURL: API_BASE_URL });

client.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  failedQueue = [];
};

client.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    const status = err.response?.status;

    if (status === 401) {
      const msg = err.response?.data?.message;
      if (msg === 'Organization subscription has expired' || msg === 'Please contact your Organization Administrator to restore access') {
        clearTokens();
        
        const displayMessage = msg === 'Organization subscription has expired' 
          ? "Your organization's subscription has expired. Please contact your administrator." 
          : "Access suspended. Please contact your Organization Administrator to restore access.";
          
        toast.error(displayMessage, { duration: 6000, id: 'sub-expired' });
        if (!window.location.pathname.includes('login')) {
          window.location.href = '/macslearnfrontend/login';
        }
        return Promise.reject(err);
      }
      
      if (!original?._retry && getRefreshToken()) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then((token) => {
            original.headers.Authorization = `Bearer ${token}`;
            return client(original);
          });
        }

        original._retry = true;
        isRefreshing = true;

        try {
          const { data } = await axios.post(
            `${API_BASE_URL}/auth/refresh-token`,
            { refreshToken: getRefreshToken() }
          );
          const newToken = data.data.accessToken;
          setTokens({ accessToken: newToken, refreshToken: data.data.refreshToken || getRefreshToken() });
          processQueue(null, newToken);
          original.headers.Authorization = `Bearer ${newToken}`;
          return client(original);
        } catch (refreshErr) {
          processQueue(refreshErr, null);
          clearTokens();
          if (!window.location.pathname.includes('login')) {
            window.location.href = '/login';
          }
          return Promise.reject(refreshErr);
        } finally {
          isRefreshing = false;
        }
      }
    }

    if (status === 429) {
      toast.error('Too many requests. Please wait a moment and try again.');
    } else if (status >= 500) {
      toast.error('Something went wrong on our end. Please try again.');
    }

    return Promise.reject(err);
  }
);

// Normalizes API error payloads: { message: string | string[] } → string[]
export const extractErrorMessages = (err) => {
  const payload = err?.response?.data;
  if (!payload) return ['Network error. Please check your connection.'];
  const msg = payload.message;
  if (Array.isArray(msg)) return msg;
  if (typeof msg === 'string') return [msg];
  return ['An unexpected error occurred.'];
};

export default client;
