import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { 
  BarcodeFormat, 
  DecodeHintType 
} from '@zxing/library';
import { 
  Package, 
  Barcode, 
  Camera, 
  Plus, 
  Search, 
  Check, 
  X, 
  Sparkles, 
  RefreshCw, 
  History, 
  Zap, 
  Volume2, 
  VolumeX, 
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Layers,
  Globe
} from 'lucide-react';

export default function StockInward() {
  const [allItems, setAllItems] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchItemQuery, setSearchItemQuery] = useState('');
  const [itemDropdownOpen, setItemDropdownOpen] = useState(false);

  const [activeLang, setActiveLang] = useState('en'); // en, ta, hi, te, kn, ml
  const [categories, setCategories] = useState([]);

  // New Item Quick Creation inline form
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [showTranslations, setShowTranslations] = useState(false);
  const [newItemForm, setNewItemForm] = useState({
    name: '',
    translations: {
      ta: '',
      hi: '',
      te: '',
      kn: '',
      ml: ''
    },
    category: '',
    unit: 'pcs',
    sellingPrice: '',
    purchasePrice: '',
    openingStock: '0',
    lowStockLevel: 5,
    isQuickItem: false,
    gstPercent: 0
  });

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

  // Scanned Barcode & Stock Form
  const [barcode, setBarcode] = useState('');
  const [incomingQty, setIncomingQty] = useState('1');
  const [costPrice, setCostPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Continuous Camera & Feedback States
  const [cameraActive, setCameraActive] = useState(true);
  const [cameraError, setCameraError] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoAddOnScan, setAutoAddOnScan] = useState(true);
  const [autoAddAmount, setAutoAddAmount] = useState(1);
  const [recentScans, setRecentScans] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [activeCameraId, setActiveCameraId] = useState('');
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' (back) or 'user' (front)

  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);
  const scanLockRef = useRef(false);
  const streamRef = useRef(null);
  const audioCtxRef = useRef(null);

  // Fetch all items & categories from DB
  const loadAllItems = async () => {
    try {
      const [itemsRes, catsRes] = await Promise.all([
        axios.get('/api/items?active=true'),
        axios.get('/api/items/categories-units')
      ]);
      const items = itemsRes.data || [];
      setAllItems(items);
      setCategories(catsRes.data?.categories || []);
      return items;
    } catch (err) {
      console.error('Error fetching items for stock inward:', err);
      return [];
    }
  };

  useEffect(() => {
    loadAllItems();
  }, []);

  // When selectedItemId changes, sync selectedItem state and price fields
  useEffect(() => {
    if (!selectedItemId) {
      setSelectedItem(null);
      return;
    }
    const found = allItems.find(i => i._id === selectedItemId);
    if (found) {
      setSelectedItem(found);
      setCostPrice(found.purchasePrice || '');
      setSellingPrice(found.sellingPrice || '');
    }
  }, [selectedItemId, allItems]);

  // Audio Beep
  const playBeep = () => {
    if (!soundEnabled) return;
    try {
      const ctx = audioCtxRef.current || new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(950, ctx.currentTime);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {}
  };

  // Success Chime
  const playSuccessSound = () => {
    try {
      const ctx = audioCtxRef.current || new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {}
  };

  // Continuous Camera Scanner with ZXing
  useEffect(() => {
    if (!cameraActive) {
      stopCamera();
      return;
    }

    let isMounted = true;
    scanLockRef.current = false;

    const startCamera = async () => {
      try {
        setCameraError('');

        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.CODE_128,
          BarcodeFormat.CODE_39,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.QR_CODE,
          BarcodeFormat.ITF,
          BarcodeFormat.DATA_MATRIX
        ]);
        hints.set(DecodeHintType.TRY_HARDER, true);

        // Direct stream acquisition and binding for mobile & laptop webcams
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setCameraError('Camera API is not supported on this browser or connection. Please use HTTPS.');
          return;
        }

        let devices = [];
        try {
          devices = await navigator.mediaDevices.enumerateDevices();
        } catch (e) {}

        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        if (isMounted) setCameras(videoDevices);

        const videoConstraints = {
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 }
        };

        if (activeCameraId) {
          videoConstraints.deviceId = { exact: activeCameraId };
        } else {
          videoConstraints.facingMode = { ideal: facingMode };
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: false
        });

        streamRef.current = stream;

        if (!videoRef.current || !isMounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();

        const reader = new BrowserMultiFormatReader(hints, 100);
        codeReaderRef.current = reader;

        reader.decodeFromVideoElement(
          videoRef.current,
          (result, decodeErr) => {
            if (result && !scanLockRef.current) {
              const text = result.getText();
              if (!text) return;

              scanLockRef.current = true;
              playBeep();
              handleBarcodeScanned(text);

              setTimeout(() => {
                scanLockRef.current = false;
              }, 1300);
            }
          }
        );
      } catch (err) {
        console.error('Camera inward scanner error:', err);
        if (isMounted) {
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            setCameraError('Camera access was blocked. Please tap the camera/lock icon in your browser address bar and select "Allow".');
          } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            setCameraError('No camera detected on this device.');
          } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
            setCameraError('Camera is already in use by another tab or app.');
          } else {
            setCameraError(err?.message || 'Camera permission denied or camera unavailable in this context.');
          }
        }
      }
    };

    const timer = setTimeout(() => {
      startCamera();
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      stopCamera();
    };
  }, [cameraActive, activeCameraId, facingMode]);

  const handleToggleFacingMode = () => {
    stopCamera();
    setActiveCameraId('');
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  const handleSelectCamera = (deviceId) => {
    stopCamera();
    setActiveCameraId(deviceId);
  };

  const stopCamera = () => {
    if (codeReaderRef.current) {
      try {
        codeReaderRef.current.reset();
      } catch {}
      codeReaderRef.current = null;
    }
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach(t => t.stop());
      } catch {}
      streamRef.current = null;
    }
  };

  // When a barcode is scanned or entered
  const handleBarcodeScanned = async (scannedCode) => {
    const code = (scannedCode || '').trim();
    if (!code) return;

    setBarcode(code);
    setSaveSuccessMsg('');

    if (selectedItem) {
      if (autoAddOnScan) {
        await linkBarcodeAndAddStock(selectedItem, code, autoAddAmount);
      } else {
        setSaveSuccessMsg(`Barcode "${code}" detected! Review quantity and click "Confirm Add Stock".`);
      }
      return;
    }

    // If no item selected yet, check if this barcode is already known in DB
    try {
      const res = await axios.get(`/api/items/barcode/${encodeURIComponent(code)}`);
      if (res.data) {
        const found = res.data;
        setSelectedItem(found);
        setSelectedItemId(found._id);
        setCostPrice(found.purchasePrice || '');
        setSellingPrice(found.sellingPrice || '');

        if (autoAddOnScan) {
          await linkBarcodeAndAddStock(found, code, autoAddAmount);
        } else {
          setSaveSuccessMsg(`Product "${found.name}" found! Current stock: ${found.currentStock}.`);
        }
      }
    } catch {
      setSaveSuccessMsg(`Scanned: "${code}". Please select an item on the left to link this barcode.`);
    }
  };

  // Link barcode and increment stock
  const linkBarcodeAndAddStock = async (itemToUpdate, codeToLink, qtyToAdd) => {
    const targetItem = itemToUpdate || selectedItem;
    if (!targetItem) {
      alert('Please select or create an item first!');
      return;
    }

    setSubmitting(true);
    try {
      const qtyNum = Number(qtyToAdd) || 1;
      const res = await axios.post('/api/items/link-barcode-stock', {
        itemId: targetItem._id,
        barcode: codeToLink || barcode,
        quantity: qtyNum,
        costPrice: costPrice !== '' ? costPrice : undefined,
        sellingPrice: sellingPrice !== '' ? sellingPrice : undefined,
        note: `Barcode Inward (+${qtyNum})`
      });

      const updated = res.data.item;
      playSuccessSound();

      setSelectedItem(updated);
      setAllItems(prev => prev.map(i => i._id === updated._id ? updated : i));

      const logEntry = {
        name: getItemDisplayName(updated),
        originalName: updated.name,
        code: codeToLink || barcode,
        qty: qtyNum,
        unit: updated.unit,
        newStock: updated.currentStock,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };
      setRecentScans(prev => [logEntry, ...prev.slice(0, 9)]);
      setSaveSuccessMsg(`Added +${qtyNum} ${updated.unit} to "${getItemDisplayName(updated)}" (Live Stock: ${updated.currentStock})`);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update stock');
    } finally {
      setSubmitting(false);
    }
  };

  // Quick Create New Item
  const handleCreateNewItem = async (e) => {
    e.preventDefault();
    if (!newItemForm.name.trim() || !newItemForm.sellingPrice) {
      alert('Item Name and Selling Price are required');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: newItemForm.name.trim(),
        translations: newItemForm.translations || {},
        barcode: barcode.trim() || undefined,
        category: newItemForm.category.trim() || 'General',
        unit: newItemForm.unit,
        sellingPrice: Number(newItemForm.sellingPrice),
        purchasePrice: Number(newItemForm.purchasePrice) || 0,
        openingStock: Number(newItemForm.openingStock) || 0,
        lowStockLevel: Number(newItemForm.lowStockLevel) || 5,
        isQuickItem: Boolean(newItemForm.isQuickItem),
        gstPercent: Number(newItemForm.gstPercent) || 0
      };

      const res = await axios.post('/api/items', payload);
      const created = res.data;
      playSuccessSound();

      setAllItems(prev => [created, ...prev]);
      setSelectedItem(created);
      setSelectedItemId(created._id);
      setIsCreatingNew(false);
      setNewItemForm({
        name: '',
        translations: { ta: '', hi: '', te: '', kn: '', ml: '' },
        category: '',
        unit: 'pcs',
        sellingPrice: '',
        purchasePrice: '',
        openingStock: '0',
        lowStockLevel: 5,
        isQuickItem: false,
        gstPercent: 0
      });

      const dispName = getItemDisplayName(created);
      setSaveSuccessMsg(`Item "${dispName}" created! Ready to scan packet barcodes.`);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create item');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredItemsForSelect = allItems.filter(i => {
    const q = searchItemQuery.toLowerCase().trim();
    if (!q) return true;
    const matchName = i.name.toLowerCase().includes(q);
    const matchTrans = i.translations && Object.values(i.translations).some(
      t => t && t.toLowerCase().includes(q)
    );
    return (
      matchName ||
      matchTrans ||
      (i.code && i.code.toLowerCase().includes(q)) ||
      (i.barcode && i.barcode.toLowerCase().includes(q)) ||
      (i.barcodes && i.barcodes.some(b => b.toLowerCase().includes(q)))
    );
  });

  return (
    <div className="p-3 sm:p-5 max-w-7xl mx-auto space-y-4 pb-20 md:pb-6">
      
      {/* Top Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Barcode className="w-5 h-5 text-brand-600" />
            Stock Inward &amp; Barcode Management
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-100 text-brand-900 border border-brand-300">
              <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
              LIVE POS ENGINE
            </span>
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Dedicated screen to receive stock, link packet barcodes &amp; QRs continuously, and update inventory
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Language Switcher Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <Globe className="w-3.5 h-3.5 text-slate-500 ml-1.5 mr-0.5" />
            {languageTabs.map(tab => (
              <button
                key={tab.code}
                type="button"
                onClick={() => setActiveLang(tab.code)}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  activeLang === tab.code
                    ? 'bg-brand-500 text-slate-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
                title={tab.label}
              >
                <span>{tab.native}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2.5 rounded-xl border transition ${
              soundEnabled ? 'text-brand-800 bg-brand-50 border-brand-200' : 'text-slate-400 bg-slate-100 border-slate-200'
            }`}
            title="Toggle Beep Sound"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <label className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoAddOnScan}
              onChange={(e) => setAutoAddOnScan(e.target.checked)}
              className="rounded accent-brand-500 w-4 h-4 cursor-pointer"
            />
            <span className="flex items-center gap-1 text-brand-800">
              <Zap className="w-3.5 h-3.5 text-brand-600 fill-brand-600" />
              Auto +{autoAddAmount} on Scan
            </span>
          </label>
        </div>
      </div>

      {/* Main Grid: Left Item Selector, Right Continuous Camera & Inward Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* LEFT COLUMN: Item Selector & Quick Creator (lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-4">
          
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-brand-600" />
                Step 1: Select Item to Stock
              </label>

              <button
                type="button"
                onClick={() => setIsCreatingNew(!isCreatingNew)}
                className="text-xs font-bold text-brand-800 hover:text-brand-900 bg-brand-100 hover:bg-brand-200 px-2.5 py-1 rounded-lg transition flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isCreatingNew ? 'Pick Existing' : '+ Create New Item'}</span>
              </button>
            </div>

            {/* Quick Creation Form */}
            {isCreatingNew ? (
              <form onSubmit={handleCreateNewItem} className="p-3 bg-slate-50 rounded-xl border border-brand-300 space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                  <span className="text-[11px] font-black text-brand-800 uppercase">
                    New Product Quick Register
                  </span>
                  <span className="text-[10px] text-slate-400">Barcode will auto-link</span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Product Name (English / Primary) *
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowTranslations(!showTranslations)}
                      className="text-[10px] font-bold text-brand-800 hover:text-brand-900 bg-brand-50 hover:bg-brand-100 px-2 py-0.5 rounded-md border border-brand-200 flex items-center gap-1 transition"
                    >
                      <Globe className="w-3 h-3 text-brand-600" />
                      <span>{showTranslations ? 'Hide Regional Names' : '+ Multi-Language Names'}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={newItemForm.name}
                    onChange={(e) => setNewItemForm({ ...newItemForm, name: e.target.value })}
                    placeholder="e.g. Tomato, Parle-G 250g, Aavin Milk..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm font-bold focus:outline-none focus:border-brand-500"
                  />
                </div>

                {/* Multi-Language Translations Fields */}
                {showTranslations && (
                  <div className="p-2.5 bg-brand-50/50 rounded-xl border border-brand-200 space-y-2 animate-in fade-in duration-150">
                    <div className="flex items-center gap-1.5 text-[11px] font-black text-brand-900">
                      <Globe className="w-3.5 h-3.5 text-brand-600" />
                      <span>Multi-Language Product Names (Regional Scripts)</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                          Tamil (தமிழ்)
                        </label>
                        <input
                          type="text"
                          value={newItemForm.translations.ta}
                          onChange={(e) => setNewItemForm({
                            ...newItemForm,
                            translations: { ...newItemForm.translations, ta: e.target.value }
                          })}
                          placeholder="எ.கா. தக்காளி, பால்..."
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs font-semibold focus:outline-none focus:border-brand-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                          Hindi (हिन्दी)
                        </label>
                        <input
                          type="text"
                          value={newItemForm.translations.hi}
                          onChange={(e) => setNewItemForm({
                            ...newItemForm,
                            translations: { ...newItemForm.translations, hi: e.target.value }
                          })}
                          placeholder="उदा. टमाटर, दूध..."
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs font-semibold focus:outline-none focus:border-brand-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                          Telugu (తెలుగు)
                        </label>
                        <input
                          type="text"
                          value={newItemForm.translations.te}
                          onChange={(e) => setNewItemForm({
                            ...newItemForm,
                            translations: { ...newItemForm.translations, te: e.target.value }
                          })}
                          placeholder="ఉదా. టమోటా, పాలు..."
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs font-semibold focus:outline-none focus:border-brand-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                          Kannada (ಕನ್ನಡ)
                        </label>
                        <input
                          type="text"
                          value={newItemForm.translations.kn}
                          onChange={(e) => setNewItemForm({
                            ...newItemForm,
                            translations: { ...newItemForm.translations, kn: e.target.value }
                          })}
                          placeholder="ಉದಾ. ಟೊಮೆಟೊ, ಹಾಲು..."
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs font-semibold focus:outline-none focus:border-brand-500"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                          Malayalam (മലയാളം)
                        </label>
                        <input
                          type="text"
                          value={newItemForm.translations.ml}
                          onChange={(e) => setNewItemForm({
                            ...newItemForm,
                            translations: { ...newItemForm.translations, ml: e.target.value }
                          })}
                          placeholder="ഉദാ. തക്കാളി, പാൽ..."
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs font-semibold focus:outline-none focus:border-brand-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-brand-700 uppercase tracking-wider mb-0.5">
                      Selling Price (₹) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={newItemForm.sellingPrice}
                      onChange={(e) => setNewItemForm({ ...newItemForm, sellingPrice: e.target.value })}
                      placeholder="0.00"
                      className="w-full px-2.5 py-1.5 bg-white border border-brand-400 rounded-xl text-slate-900 font-mono font-bold text-xs focus:outline-none focus:border-brand-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-0.5">
                      Cost Price (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={newItemForm.purchasePrice}
                      onChange={(e) => setNewItemForm({ ...newItemForm, purchasePrice: e.target.value })}
                      placeholder="0.00"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono text-xs focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-0.5">
                      Unit
                    </label>
                    <select
                      value={newItemForm.unit}
                      onChange={(e) => setNewItemForm({ ...newItemForm, unit: e.target.value })}
                      className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold focus:outline-none focus:border-brand-500"
                    >
                      <option value="pcs">Pieces (pcs)</option>
                      <option value="packet">Packet (pkt)</option>
                      <option value="kg">Kilogram (kg)</option>
                      <option value="gram">Gram (g)</option>
                      <option value="bottle">Bottle</option>
                      <option value="box">Box</option>
                      <option value="litre">Litre (L)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-0.5">
                      Initial Qty
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={newItemForm.openingStock}
                      onChange={(e) => setNewItemForm({ ...newItemForm, openingStock: e.target.value })}
                      placeholder="0"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono text-xs font-bold focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsCreatingNew(false)}
                    className="px-3 py-1.5 bg-slate-200 text-slate-700 text-xs font-bold rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-1.5 bg-brand-500 hover:bg-brand-600 text-slate-950 font-black rounded-lg text-xs transition shadow-2xs flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{submitting ? 'Saving...' : 'Save & Select Item'}</span>
                  </button>
                </div>
              </form>
            ) : (
              /* Item Dropdown / Search */
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchItemQuery}
                    onChange={(e) => {
                      setSearchItemQuery(e.target.value);
                      setItemDropdownOpen(true);
                    }}
                    onFocus={() => setItemDropdownOpen(true)}
                    placeholder="Search item name, code or barcode..."
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setItemDropdownOpen(!itemDropdownOpen)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>

                  {/* Dropdown Options */}
                  {itemDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 max-h-64 overflow-y-auto divide-y divide-slate-100">
                      {filteredItemsForSelect.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400">
                          <p>No matching items found.</p>
                          <button
                            type="button"
                            onClick={() => {
                              setItemDropdownOpen(false);
                              setIsCreatingNew(true);
                              setNewItemForm(prev => ({ ...prev, name: searchItemQuery }));
                            }}
                            className="mt-1 text-brand-700 font-bold hover:underline"
                          >
                            + Create "{searchItemQuery}" as new item
                          </button>
                        </div>
                      ) : (
                        filteredItemsForSelect.map(it => (
                          <div
                            key={it._id}
                            onClick={() => {
                              setSelectedItemId(it._id);
                              setSelectedItem(it);
                              setSearchItemQuery(it.name);
                              setItemDropdownOpen(false);
                            }}
                            className={`p-3 hover:bg-brand-50 cursor-pointer flex items-center justify-between transition ${
                              selectedItemId === it._id ? 'bg-brand-50/80 font-bold' : ''
                            }`}
                          >
                            <div>
                              <div className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
                                <span>{getItemDisplayName(it)}</span>
                                {activeLang !== 'en' && it.translations?.[activeLang] && (
                                  <span className="text-[11px] font-normal text-slate-400">({it.name})</span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                                <span>{it.category || 'General'}</span>
                                {it.barcode && <span>• Barcode: <span className="font-mono">{it.barcode}</span></span>}
                                {it.barcodes?.length > 0 && <span>• +{it.barcodes.length} linked</span>}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-black text-brand-700">₹{it.sellingPrice}</span>
                              <div className="text-[10px] text-slate-500 font-mono">
                                Stock: {it.currentStock} {it.unit}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Selected Item Card */}
                {selectedItem && (
                  <div className="p-3.5 bg-brand-50/60 border border-brand-300 rounded-xl flex items-center justify-between animate-in fade-in duration-150">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-brand-100 text-brand-900 rounded-full border border-brand-300 uppercase">
                          Ready for Inward
                        </span>
                        <h4 className="text-sm font-black text-slate-900">
                          {getItemDisplayName(selectedItem)}
                          {activeLang !== 'en' && selectedItem.translations?.[activeLang] && (
                            <span className="text-xs font-normal text-slate-500 ml-1.5">({selectedItem.name})</span>
                          )}
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1">
                        Sell: <span className="font-bold text-slate-800">₹{selectedItem.sellingPrice}</span> • Live Inventory: <span className="font-mono font-bold text-brand-800 text-sm">{selectedItem.currentStock} {selectedItem.unit}</span>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedItemId('');
                        setSelectedItem(null);
                        setSearchItemQuery('');
                      }}
                      className="text-xs text-slate-500 hover:text-slate-700 font-bold px-2.5 py-1.5 rounded-lg bg-white border border-slate-200"
                    >
                      Change
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Recent Inward Scans History Box */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <History className="w-4 h-4 text-brand-600" />
                Live Inward Log ({recentScans.length})
              </span>
              {recentScans.length > 0 && (
                <button
                  type="button"
                  onClick={() => setRecentScans([])}
                  className="text-[10px] text-slate-400 hover:text-slate-600"
                >
                  Clear log
                </button>
              )}
            </div>

            {recentScans.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">
                Scanned items will be logged here in real time.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                {recentScans.map((scan, idx) => (
                  <div key={idx} className="py-2 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-900">{scan.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono ml-2">#{scan.code}</span>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <span className="font-mono font-black text-brand-700 bg-brand-50 px-2 py-0.5 rounded text-xs border border-brand-200">
                        +{scan.qty} {scan.unit}
                      </span>
                      <span className="text-[10px] text-slate-400">{scan.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Continuous Camera Viewfinder & Inward Form (lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Continuous Camera Viewfinder Screen */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-brand-600" />
                Step 2: Continuous Camera Barcode &amp; QR Scanner
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleFacingMode}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-brand-100 text-slate-800 hover:text-brand-900 border border-slate-300 hover:border-brand-300 rounded-lg text-xs font-bold transition flex items-center gap-1 active:scale-95"
                  title="Switch between Rear and Front camera"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-brand-600" />
                  <span>{facingMode === 'environment' ? '📷 Rear (Back)' : '🤳 Front (Selfie)'}</span>
                </button>
                <span className="hidden sm:inline text-[11px] text-slate-400">
                  Hold barcode 15-20cm from camera
                </span>
              </div>
            </div>

            <div className="relative rounded-2xl overflow-hidden bg-black border border-slate-300 shadow-inner min-h-[220px] sm:min-h-[260px] flex items-center justify-center">
              <video 
                ref={videoRef} 
                playsInline 
                muted 
                autoPlay 
                className="w-full h-full object-cover min-h-[220px] sm:min-h-[260px] max-h-[360px]" 
              />

              {/* Aiming Reticle Laser Overlay */}
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                <div className="w-64 sm:w-80 h-28 sm:h-36 border-2 border-brand-400/90 rounded-2xl relative shadow-lg shadow-brand-500/20">
                  <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-brand-400 rounded-tl-lg" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-brand-400 rounded-tr-lg" />
                  <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-brand-400 rounded-bl-lg" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-brand-400 rounded-br-lg" />

                  {/* Laser scan line */}
                  <div className="absolute left-2 right-2 top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-transparent via-brand-400 to-transparent animate-pulse shadow-[0_0_8px_#84cc16]" />
                </div>
              </div>

              {/* Status Header Overlay */}
              <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                <span className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-xs text-[10px] font-bold text-white flex items-center gap-1 border border-white/10">
                  <Zap className="w-3.5 h-3.5 text-brand-400 fill-brand-400" />
                  Fast Detection Ready
                </span>
                {barcode && (
                  <span className="px-2.5 py-1 rounded-lg bg-brand-500 text-slate-950 font-mono font-bold text-xs">
                    #{barcode}
                  </span>
                )}
              </div>

              {cameraError && (
                <div className="absolute inset-0 bg-slate-950/95 p-4 flex flex-col items-center justify-center text-center text-white z-20">
                  <div className="p-3 bg-brand-500/10 rounded-2xl mb-2 text-brand-400">
                    <Camera className="w-8 h-8" />
                  </div>
                  <p className="text-sm font-black text-white mb-1">Camera Permission Required</p>
                  <p className="text-xs text-slate-300 max-w-xs mb-3">{cameraError}</p>
                  <button
                    type="button"
                    onClick={async () => {
                      setCameraError('');
                      if (navigator.mediaDevices?.getUserMedia) {
                        try {
                          const s = await navigator.mediaDevices.getUserMedia({ video: true });
                          s.getTracks().forEach(t => t.stop());
                          window.location.reload();
                        } catch (e) {
                          setCameraError('Permission was rejected. Please enable camera in your browser site settings.');
                        }
                      }
                    }}
                    className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-slate-950 font-black rounded-xl text-xs transition shadow-xs flex items-center gap-1.5 active:scale-95"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Tap to Allow Camera Permission</span>
                  </button>
                </div>
              )}
            </div>

            {/* Manual Barcode Input Fallback */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Barcode className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleBarcodeScanned(barcode);
                    }
                  }}
                  placeholder="Last scanned barcode or type manual barcode & hit Enter..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono text-xs sm:text-sm font-bold focus:outline-none focus:border-brand-500"
                />
              </div>

              <button
                type="button"
                onClick={() => handleBarcodeScanned(barcode)}
                disabled={!barcode.trim()}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition disabled:opacity-50"
              >
                Scan Code
              </button>
            </div>
          </div>

          {/* Success Banner */}
          {saveSuccessMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 text-xs sm:text-sm font-bold flex items-center gap-2.5 animate-in slide-in-from-top duration-200">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          {/* Dynamic Stock Adjustment Box */}
          {selectedItem && (
            <div className="bg-white border border-brand-300 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                    Active Inward Target
                  </span>
                  <h3 className="text-base font-black text-slate-900 mt-1">{selectedItem.name}</h3>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Current Inventory</span>
                  <div className="text-xl font-black text-brand-700 font-mono">
                    {selectedItem.currentStock} {selectedItem.unit}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-brand-700 uppercase tracking-wider">
                      + Add Qty *
                    </label>
                    <div className="flex gap-1">
                      {[1, 5, 10, 20].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setIncomingQty(String(num))}
                          className="px-1.5 py-0.5 text-[10px] bg-slate-100 hover:bg-brand-500 hover:text-slate-950 text-slate-700 font-bold rounded"
                        >
                          +{num}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    required
                    value={incomingQty}
                    onChange={(e) => setIncomingQty(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border-2 border-brand-500 rounded-xl text-slate-900 font-mono font-black text-lg focus:outline-none focus:border-brand-600 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Cost Price (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    placeholder={selectedItem.purchasePrice || '0.00'}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono text-sm focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Selling Price (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    placeholder={selectedItem.sellingPrice || '0.00'}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono text-sm focus:outline-none focus:border-brand-500 font-bold"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => linkBarcodeAndAddStock(selectedItem, barcode, incomingQty)}
                disabled={submitting}
                className="w-full py-3 bg-brand-500 hover:bg-brand-600 active:scale-98 text-slate-950 font-black rounded-xl text-sm transition shadow-xs disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>
                  {submitting ? 'Updating...' : `Confirm Add +${incomingQty || 0} ${selectedItem.unit} to Inventory`}
                </span>
              </button>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
