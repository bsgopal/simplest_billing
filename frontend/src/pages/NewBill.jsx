import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useBilling } from '../context/BillingContext';
import { useLanguage } from '../context/LanguageContext';
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
  X,
  Sparkles,
  Zap,
  Save,
  Check,
  ChevronDown,
  Package,
  Lock,
  Unlock,
  KeyRound,
  Shield
} from 'lucide-react';
import CameraBarcodeScanner from '../components/CameraBarcodeScanner';
import BarcodeCheatSheetModal from '../components/BarcodeCheatSheetModal';

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
    holdCurrentBill,
    heldBills,
    resumeHeldBill,
    isWithoutGstMode,
    toggleWithoutGstMode
  } = useBilling();

  const [searchQuery, setSearchQuery] = useState('');
  const [showComboDropdown, setShowComboDropdown] = useState(false);
  const [allItems, setAllItems] = useState([]);
  const [quickItems, setQuickItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [customersList, setCustomersList] = useState([]);
  const { currentLang } = useLanguage();

  const getItemDisplayName = (it, lang = currentLang) => {
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
  const [quickRateModalOpen, setQuickRateModalOpen] = useState(false);
  const [quickRateCategory, setQuickRateCategory] = useState('All');
  const [quickRateEdits, setQuickRateEdits] = useState({});
  const [savingQuickRates, setSavingQuickRates] = useState(false);

  // Loose Item Barcodes & Without-GST Mode
  const [looseBarcodesModalOpen, setLooseBarcodesModalOpen] = useState(false);
  const [showWithoutGstPrompt, setShowWithoutGstPrompt] = useState(false);
  const [withoutGstPasswordInput, setWithoutGstPasswordInput] = useState('');
  const [verifyingPassword, setVerifyingPassword] = useState(false);
  const [withoutGstError, setWithoutGstError] = useState('');

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

  // Password verification for secret Without-GST mode
  const handleVerifyWithoutGstPassword = async (e) => {
    if (e) e.preventDefault();
    if (!withoutGstPasswordInput.trim()) {
      setWithoutGstError('Please enter secret password');
      return;
    }
    try {
      setVerifyingPassword(true);
      setWithoutGstError('');
      const res = await axios.post('/api/settings/verify-without-gst-password', {
        password: withoutGstPasswordInput.trim()
      });
      if (res.data?.verified) {
        toggleWithoutGstMode(true);
        setShowWithoutGstPrompt(false);
        setWithoutGstPasswordInput('');
        playScanBeep();
        showToast('Without-GST (Estimate / Cash Memo) Activated!', 'success');
      } else {
        playWarningBeep();
        setWithoutGstError('Incorrect secret password');
      }
    } catch (err) {
      playWarningBeep();
      setWithoutGstError(err.response?.data?.message || 'Incorrect secret password');
    } finally {
      setVerifyingPassword(false);
    }
  };

  // Global USB Barcode Scanner & Hotkey Interceptor
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Secret Without-GST Hotkey check (Fn+F5 / F5 / Ctrl+F5)
      const targetHotkey = String(shop?.withoutGstHotkey || 'F5').toUpperCase();
      const isF5 = e.key === 'F5' || e.code === 'F5';
      const isCtrlF5 = (e.ctrlKey || e.metaKey) && isF5;
      const isAltF5 = e.altKey && isF5;
      const isF9 = e.key === 'F9' || e.code === 'F9';
      const isCtrlB = (e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B');

      const matchesHotkey = 
        (targetHotkey === 'F5' && isF5 && !e.ctrlKey && !e.altKey) ||
        (targetHotkey === 'CTRL+F5' && isCtrlF5) ||
        (targetHotkey === 'ALT+F5' && isAltF5) ||
        (targetHotkey === 'F9' && isF9) ||
        (targetHotkey === 'CTRL+B' && isCtrlB) ||
        (isF5); // Always intercept F5 to prevent browser reload and handle billing mode

      if (matchesHotkey) {
        e.preventDefault();
        e.stopPropagation();
        if (isWithoutGstMode) {
          toggleWithoutGstMode(false);
          showToast('Switched to GST Tax Invoice Mode (Standard)', 'success');
        } else {
          setWithoutGstPasswordInput('');
          setWithoutGstError('');
          setShowWithoutGstPrompt(true);
        }
        return;
      }

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

      // Detect hardware barcode gun (scanners output characters < 90ms apart)
      const now = Date.now();
      const isFastTyping = (now - lastKeyTimeRef.current) < 90;
      lastKeyTimeRef.current = now;

      const activeEl = document.activeElement;
      const isSearchInput = activeEl === searchInputRef.current;
      const isOtherInput = activeEl && activeEl !== searchInputRef.current && ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeEl.tagName);

      if (e.key === 'Enter') {
        const buffered = barcodeBufferRef.current.trim();
        const inputVal = searchInputRef.current?.value?.trim() || '';
        const codeToMatch = buffered.length >= 3 ? buffered : (isSearchInput && inputVal.length >= 3 ? inputVal : '');

        if (codeToMatch) {
          e.preventDefault();
          barcodeBufferRef.current = '';
          setSearchQuery('');
          handleExactBarcodeMatch(codeToMatch);
        }
      } else if (e.key.length === 1 && !isOtherInput) {
        // Collect characters into scanner buffer whenever not inside a modal input
        barcodeBufferRef.current += e.key;
        setTimeout(() => {
          if (Date.now() - lastKeyTimeRef.current > 450) {
            barcodeBufferRef.current = '';
          }
        }, 500);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [cartItems.length, allItems, isWithoutGstMode, shop?.withoutGstHotkey]);

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

  const reloadItems = async () => {
    try {
      const res = await axios.get('/api/items?active=true');
      setAllItems(res.data || []);
    } catch (e) {
      console.error('Error reloading items:', e);
    }
  };

  const handleSaveQuickRates = async () => {
    const itemIds = Object.keys(quickRateEdits);
    const updates = [];
    for (const id of itemIds) {
      const newSell = quickRateEdits[id];
      if (newSell !== undefined && newSell !== '') {
        updates.push({
          itemId: id,
          sellingPrice: parseFloat(newSell) || 0
        });
      }
    }

    if (updates.length === 0) {
      setQuickRateModalOpen(false);
      return;
    }

    setSavingQuickRates(true);
    try {
      await axios.post('/api/items/daily-rate-sheet', { updates });
      showToast(`Updated rates for ${updates.length} items!`, 'success');
      await reloadItems();
      setQuickRateEdits({});
      setQuickRateModalOpen(false);
    } catch (err) {
      console.error('Error saving quick rates:', err);
      showToast(err.response?.data?.message || 'Failed to update rates', 'error');
    } finally {
      setSavingQuickRates(false);
    }
  };


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
      showToast('Error creating customer', 'error');
    }
  };

  return (
    <div className="flex flex-col relative lg:h-[calc(100vh-80px)] pb-1">
      
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
        
        {/* LEFT COLUMN: Search & All Stocks Dropdown (lg:col-span-5) */}
        <div className="lg:col-span-5 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-xs overflow-visible">
          
          {/* Top Search & Filter Bar - Unified Combo Format */}
          <div className="p-2.5 sm:p-3 border-b border-slate-100 bg-slate-50/50 space-y-2 sticky top-0 z-30">
            {/* Combo Input Group */}
            <div className="relative">
              <div className="flex items-center bg-white border border-slate-300 rounded-xl shadow-2xs focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500 transition overflow-hidden">
                
                {/* Combo 1: Category Selector Dropdown */}
                <div className="relative border-r border-slate-200 bg-slate-50/80 shrink-0">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="h-9 sm:h-10 pl-2 pr-6 bg-transparent text-xs font-black text-slate-800 focus:outline-hidden cursor-pointer appearance-none"
                  >
                    <option value="All">All</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {/* Combo 2: Search Input with All Stocks Dropdown */}
                <div className="relative flex-1 flex items-center min-w-0">
                  <Search 
                    onClick={() => {
                      setShowComboDropdown(true);
                      searchInputRef.current?.focus();
                    }}
                    className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 shrink-0 cursor-pointer hover:text-slate-700" 
                  />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search or click to browse stocks (F2)..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowComboDropdown(true);
                    }}
                    onFocus={() => setShowComboDropdown(true)}
                    onClick={() => setShowComboDropdown(true)}
                    onKeyDown={handleSearchKeyDown}
                    className="w-full h-9 sm:h-10 pl-8 pr-14 bg-transparent text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-hidden"
                    autoFocus
                  />
                  
                  {/* Right Action Icons in Input: Clear & Dropdown Chevron */}
                  <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          searchInputRef.current?.focus();
                        }}
                        className="p-1 text-slate-400 hover:text-slate-700"
                        title="Clear search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowComboDropdown(!showComboDropdown)}
                      title={showComboDropdown ? "Close dropdown" : "Show all stocks"}
                      className="p-1 text-slate-400 hover:text-slate-800 rounded transition"
                    >
                      <ChevronDown className={`w-4 h-4 transition-transform duration-150 ${showComboDropdown ? 'rotate-180 text-brand-600' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Combo 3: Quick Tool Actions */}
                <div className="flex items-center gap-0.5 pr-1 bg-slate-50/50 border-l border-slate-200 shrink-0">
                  {/* Loose Barcodes Modal Button */}
                  <button
                    type="button"
                    onClick={() => setLooseBarcodesModalOpen(true)}
                    title="Print / View Loose Items Barcode Cheat Sheet (Dal, Spices, Grains)"
                    className="h-8 sm:h-9 px-2 text-slate-700 hover:text-brand-700 hover:bg-brand-50 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                  >
                    <Barcode className="w-3.5 h-3.5 text-brand-600" />
                    <span className="hidden sm:inline">Barcodes</span>
                  </button>

                  {/* Camera Barcode Scanner Button */}
                  <button
                    type="button"
                    onClick={() => setCameraScanOpen(true)}
                    title="Scan barcode with camera (Mobile / Laptop webcam)"
                    className="h-8 sm:h-9 px-2 text-slate-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                  >
                    <Camera className="w-3.5 h-3.5 text-brand-600" />
                    <span className="hidden sm:inline">Camera</span>
                  </button>

                  {/* Quick Daily Rates Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setQuickRateCategory(selectedCategory || 'All');
                      setQuickRateEdits({});
                      setQuickRateModalOpen(true);
                    }}
                    title="Change today's daily product rates without leaving counter"
                    className="h-8 sm:h-9 px-2 text-amber-700 hover:bg-amber-50 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-600" />
                    <span className="hidden sm:inline">Rates</span>
                  </button>
                </div>
              </div>

              {/* All Stocks Dropdown (Opens on search click / focus / type) */}
              {showComboDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-40 bg-slate-950/20 backdrop-blur-2xs" 
                    onClick={() => setShowComboDropdown(false)} 
                  />
                  <div className="absolute left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 max-h-96 sm:max-h-[28rem] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    {/* Dropdown Header & Category Filter Tabs */}
                    <div className="p-2.5 bg-slate-50 border-b border-slate-100 flex flex-col gap-2 shrink-0">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                        <span className="flex items-center gap-1.5 text-slate-900 font-extrabold">
                          <Package className="w-3.5 h-3.5 text-brand-600" />
                          {searchQuery ? `Search Results (${filteredCatalog.length})` : `All Store Stocks (${filteredCatalog.length})`}
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowComboDropdown(false)}
                          className="text-slate-400 hover:text-slate-700 p-0.5 rounded"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Dropdown Category Filter Chips */}
                      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
                        <button
                          type="button"
                          onClick={() => setSelectedCategory('All')}
                          className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-black transition ${
                            selectedCategory === 'All'
                              ? 'bg-slate-900 text-white'
                              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          All ({allItems.length})
                        </button>
                        {categories.map((c) => {
                          const count = allItems.filter(i => i.category === c).length;
                          return (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setSelectedCategory(c)}
                              className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-black transition ${
                                selectedCategory === c
                                  ? 'bg-brand-500 text-slate-950'
                                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              {c} ({count})
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Dropdown Products List */}
                    <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-1">
                      {filteredCatalog.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-400 font-bold space-y-1">
                          <p>No products found matching "{searchQuery}"</p>
                          <p className="text-[10px] text-slate-400 font-normal">Check spelling or create this product in Products page</p>
                        </div>
                      ) : (
                        filteredCatalog.map((item) => (
                          <div
                            key={item._id}
                            onClick={() => {
                              handleItemClick(item);
                              setSearchQuery('');
                              searchInputRef.current?.focus();
                            }}
                            className="p-2.5 hover:bg-brand-50/70 active:bg-brand-100 cursor-pointer flex items-center justify-between gap-3 transition rounded-xl"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                                <span className="truncate">{getItemDisplayName(item)}</span>
                                {currentLang !== 'en' && item.translations?.[currentLang] && item.name?.trim().toLowerCase() !== getItemDisplayName(item)?.trim().toLowerCase() && (
                                  <span className="text-[10px] text-slate-400 font-normal">({item.name})</span>
                                )}
                                {item.gstPercent > 0 && (
                                  <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                    {item.gstPercent}% GST
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <span className="font-medium text-slate-500">{item.category}</span>
                                <span>•</span>
                                <span className={`font-bold ${
                                  item.currentStock <= item.lowStockLevel
                                    ? 'text-red-600'
                                    : 'text-emerald-700'
                                }`}>
                                  Stock: {item.currentStock} {item.unit}
                                </span>
                                {item.code && (
                                  <>
                                    <span>•</span>
                                    <span>#{item.code}</span>
                                  </>
                                )}
                                {item.barcode && (
                                  <>
                                    <span>•</span>
                                    <span>Barcode: {item.barcode}</span>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="text-right shrink-0 flex items-center gap-2">
                              <div>
                                <div className="text-xs sm:text-sm font-black text-brand-700">
                                  ₹{item.sellingPrice.toFixed(2)}
                                </div>
                                <div className="text-[9px] font-bold text-slate-400 uppercase">
                                  per {item.unit}
                                </div>
                              </div>
                              <button
                                type="button"
                                className="px-2.5 py-1 bg-brand-500 hover:bg-brand-600 text-slate-950 font-black rounded-lg text-[10px] shadow-2xs"
                              >
                                {item.allowDecimals ? 'Scale' : '+ Add'}
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Quick Item Buttons Strip (One-tap fast billing) */}
            {quickItems.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 pt-0.5 no-scrollbar border-t border-slate-100 pt-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0">
                  Quick:
                </span>
                {quickItems.map((qItem) => (
                  <button
                    key={qItem._id}
                    onClick={() => handleItemClick(qItem)}
                    className="shrink-0 px-2.5 py-1 bg-brand-50 hover:bg-brand-100 active:scale-95 border border-brand-200 rounded-lg text-xs font-black text-slate-900 transition flex items-center gap-1 shadow-2xs"
                  >
                    <span>{getItemDisplayName(qItem)}</span>
                    <span className="text-brand-700 font-bold">₹{qItem.sellingPrice}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Left Column Idle Content (When Dropdown is not open) */}
          <div className="flex-1 p-3 space-y-3 overflow-y-auto hidden lg:flex lg:flex-col">
            {/* Quick 1-Click Browse All Stocks Banner */}
            <button
              type="button"
              onClick={() => {
                setShowComboDropdown(true);
                searchInputRef.current?.focus();
              }}
              className="w-full p-3.5 bg-gradient-to-r from-brand-50 to-lime-50 hover:from-brand-100 hover:to-lime-100 border border-brand-200 rounded-2xl flex items-center justify-between text-left transition shadow-2xs group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-brand-500 text-slate-950 flex items-center justify-center font-black">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-extrabold text-xs text-slate-900 group-hover:text-brand-900">
                    Browse All Store Stocks
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">
                    {allItems.length} products available • Click or press F2 to open dropdown
                  </div>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-800" />
            </button>

            {/* Held Bills (If any) */}
            {heldBills && heldBills.length > 0 && (
              <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs font-extrabold text-amber-900">
                  <span className="flex items-center gap-1.5">
                    <PauseCircle className="w-4 h-4 text-amber-600" />
                    Held Bills ({heldBills.length})
                  </span>
                  <span className="text-[10px] text-amber-700 font-medium">Click to resume</span>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {heldBills.map((hb) => (
                    <div
                      key={hb._id}
                      onClick={() => resumeHeldBill(hb)}
                      className="p-2 bg-white rounded-xl border border-amber-200 flex items-center justify-between text-xs cursor-pointer hover:bg-amber-100/50 transition"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{hb.customerName || 'Walk-in'}</div>
                        <div className="text-[10px] text-slate-400">{hb.items?.length || 0} items • {new Date(hb.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-amber-900">₹{(hb.subTotal || 0).toFixed(2)}</div>
                        <span className="text-[9px] font-black text-amber-700 uppercase">Resume →</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* POS Shortcut Reference Card */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1.5 text-slate-600 mt-auto">
              <div className="font-black text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-brand-600" />
                POS Quick Shortcuts
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-medium pt-1">
                <div className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono font-bold text-[10px] text-slate-800 shadow-2xs">F2</kbd>
                  <span>Search Stocks</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono font-bold text-[10px] text-slate-800 shadow-2xs">F10</kbd>
                  <span>Checkout / Pay</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono font-bold text-[10px] text-slate-800 shadow-2xs">F8</kbd>
                  <span>Hold Bill</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono font-bold text-[10px] text-slate-800 shadow-2xs">Gun</kbd>
                  <span>Auto-scans</span>
                </div>
                <div className="flex items-center gap-1.5 col-span-2 pt-1 border-t border-slate-200">
                  <kbd className="px-1.5 py-0.5 bg-amber-100 border border-amber-300 rounded font-mono font-bold text-[10px] text-amber-900 shadow-2xs">Fn+F5</kbd>
                  <span className="text-amber-800 font-bold text-[10px]">Without-GST / Estimate Toggle</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Current Bill Cart & Payment (lg:col-span-5) */}
        <div className="lg:col-span-5 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          
          {/* Mode Indicator Banner: GST vs Without-GST */}
          <div className={`px-3 py-1.5 flex items-center justify-between text-xs font-bold border-b transition ${
            isWithoutGstMode 
              ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-xs'
              : 'bg-slate-950 text-slate-300 border-slate-800'
          }`}>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isWithoutGstMode ? 'bg-slate-950 animate-ping' : 'bg-lime-400'}`} />
              <span className="tracking-wide">
                {isWithoutGstMode 
                  ? '🟡 WITHOUT-GST MODE (Estimate / Zero Tax)' 
                  : '🟢 GST TAX INVOICE (Standard)'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                if (isWithoutGstMode) {
                  toggleWithoutGstMode(false);
                  showToast('Switched to GST Tax Invoice Mode', 'success');
                } else {
                  setWithoutGstPasswordInput('');
                  setWithoutGstError('');
                  setShowWithoutGstPrompt(true);
                }
              }}
              title="Toggle GST / Without-GST Mode (Hotkey: Fn+F5)"
              className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold flex items-center gap-1 border transition ${
                isWithoutGstMode 
                  ? 'bg-slate-950 text-amber-300 border-slate-900 hover:bg-slate-900' 
                  : 'bg-slate-800 text-lime-400 border-slate-700 hover:bg-slate-700'
              }`}
            >
              {isWithoutGstMode ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
              <span>{isWithoutGstMode ? 'Switch to GST' : 'Fn+F5: Estimate'}</span>
            </button>
          </div>

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
          <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-1.5 divide-y divide-slate-100 max-h-[35vh] lg:max-h-none">
            {cartItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-slate-400 py-5 sm:py-12">
                <Receipt className="w-8 h-8 sm:w-10 sm:h-10 text-slate-300 mb-1.5 stroke-1" />
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
                      {currentLang !== 'en' && line.translations?.[currentLang] && line.name?.trim().toLowerCase() !== getItemDisplayName(line)?.trim().toLowerCase() ? `${line.name} • ` : ''}₹{line.rate} / {line.unit}
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
              <div className="flex justify-between items-center bg-lime-50/80 px-2.5 py-1.5 rounded-xl border border-lime-200 text-slate-800">
                <div>
                  <span className="font-extrabold text-xs">GST Tax: </span>
                  <span className="text-[10px] text-slate-500 font-semibold">
                    (CGST ₹{calculations.cgstAmount.toFixed(2)} + SGST ₹{calculations.sgstAmount.toFixed(2)})
                  </span>
                </div>
                <span className="font-black text-xs text-lime-900">
                  {shop?.priceIncludesGst ? '(Incl.) ' : '+ '}₹{calculations.taxAmount.toFixed(2)}
                </span>
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

      {/* Quick Daily Rates Modal (Counter-side instant price revision) */}
      {quickRateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-4 sm:p-5 shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 rounded-xl text-amber-800">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm sm:text-base">
                    Today's Rate Sheet (Spot Revision)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Instantly update selling rates for vegetables or products right from the counter.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuickRateModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Category filter pills in modal */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-2.5 no-scrollbar shrink-0">
              <button
                type="button"
                onClick={() => setQuickRateCategory('All')}
                className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  quickRateCategory === 'All'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All
              </button>
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setQuickRateCategory(c)}
                  className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                    quickRateCategory === c
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            {/* Editable items list */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 pr-1">
              {allItems
                .filter(i => quickRateCategory === 'All' || i.category === quickRateCategory)
                .map((it) => {
                  const currentRateVal = quickRateEdits[it._id] !== undefined ? quickRateEdits[it._id] : String(it.sellingPrice);
                  const isModified = quickRateEdits[it._id] !== undefined && parseFloat(quickRateEdits[it._id]) !== it.sellingPrice;

                  return (
                    <div key={it._id} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-extrabold text-xs sm:text-sm text-slate-900 truncate">
                          {getItemDisplayName(it)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {it.unit} • Stock: {it.currentStock}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Rate (₹)</span>
                        </div>
                        <div className="relative w-24 sm:w-28">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-black text-amber-700">₹</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={currentRateVal}
                            onChange={(e) => {
                              const val = e.target.value;
                              setQuickRateEdits(prev => ({ ...prev, [it._id]: val }));
                            }}
                            className={`w-full pl-6 pr-2 py-1.5 rounded-xl text-xs sm:text-sm font-mono font-black text-center focus:outline-none transition ${
                              isModified
                                ? 'bg-amber-50 border-2 border-amber-500 text-amber-950'
                                : 'bg-slate-50 border border-slate-300 text-slate-900 focus:border-amber-500'
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 shrink-0">
              <span className="text-xs text-slate-500 font-bold">
                {Object.keys(quickRateEdits).length} item(s) modified
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQuickRateModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveQuickRates}
                  disabled={savingQuickRates}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-xs flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{savingQuickRates ? 'Saving...' : 'Apply Rates Now'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Secret Password Modal for Without-GST Mode */}
      {showWithoutGstPrompt && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/50 rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-amber-400">
                <div className="p-2 bg-amber-500/20 rounded-xl">
                  <KeyRound className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">Secret Without-GST Mode</h3>
                  <p className="text-[11px] text-amber-300/80">Authorized Admin / Owner Only</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowWithoutGstPrompt(false);
                  setWithoutGstPasswordInput('');
                  setWithoutGstError('');
                }}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleVerifyWithoutGstPassword} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                  Enter Authorization Password
                </label>
                <input
                  type="password"
                  autoFocus
                  required
                  value={withoutGstPasswordInput}
                  onChange={(e) => setWithoutGstPasswordInput(e.target.value)}
                  placeholder="Enter secret password..."
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl text-white font-mono tracking-widest text-center text-lg outline-none"
                />
                {withoutGstError && (
                  <p className="text-xs font-bold text-red-400 mt-1.5 text-center">
                    {withoutGstError}
                  </p>
                )}
              </div>

              <div className="text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                💡 <span className="font-semibold text-slate-300">Shortcut:</span> Type password and press <kbd className="px-1 py-0.5 bg-slate-800 rounded font-mono text-[10px] text-amber-300">Enter</kbd> to unlock Estimate mode.
              </div>

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowWithoutGstPrompt(false);
                    setWithoutGstPasswordInput('');
                  }}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={verifyingPassword}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition disabled:opacity-50"
                >
                  {verifyingPassword ? 'Verifying...' : 'Unlock Mode'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Loose Item Barcode Cheat Sheet Modal */}
      {looseBarcodesModalOpen && (
        <BarcodeCheatSheetModal
          isOpen={looseBarcodesModalOpen}
          onClose={() => setLooseBarcodesModalOpen(false)}
          items={allItems}
          categories={categories}
        />
      )}
    </div>
  );
}
