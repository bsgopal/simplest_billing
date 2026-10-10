import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useBilling } from '../context/BillingContext';
import WeightCalcModal from '../components/WeightCalcModal';
import PaymentModal from './PaymentModal';
import ThermalReceiptModal from '../components/ThermalReceiptModal';
import { 
  Search, 
  Barcode, 
  Trash2, 
  Plus, 
  Minus, 
  PauseCircle, 
  RotateCcw, 
  UserPlus, 
  CreditCard, 
  Scale, 
  Percent, 
  CheckCircle2,
  Tag,
  FileText,
  Receipt,
  Camera,
  Globe,
  AlertCircle,
  AlertTriangle,
  X
} from 'lucide-react';
import CameraBarcodeScanner from '../components/CameraBarcodeScanner';

export default function NewBill() {
  const { shop } = useAuth();
  const {
    cartItems,
    addItem,
    updateQty,
    updateRate,
    updateLineDiscount,
    removeItem,
    clearCart,
    customer,
    setCustomer,
    billDiscount,
    setBillDiscount,
    notes,
    setNotes,
    calculations,
    holdCurrentBill
  } = useBilling();

  const [searchQuery, setSearchQuery] = useState('');
  const [allItems, setAllItems] = useState([]);
  const [quickItems, setQuickItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [customersList, setCustomersList] = useState([]);
  const [activeLang, setActiveLang] = useState('en'); // en, ta, hi, te, kn, ml

  const languageTabs = [
    { code: 'en', label: 'English', native: 'English' },
    { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
    { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
    { code: 'te', label: 'Telugu', native: 'తెలుగు' },
    { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
    { code: 'ml', label: 'Malayalam', native: 'മലയാളം' }
  ];

  const getItemDisplayName = (it, lang = activeLang) => {
    if (!it) return '';
    if (lang !== 'en' && it.translations && it.translations[lang]) {
      return it.translations[lang];
    }
    return it.name;
  };
  
  // Modals
  const [weightModalItem, setWeightModalItem] = useState(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [completedBill, setCompletedBill] = useState(null);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [cameraScanOpen, setCameraScanOpen] = useState(false);

  const searchInputRef = useRef(null);
  const barcodeBufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);

  // Toast notifications for scanner errors and alerts
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'error', duration = 3500) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 6);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Sound feedback on scan add
  const playScanBeep = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(950, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {}
  };

  // Warning buzz when barcode is not found or out of stock
  const playWarningBeep = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.setValueAtTime(200, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.28);
    } catch {}
  };

  // Global USB Barcode Scanner & Hotkey Interceptor
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Shortcut Keys
      if (e.key === 'F10') {
        e.preventDefault();
        if (cartItems.length > 0) setPaymentModalOpen(true);
        return;
      } else if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      } else if (e.key === 'F8') {
        e.preventDefault();
        if (cartItems.length > 0) holdCurrentBill();
        return;
      }

      // Detect hardware barcode gun (scanners output characters < 35ms apart)
      const now = Date.now();
      const isFastTyping = (now - lastKeyTimeRef.current) < 45;
      lastKeyTimeRef.current = now;

      // Ignore normal typing in active inputs (except Enter)
      const isInputActive = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
      
      if (e.key === 'Enter') {
        if (barcodeBufferRef.current.length >= 3) {
          const scannedCode = barcodeBufferRef.current.trim();
          barcodeBufferRef.current = '';
          handleExactBarcodeMatch(scannedCode);
        }
      } else if (e.key.length === 1) {
        if (isFastTyping || !isInputActive) {
          barcodeBufferRef.current += e.key;
          // Clear buffer if stalled for more than 250ms
          setTimeout(() => {
            if (Date.now() - lastKeyTimeRef.current > 200) {
              barcodeBufferRef.current = '';
            }
          }, 250);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [cartItems.length, allItems]);

  // Keep search input focused for instant barcode scanning
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!paymentModalOpen && !customerModalOpen && !cameraScanOpen) {
        searchInputRef.current?.focus();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [cartItems.length, paymentModalOpen, customerModalOpen, cameraScanOpen]);

  // Load items, categories & customers
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [itemsRes, quickRes, custRes, catsRes] = await Promise.all([
          axios.get('/api/items?active=true'),
          axios.get('/api/items/quick'),
          axios.get('/api/customers'),
          axios.get('/api/items/categories-units')
        ]);
        setAllItems(itemsRes.data || []);
        setQuickItems(quickRes.data || []);
        setCustomersList(custRes.data?.customers || []);
        setCategories(catsRes.data?.categories || []);
      } catch (err) {
        console.error('Error loading bill data:', err);
      }
    };
    fetchData();
  }, []);

  // Filter items
  const filteredCatalog = allItems.filter(item => {
    const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesCat;
    const matchName = item.name.toLowerCase().includes(q);
    const matchTrans = item.translations && Object.values(item.translations).some(
      t => t && t.toLowerCase().includes(q)
    );
    const matchesQuery = 
      matchName ||
      matchTrans ||
      (item.code && item.code.toLowerCase().includes(q)) ||
      (item.barcode && item.barcode.toLowerCase().includes(q)) ||
      (item.barcodes && item.barcodes.some(b => b.toLowerCase().includes(q)));
    return matchesCat && matchesQuery;
  });

  const handleExactBarcodeMatch = (rawCode) => {
    const code = (rawCode || '').trim().toLowerCase();
    if (!code) return;

    const matched = allItems.find(i => 
      (i.barcode && i.barcode.toLowerCase() === code) ||
      (i.code && i.code.toLowerCase() === code) ||
      (i.barcodes && i.barcodes.some(b => b.toLowerCase() === code))
    );

    if (matched) {
      if (matched.currentStock <= 0) {
        playWarningBeep();
        showToast(`Stock not available! "${getItemDisplayName(matched)}" has 0 stock.`, 'warning');
      } else {
        playScanBeep();
      }
      handleItemClick(matched);
      setSearchQuery('');
    } else {
      // Dynamic fallback search from server
      axios.get(`/api/items/barcode/${encodeURIComponent(code)}`)
        .then(res => {
          if (res.data) {
            const serverItem = res.data;
            if (serverItem.currentStock <= 0) {
              playWarningBeep();
              showToast(`Stock not available! "${getItemDisplayName(serverItem)}" has 0 stock.`, 'warning');
            } else {
              playScanBeep();
            }
            handleItemClick(serverItem);
            setSearchQuery('');
            setAllItems(prev => [...prev.filter(x => x._id !== serverItem._id), serverItem]);
          } else {
            playWarningBeep();
            showToast(`Item / Stock not exist in database for barcode: "${rawCode}"!`, 'error');
          }
        })
        .catch(() => {
          playWarningBeep();
          showToast(`Item / Stock not exist in database for barcode: "${rawCode}"!`, 'error');
        });
    }
  };

  // Handle Search Input & Barcode enter
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      const q = searchQuery.trim();
      if (!q) return;

      const exactMatch = allItems.find(i => 
        (i.barcode && i.barcode.toLowerCase() === q.toLowerCase()) ||
        (i.code && i.code.toLowerCase() === q.toLowerCase()) ||
        (i.barcodes && i.barcodes.some(b => b.toLowerCase() === q.toLowerCase()))
      );

      if (exactMatch) {
        playScanBeep();
        handleItemClick(exactMatch);
        setSearchQuery('');
      } else if (filteredCatalog.length === 1) {
        playScanBeep();
        handleItemClick(filteredCatalog[0]);
        setSearchQuery('');
      } else {
        handleExactBarcodeMatch(q);
      }
    }
  };

  const handleItemClick = (item) => {
    if (item.unit === 'kg' || item.allowDecimals) {
      setWeightModalItem(item);
    } else {
      addItem(item, 1);
    }
  };

  const handleCameraScan = (barcodeText) => {
    handleExactBarcodeMatch(barcodeText);
  };

  const handleAddNewCustomer = async (e) => {
    e.preventDefault();
    if (!newCustName.trim()) return;
    try {
      const res = await axios.post('/api/customers', {
        name: newCustName.trim(),
        phone: newCustPhone.trim()
      });
      setCustomer({
        customerId: res.data._id,
        name: res.data.name,
        phone: res.data.phone,
        balanceDue: 0
      });
      setCustomersList(prev => [res.data, ...prev]);
      setCustomerModalOpen(false);
      setNewCustName('');
      setNewCustPhone('');
    } catch (err) {
      alert('Error creating customer');
    }
  };

  return (
    <div className="p-2 sm:p-4 max-w-7xl mx-auto h-[calc(100vh-65px)] flex flex-col pb-20 md:pb-2 relative">
      
      {/* Toast Notification Container (Fixed Top Right) */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none px-3">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start justify-between gap-3 p-3.5 rounded-2xl shadow-xl border text-xs sm:text-sm font-bold backdrop-blur-md transition-all transform animate-in slide-in-from-top-3 duration-200 ${
              t.type === 'error'
                ? 'bg-red-50/95 border-red-300 text-red-950 shadow-red-500/10'
                : t.type === 'warning'
                ? 'bg-amber-50/95 border-amber-300 text-amber-950 shadow-amber-500/10'
                : 'bg-emerald-50/95 border-emerald-300 text-emerald-950 shadow-emerald-500/10'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {t.type === 'error' && <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />}
              {t.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />}
              {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
              <span>{t.message}</span>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="p-1 hover:bg-black/5 rounded-lg text-slate-500 hover:text-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0">
        
        {/* LEFT COLUMN: Catalog, Quick Items & Item Search (lg:col-span-7) */}
        <div className="lg:col-span-7 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          
          {/* Top Search & Filter Bar */}
          <div className="p-3 border-b border-slate-100 bg-slate-50/50 space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Scan barcode or type item name, code (F2)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-brand-500 shadow-2xs"
                  autoFocus
                />
              </div>

              {/* Camera Barcode Scanner Button */}
              <button
                type="button"
                onClick={() => setCameraScanOpen(true)}
                title="Scan barcode with camera (Mobile / Laptop webcam)"
                className="flex items-center gap-1.5 px-3 py-2 bg-brand-50 hover:bg-brand-100 text-brand-900 border border-brand-300 font-extrabold rounded-xl text-xs transition shadow-2xs shrink-0 active:scale-95"
              >
                <Camera className="w-4 h-4 text-brand-600" />
                <span className="hidden sm:inline">Camera Scan</span>
              </button>

              {/* Category Dropdown */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-2.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 focus:outline-hidden focus:border-brand-500"
              >
                <option value="All">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Language Switcher Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0 flex items-center gap-1 mr-1">
                <Globe className="w-3 h-3 text-brand-600" />
                Lang:
              </span>
              {languageTabs.map(tab => (
                <button
                  key={tab.code}
                  type="button"
                  onClick={() => setActiveLang(tab.code)}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition shrink-0 ${
                    activeLang === tab.code
                      ? 'bg-brand-500 text-slate-950 font-black shadow-2xs'
                      : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                  title={tab.label}
                >
                  {tab.native}
                </button>
              ))}
            </div>

            {/* Quick Item Buttons Strip (One-tap fast billing) */}
            {quickItems.length > 0 && !searchQuery && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0">
                  Quick:
                </span>
                {quickItems.map((qItem) => (
                  <button
                    key={qItem._id}
                    onClick={() => handleItemClick(qItem)}
                    className="shrink-0 px-2.5 py-1.5 bg-brand-50 hover:bg-brand-100 active:scale-95 border border-brand-200 rounded-lg text-xs font-black text-slate-900 transition flex items-center gap-1 shadow-2xs"
                  >
                    <span>{getItemDisplayName(qItem)}</span>
                    <span className="text-brand-700 font-bold">₹{qItem.sellingPrice}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Item Catalog Grid */}
          <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-2.5 content-start">
            {filteredCatalog.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-400">
                <Tag className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-bold">No matching items found</p>
                <p className="text-[11px]">Type item name or scan barcode</p>
              </div>
            ) : (
              filteredCatalog.map((item) => (
                <div
                  key={item._id}
                  onClick={() => handleItemClick(item)}
                  className="p-2.5 sm:p-3 bg-white hover:bg-slate-50 active:scale-98 border border-slate-200 hover:border-brand-400 rounded-xl shadow-2xs transition flex flex-col justify-between cursor-pointer group"
                >
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-slate-900 leading-snug line-clamp-2 group-hover:text-brand-700">
                      {getItemDisplayName(item)}
                    </h4>
                    {activeLang !== 'en' && item.translations?.[activeLang] && (
                      <p className="text-[10px] text-slate-400 font-medium truncate">
                        {item.name}
                      </p>
                    )}
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                      {item.unit} {item.code ? `• #${item.code}` : ''}
                    </p>
                  </div>
                  <div className="mt-2 pt-1 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-black text-brand-600">
                      ₹{item.sellingPrice.toFixed(2)}
                    </span>
                    {item.allowDecimals ? (
                      <span className="p-1 bg-amber-50 text-amber-700 rounded-md text-[9px] font-black uppercase">
                        Scale
                      </span>
                    ) : (
                      <span className="p-1 bg-brand-50 text-brand-700 rounded-md text-[10px] font-black">
                        + Add
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Current Bill Cart & Payment (lg:col-span-5) */}
        <div className="lg:col-span-5 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          
          {/* Customer Selection Bar */}
          <div className="p-2.5 sm:p-3 bg-slate-900 text-white flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Customer</span>
              <select
                value={customer?.customerId || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) {
                    setCustomer({ name: 'Walk-in Customer', phone: '', balanceDue: 0 });
                  } else {
                    const c = customersList.find(x => x._id === val);
                    if (c) {
                      setCustomer({
                        customerId: c._id,
                        name: c.name,
                        phone: c.phone,
                        balanceDue: c.balanceDue || 0
                      });
                    }
                  }
                }}
                className="w-full bg-slate-800 text-white font-extrabold text-xs py-1 px-2 rounded-lg border border-slate-700 focus:outline-hidden"
              >
                <option value="">Walk-in Customer</option>
                {customersList.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} {c.phone ? `(${c.phone})` : ''} {c.balanceDue > 0 ? `• Due: ₹${c.balanceDue}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setCustomerModalOpen(true)}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-brand-400 rounded-lg text-xs font-bold shrink-0 mt-3 flex items-center gap-1 border border-slate-700"
              title="Add new customer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ New</span>
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-1.5 divide-y divide-slate-100">
            {cartItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
                <Receipt className="w-10 h-10 text-slate-300 mb-2 stroke-1" />
                <p className="text-xs font-bold text-slate-500">Bill cart is empty</p>
                <p className="text-[11px]">Click any item from the left catalog to add</p>
              </div>
            ) : (
              cartItems.map((line, idx) => (
                <div key={idx} className="pt-1.5 first:pt-0 flex items-center justify-between gap-2 text-xs">
                  {/* Name and unit */}
                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold text-slate-900 truncate">
                      {getItemDisplayName(line)}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {activeLang !== 'en' && line.translations?.[activeLang] && `${line.name} • `}₹{line.rate} / {line.unit}
                    </p>
                  </div>

                  {/* Qty Stepper */}
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    <button
                      onClick={() => updateQty(idx, line.qty - (line.allowDecimals ? 0.25 : 1))}
                      disabled={line.qty <= (line.allowDecimals ? 0.25 : 1)}
                      className="p-1 text-slate-600 hover:text-slate-900 disabled:opacity-30 rounded transition"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <input
                      type="number"
                      step={line.allowDecimals ? '0.05' : '1'}
                      value={line.qty}
                      onChange={(e) => updateQty(idx, e.target.value)}
                      className="w-12 text-center text-xs font-black bg-transparent text-slate-900 focus:outline-hidden"
                    />
                    <button
                      onClick={() => updateQty(idx, line.qty + (line.allowDecimals ? 0.25 : 1))}
                      className="p-1 text-slate-600 hover:text-slate-900 rounded transition"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Line Total */}
                  <div className="text-right min-w-[60px]">
                    <span className="font-black text-slate-900 text-xs sm:text-sm">
                      ₹{line.amount.toFixed(2)}
                    </span>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => removeItem(idx)}
                    className="p-1 text-slate-400 hover:text-red-500 rounded transition"
                    title="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Cart Calculation & Totals Summary */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600 font-medium">
              <span>Items: {calculations.totalItems} ({calculations.totalQty.toFixed(2)} qty)</span>
              <span>Sub Total: ₹{calculations.subTotal.toFixed(2)}</span>
            </div>

            {/* Bill Discount Input */}
            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1">
                <Percent className="w-3 h-3 text-slate-400" />
                <span>Bill Discount (₹):</span>
              </span>
              <input
                type="number"
                min="0"
                value={billDiscount || ''}
                onChange={(e) => setBillDiscount(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-16 px-1.5 py-0.5 text-right font-bold bg-white border border-slate-300 rounded text-xs text-red-600 focus:outline-hidden"
              />
            </div>

            {shop?.chargeGst && calculations.taxAmount > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>GST:</span>
                <span>₹{calculations.taxAmount.toFixed(2)}</span>
              </div>
            )}

            {calculations.roundOff !== 0 && (
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Round Off:</span>
                <span>{calculations.roundOff > 0 ? `+₹${calculations.roundOff.toFixed(2)}` : `-₹${Math.abs(calculations.roundOff).toFixed(2)}`}</span>
              </div>
            )}

            {/* Grand Total Big Bar */}
            <div className="pt-2 border-t border-slate-200 flex items-baseline justify-between">
              <span className="text-xs font-black uppercase text-slate-700">Grand Total:</span>
              <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                ₹{calculations.grandTotal.toFixed(2)}
              </span>
            </div>

            {/* Bottom Actions Row */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={clearCart}
                disabled={cartItems.length === 0}
                className="py-2.5 bg-slate-200 hover:bg-slate-300 disabled:opacity-40 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>

              <button
                type="button"
                onClick={() => holdCurrentBill()}
                disabled={cartItems.length === 0}
                className="py-2.5 bg-amber-500/10 hover:bg-amber-500/20 disabled:opacity-40 text-amber-800 font-bold rounded-xl text-xs flex items-center justify-center gap-1 border border-amber-300 transition"
              >
                <PauseCircle className="w-3.5 h-3.5" />
                <span>Hold</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentModalOpen(true)}
                disabled={cartItems.length === 0}
                className="py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-slate-950 font-black rounded-xl text-sm flex items-center justify-center gap-1.5 shadow-md transition active:scale-98"
              >
                <CreditCard className="w-4 h-4" />
                <span>PAY (F10)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Weight & Price Calculator Modal */}
      {weightModalItem && (
        <WeightCalcModal
          item={weightModalItem}
          onAdd={addItem}
          onClose={() => setWeightModalItem(null)}
        />
      )}

      {/* Payment Modal */}
      {paymentModalOpen && (
        <PaymentModal
          onClose={() => setPaymentModalOpen(false)}
          onSuccess={(bill) => {
            setPaymentModalOpen(false);
            setCompletedBill(bill);
            clearCart();
          }}
        />
      )}

      {/* Thermal Receipt Preview Modal */}
      {completedBill && (
        <ThermalReceiptModal
          bill={completedBill}
          onClose={() => setCompletedBill(null)}
          onNewBill={() => {
            setCompletedBill(null);
            clearCart();
          }}
        />
      )}

      {/* Quick Add Customer Modal */}
      {customerModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleAddNewCustomer} className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <h3 className="font-extrabold text-slate-900 text-sm mb-3">Add Customer Profile</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ravi, Suresh..."
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:border-brand-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Mobile (for WhatsApp Bill)</label>
                <input
                  type="tel"
                  maxLength="10"
                  placeholder="10-digit number"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:border-brand-500"
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCustomerModalOpen(false)}
                className="py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="py-2.5 bg-brand-500 text-slate-950 font-black rounded-xl text-xs"
              >
                Save Customer
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Fast Camera Barcode Scanner for Rapid Billing */}
      <CameraBarcodeScanner
        isOpen={cameraScanOpen}
        onClose={() => setCameraScanOpen(false)}
        onScan={handleCameraScan}
        continuous={true}
        title="Fast Camera Barcode Billing Scanner"
      />
    </div>
  );
}
