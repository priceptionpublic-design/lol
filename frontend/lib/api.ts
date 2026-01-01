import axios from 'axios';
import { API_URL as BACKEND_URL } from './config';

// Use the internal Next.js API proxy to avoid CORS and hide backend URL
// When running in the browser, call /api/proxy
// When running on the server (SSR), call the backend directly (sanitized in config.ts)
const isBrowser = typeof window !== 'undefined';
const API_URL = isBrowser ? '/api/proxy' : BACKEND_URL;

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    
    // If there's no response from the server, it's a network issue
    if (!error.response) {
      error.message = 'Network issue: Unable to connect to the server. Please check your internet connection or try again later.';
    }
    
    return Promise.reject(error);
  }
);

export default api;

