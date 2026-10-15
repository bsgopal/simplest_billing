import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import logoImg from '../assets/logo.png';
import {
  Lock,
  Phone,
  Store,
  KeyRound,
  Eye,
  EyeOff,
  Zap,
  Package,
  BookOpen,
  Printer,
  ShieldCheck,
  Building2,
  Delete,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function Login() {
  const { login, customerCode, setCustomerCode, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Mode: 'PASSWORD' (default as requested) or 'PIN'
  const [mode, setMode] = useState('PASSWORD');

  // Form Fields
  const [shopCodeInput, setShopCodeInput] = useState(() => {
    const code = customerCode || localStorage.getItem('simple_billing_customer_code') || '';
    return code === 'default' ? '' : code;
  });
  const [mobile, setMobile] = useState(() => localStorage.getItem('simple_billing_last_mobile') || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // PIN Mode Fields
  const [pin, setPin] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');

  // UI state
  const [shopInfo, setShopInfo] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // If already authenticated, redirect to POS/Dashboard
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  // Fetch shop metadata and users for the current customerCode (debounced)
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const cleanCode = (shopCodeInput || '').trim().toLowerCase();
        const res = await axios.get('/api/auth/users', {
          headers: {
            'X-Customer-Code': cleanCode || 'default',
            'X-Customer-Id': cleanCode || 'default'
          }
        });
        setUsers(res.data.users || []);
        if (res.data.shop) {
          setShopInfo(res.data.shop);
        }
        if (res.data.users?.length === 1) {
          setSelectedUser(res.data.users[0]._id);
        }
      } catch (err) {
        // Fallback info if offline
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [shopCodeInput]);

  const handlePasswordLogin = async (e) => {
    if (e) e.preventDefault();
    if (!mobile.trim() || !password) {
      setError('Please enter both mobile number and password');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await login({
        mode: 'PASSWORD',
        mobile: mobile.trim(),
        password,
        customerCode: shopCodeInput.trim() || 'default'
      });
      localStorage.setItem('simple_billing_last_mobile', mobile.trim());
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const submitPin = async (pinValue) => {
    if (!pinValue || pinValue.length < 4) return;
    setLoading(true);
    setError('');
    try {
      await login({
        mode: 'PIN',
        pin: pinValue,
        userId: selectedUser,
        customerCode: shopCodeInput.trim() || 'default'
      });
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Wrong PIN. Please try again.');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const handlePinLogin = async (e) => {
    if (e) e.preventDefault();
    if (!pin) {
      setError('Please enter your 4-digit PIN');
      return;
    }
    await submitPin(pin);
  };

  const handlePinKey = (digit) => {
    if (pin.length < 6) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setError('');
      // Auto-trigger login once 4 digits are entered!
      if (nextPin.length === 4) {
        setTimeout(() => {
          submitPin(nextPin);
        }, 120);
      }
    }
  };

  const handlePinBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setError('');
  };

  const handlePinClear = () => {
    setPin('');
    setError('');
  };

  return (
    <div className="min-h-screen w-full bg-slate-100/70 text-slate-900 flex flex-col md:flex-row selection:bg-brand-500 selection:text-slate-950 font-sans">
      
      {/* ─────────────────────────────────────────────────────────────
          LEFT PANE (DESKTOP): Large Brand Logo & Company Features (like TextilePOS)
         ───────────────────────────────────────────────────────────── */}
      <div className="hidden md:flex md:w-1/2 lg:w-7/12 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-r border-slate-800 p-8 lg:p-12 flex-col justify-between relative overflow-hidden text-white">
        
        {/* Subtle decorative glow circles */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top: Big Logo & Titles */}
        <div className="relative z-10">
          <div className="flex items-center gap-5 mb-6">
            <div className="bg-white p-3.5 rounded-2xl shadow-2xl shadow-brand-500/10 border border-white/20 flex items-center justify-center">
              <img
                src={logoImg}
                alt="Brand Logo"
                className="h-20 lg:h-24 w-auto object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight uppercase">
                  Simple Billing POS
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-brand-500 text-slate-950 uppercase">
                  v1.0
                </span>
              </div>
              <p className="text-xs lg:text-sm text-brand-400 font-bold tracking-widest uppercase mt-0.5">
                Smart Retail &amp; Cloud ERP Suite
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Connected to Renic Soft Multi-Tenant Platform
              </p>
            </div>
          </div>

          <div className="my-6">
            <h2 className="text-2xl lg:text-4xl font-extrabold text-white leading-tight">
              Retail Counter &amp; Petti Shop <br />
              <span className="text-brand-400">High-Speed POS Software</span>
            </h2>
            <p className="text-sm text-slate-400 mt-2 max-w-xl leading-relaxed">
              Designed for petti shops, grocery stores, bakeries, and department counters. Sub-10 second fast billing, barcode lookup, fractional weight calculator, and automated customer Udhar khata.
            </p>
          </div>

          {/* Company Features List */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 my-8 max-w-2xl">
            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
              <div className="p-2.5 rounded-xl bg-brand-500/15 text-brand-400 shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Ultra-Fast POS Checkout</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Sub-10s billing, barcode scan, weight calc &amp; quick cash change return.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
              <div className="p-2.5 rounded-xl bg-brand-500/15 text-brand-400 shrink-0">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Stock &amp; Purchase Entry</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Multi-tenant isolated DB, wholesale inwards &amp; low stock alerts.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
              <div className="p-2.5 rounded-xl bg-brand-500/15 text-brand-400 shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Udhar Khata &amp; WhatsApp</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Customer credit tracking and 1-click WhatsApp payment reminders.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
              <div className="p-2.5 rounded-xl bg-brand-500/15 text-brand-400 shrink-0">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Thermal POS Printing</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  58mm (2-inch) &amp; 80mm slips with dynamic UPI payment QR code.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="relative z-10 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
          <span>&copy; {new Date().getFullYear()} Renic Soft &bull; Simple Billing</span>
          <span className="flex items-center gap-1.5 text-brand-400 font-semibold">
            <ShieldCheck className="w-4 h-4" /> Multi-Tenant Isolated DB
          </span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          RIGHT PANE (DESKTOP) / MAIN STACK (MOBILE): Login Card
         ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-12 relative overflow-y-auto">
        
        {/* Mobile Header: Big Logo & Shop Banner (visible only on mobile) */}
        <div className="md:hidden w-full max-w-md flex flex-col items-center mb-6 pt-4 text-center">
          <div className="bg-white p-3 rounded-2xl shadow-xl shadow-brand-500/10 border border-slate-200 mb-3 inline-flex items-center justify-center">
            <img
              src={logoImg}
              alt="Brand Logo"
              className="h-16 w-auto object-contain"
            />
          </div>
          <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">
            {shopInfo?.shopName || 'Simple Billing POS'}
          </h1>
          <p className="text-xs text-brand-600 font-bold uppercase tracking-wider mt-0.5">
            Smart Retail &amp; Cloud ERP
          </p>

          {/* Quick highlights pill row on mobile */}
          <div className="flex flex-wrap justify-center gap-1.5 mt-3">
            <span className="text-[10px] px-2 py-0.5 bg-white border border-slate-200 text-slate-700 rounded-full font-semibold shadow-2xs">
              ⚡ &lt;10s Billing
            </span>
            <span className="text-[10px] px-2 py-0.5 bg-white border border-slate-200 text-slate-700 rounded-full font-semibold shadow-2xs">
              ⚖️ Weight Calc
            </span>
            <span className="text-[10px] px-2 py-0.5 bg-white border border-slate-200 text-slate-700 rounded-full font-semibold shadow-2xs">
              📒 Udhar Khata
            </span>
          </div>
        </div>

        {/* The Login Card Container */}
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl relative">
          
          <div className="mb-6">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">Counter Sign In</h2>
            <p className="text-xs text-slate-500 mt-1">
              Select your preferred login method to access your billing counter
            </p>
          </div>

          {/* 2 Login Format Tabs (DEFAULT: Mobile & Password) */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl border border-slate-200 mb-6">
            <button
              type="button"
              onClick={() => { setMode('PASSWORD'); setError(''); }}
              className={`flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition ${
                mode === 'PASSWORD'
                  ? 'bg-brand-500 text-slate-950 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Mobile &amp; Password</span>
            </button>

            <button
              type="button"
              onClick={() => { setMode('PIN'); setError(''); }}
              className={`flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition ${
                mode === 'PIN'
                  ? 'bg-brand-500 text-slate-950 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>4-Digit PIN</span>
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Tenant / Shop Code Identifier */}
          <div className="mb-4">
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Tenant / Shop ID
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={shopCodeInput}
                onChange={(e) => setShopCodeInput(e.target.value.toLowerCase())}
                onBlur={() => setCustomerCode(shopCodeInput)}
                placeholder="e.g. main, demo, shop01"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm font-mono placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:bg-white"
              />
            </div>
            {shopCodeInput && shopCodeInput !== 'default' && (
              <p className="text-[10px] text-slate-400 mt-1">
                Database: <span className="text-slate-600 font-mono">simple_billing-{shopCodeInput.replace(/^(simple_billing[-_]|renic_tenant_)/, '')}</span>
              </p>
            )}
          </div>

          {/* ─────────────────────────────────────────────────────────────
              FORMAT 1: MOBILE NUMBER & PASSWORD (DEFAULT)
             ───────────────────────────────────────────────────────────── */}
          {mode === 'PASSWORD' && (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Mobile Number / Username
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="e.g. 9842512143"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 bg-brand-500 hover:bg-brand-600 text-slate-950 font-black rounded-xl text-sm transition shadow-md shadow-brand-500/20 disabled:opacity-50 flex items-center justify-center gap-2 active:scale-98"
              >
                {loading ? 'Authenticating...' : 'Sign In to Counter'}
              </button>

              <div className="pt-2 text-center">
                <span className="text-[11px] text-slate-400">
                  Enter registered store credentials to access counter
                </span>
              </div>
            </form>
          )}

          {/* ─────────────────────────────────────────────────────────────
              FORMAT 2: QUICK 4-DIGIT PIN
             ───────────────────────────────────────────────────────────── */}
          {mode === 'PIN' && (
            <div className="space-y-4">
              {users.length > 1 && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Select Staff / Cashier
                  </label>
                  <select
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-brand-500 focus:bg-white font-medium"
                  >
                    <option value="">-- Auto Match by PIN --</option>
                    {users.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* PIN circles indicator */}
              <div className="flex justify-center items-center gap-3 py-3">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`w-4 h-4 rounded-full border-2 transition-all ${
                      pin.length > i
                        ? 'bg-brand-500 border-brand-500 scale-110 shadow-xs shadow-brand-500/50'
                        : 'border-slate-300 bg-slate-100'
                    }`}
                  />
                ))}
              </div>

              {/* On-Screen Touch Keypad */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handlePinKey(num.toString())}
                    className="h-12 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-900 font-mono text-xl font-bold transition active:scale-95 shadow-2xs"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handlePinClear}
                  className="h-12 rounded-xl bg-slate-50 hover:bg-rose-50 border border-slate-200 text-rose-600 text-xs font-bold transition active:scale-95"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => handlePinKey('0')}
                  className="h-12 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-900 font-mono text-xl font-bold transition active:scale-95 shadow-2xs"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handlePinBackspace}
                  className="h-12 rounded-xl bg-slate-50 hover:bg-amber-50 border border-slate-200 text-amber-600 flex items-center justify-center transition active:scale-95"
                >
                  <Delete className="w-5 h-5" />
                </button>
              </div>

              <button
                type="button"
                onClick={handlePinLogin}
                disabled={loading || pin.length < 4}
                className="w-full mt-3 py-3 bg-brand-500 hover:bg-brand-600 text-slate-950 font-black rounded-xl text-sm transition shadow-md shadow-brand-500/20 disabled:opacity-40 flex items-center justify-center gap-2 active:scale-98"
              >
                {loading ? 'Verifying PIN...' : 'Unlock Counter'}
              </button>

              <div className="text-center">
                <span className="text-[11px] text-slate-400">
                  Enter your assigned 4-digit counter cashier PIN
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
