import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import App from './App';
import './index.css';

// Base URL configuration for Vercel deployment (uses VITE_API_URL if defined, otherwise falls back to relative /api)
if (import.meta.env.VITE_API_URL) {
  const cleanUrl = String(import.meta.env.VITE_API_URL).trim().replace(/\/+$/, '');
  axios.defaults.baseURL = cleanUrl.endsWith('/api') ? cleanUrl.slice(0, -4) : cleanUrl;
}

// Global Axios configuration to ensure Authorization and Tenant headers are always attached
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('simple_billing_token');
    const customerCode = localStorage.getItem('simple_billing_customer_code') || 'default';
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    config.headers['X-Customer-Code'] = customerCode;
    config.headers['X-Customer-Id'] = customerCode;
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle expired sessions
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('simple_billing_token');
      localStorage.removeItem('simple_billing_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
