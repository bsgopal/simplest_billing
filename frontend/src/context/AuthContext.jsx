import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // Read customerCode from URL query parameters (e.g. ?code=CLIENT1 or ?tenant=CLIENT1) or localStorage
  const getInitialCustomerCode = () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlCode = urlParams.get('code') || urlParams.get('customerCode') || urlParams.get('tenant') || urlParams.get('clientId');
      if (urlCode) {
        const clean = urlCode.trim().toLowerCase();
        localStorage.setItem('simple_billing_customer_code', clean);
        return clean;
      }
      return localStorage.getItem('simple_billing_customer_code') || 'default';
    } catch {
      return 'default';
    }
  };

  const [customerCode, setCustomerCodeState] = useState(getInitialCustomerCode);

  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('simple_billing_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [shop, setShop] = useState(() => {
    try {
      const saved = localStorage.getItem('simple_billing_shop');
      return saved ? JSON.parse(saved) : { shopName: 'Simple Retail Store' };
    } catch {
      return { shopName: 'Simple Retail Store' };
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem('simple_billing_token') || '');
  const [loading, setLoading] = useState(true);

  // Configure Axios default headers & interceptors
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
    axios.defaults.headers.common['X-Customer-Code'] = customerCode;
    axios.defaults.headers.common['X-Customer-Id'] = customerCode;
  }, [token, customerCode]);

  const setCustomerCode = (code) => {
    const clean = String(code || 'default').trim().toLowerCase();
    setCustomerCodeState(clean);
    localStorage.setItem('simple_billing_customer_code', clean);
    axios.defaults.headers.common['X-Customer-Code'] = clean;
    axios.defaults.headers.common['X-Customer-Id'] = clean;
  };

  useEffect(() => {
    const fetchMe = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await axios.get('/api/auth/me');
        if (res.data?.user) {
          setUser(res.data.user);
          localStorage.setItem('simple_billing_user', JSON.stringify(res.data.user));
        }
        if (res.data?.shop) {
          setShop(res.data.shop);
          localStorage.setItem('simple_billing_shop', JSON.stringify(res.data.shop));
        }
        if (res.data?.customerCode) {
          setCustomerCode(res.data.customerCode);
        }
      } catch (err) {
        if (err.response?.status === 401) {
          logout();
        }
      } finally {
        setLoading(false);
      }
    };
    fetchMe();
  }, [token]);

  const login = async (credentials) => {
    // Support object credentials: { mode: 'PASSWORD'|'PIN', mobile, password, pin, userId, customerCode }
    const payload = typeof credentials === 'object' ? credentials : { pin: credentials, mode: 'PIN' };
    const targetCode = (payload.customerCode || customerCode || 'default').trim().toLowerCase();

    // Attach targetCode to header and payload
    const res = await axios.post('/api/auth/login', {
      ...payload,
      customerCode: targetCode
    }, {
      headers: {
        'X-Customer-Code': targetCode,
        'X-Customer-Id': targetCode
      }
    });

    const { token: newToken, user: newUser, shop: newShop, customerCode: resolvedCode } = res.data;

    const activeCode = resolvedCode || targetCode;
    setToken(newToken);
    setUser(newUser);
    if (newShop) setShop(newShop);
    setCustomerCode(activeCode);

    localStorage.setItem('simple_billing_token', newToken);
    localStorage.setItem('simple_billing_user', JSON.stringify(newUser));
    if (newShop) localStorage.setItem('simple_billing_shop', JSON.stringify(newShop));
    localStorage.setItem('simple_billing_customer_code', activeCode);

    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    axios.defaults.headers.common['X-Customer-Code'] = activeCode;
    axios.defaults.headers.common['X-Customer-Id'] = activeCode;

    return res.data;
  };

  const logout = () => {
    setToken('');
    setUser(null);
    localStorage.removeItem('simple_billing_token');
    localStorage.removeItem('simple_billing_user');
    delete axios.defaults.headers.common['Authorization'];
  };

  const updateShop = (newShop) => {
    setShop(newShop);
    localStorage.setItem('simple_billing_shop', JSON.stringify(newShop));
  };

  return (
    <AuthContext.Provider value={{
      user,
      shop,
      token,
      customerCode,
      setCustomerCode,
      login,
      logout,
      updateShop,
      loading,
      isAuthenticated: Boolean(token && user)
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
