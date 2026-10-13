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
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Layers,
  Globe,
  Trash2,
  Scale,
  ClipboardList,
  ArrowUpDown,
  Filter,
  Save
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import TransliterateInput from '../components/TransliterateInput';

export default function StockInward() {
  const { currentLang, transliterateWord } = useLanguage();
  const { toast, confirm, prompt } = useToast();
  const [allItems, setAllItems] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchItemQuery, setSearchItemQuery] = useState('');
  const [itemDropdownOpen, setItemDropdownOpen] = useState(false);

  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);

  // Staged Bulk Inward Queue (1 barcode = 1 stock unit)
  const [scanQueue, setScanQueue] = useState([]);
  const [toasts, setToasts] = useState([]);

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

  const getItemDisplayName = (it, lang = currentLang) => {
    if (!it) return '';
    if (lang !== 'en' && it.translations && it.translations[lang]) {
      return it.translations[lang];
    }
    return it.name;
  };

  const isDecimalUnit = (unit, allowDecimals) => {
    if (allowDecimals) return true;
    if (!unit) return false;
    const u = String(unit).toLowerCase().trim();
    return ['kg', 'gram', 'g', 'gm', 'gms', 'kilo', 'litre', 'liter', 'l', 'ml', 'meter', 'm'].includes(u);
  };

  const formatQuantity = (qty, unit, allowDecimals) => {
    const num = parseFloat(qty) || 0;
    if (isDecimalUnit(unit, allowDecimals)) {
      return `${parseFloat(num.toFixed(3))} ${unit}`;
    }
    return `${Math.round(num)} ${unit}`;
  };

  // Scanned Barcode & Stock Form
  const [manualBarcode, setManualBarcode] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [directQty, setDirectQty] = useState('');
  const [inwardTab, setInwardTab] = useState('direct'); // 'direct' (weight / loose / bulk) or 'scanner' (camera / barcode)
  const [submitting, setSubmitting] = useState(false);

  // Top-level View Mode: 'sheet' (Daily Mandi / Bulk Rate Sheet) or 'individual' (Existing Single Inward & Scanner)
  const [mainMode, setMainMode] = useState('sheet');
  const [sheetCategory, setSheetCategory] = useState('All');
  const [sheetSearch, setSheetSearch] = useState('');
  // Map of itemId -> { addStock: '', costPrice: '', sellingPrice: '' }
  const [rateSheetRows, setRateSheetRows] = useState({});
  const [savingSheet, setSavingSheet] = useState(false);
  
  // Continuous Camera & Feedback States
  const [cameraActive, setCameraActive] = useState(true);
  const [cameraError, setCameraError] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
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
      setUnits(catsRes.data?.units || []);
      return items;
    } catch (err) {
      console.error('Error fetching items for stock inward:', err);
      return [];
    }
  };

  useEffect(() => {
    loadAllItems();
  }, []);

  // Global USB Barcode Gun Listener (Works from anywhere on the screen without clicking any input)
  const inwardBarcodeBufferRef = useRef('');
  const inwardLastKeyTimeRef = useRef(0);

  useEffect(() => {
    const handleGlobalBarcodeScan = (e) => {
      // If user is actively typing in a normal text input (like searching or editing rates), ignore
      const activeEl = document.activeElement;
      const isInputActive = ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeEl?.tagName);

      const now = Date.now();
      const isFastTyping = (now - inwardLastKeyTimeRef.current) < 80;
      inwardLastKeyTimeRef.current = now;

      if (e.key === 'Enter') {
        if (inwardBarcodeBufferRef.current.length >= 3) {
          const scannedCode = inwardBarcodeBufferRef.current.trim();
          inwardBarcodeBufferRef.current = '';
          handleIncomingScan(scannedCode);
        }
      } else if (e.key.length === 1) {
        if (isFastTyping || !isInputActive) {
          inwardBarcodeBufferRef.current += e.key;
          setTimeout(() => {
            if (Date.now() - inwardLastKeyTimeRef.current > 450) {
              inwardBarcodeBufferRef.current = '';
            }
          }, 500);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalBarcodeScan);
    return () => window.removeEventListener('keydown', handleGlobalBarcodeScan);
  }, [allItems, selectedItem, scanQueue]);

  // When selectedItemId changes, sync selectedItem state and price fields
  useEffect(() => {
    if (!selectedItemId) {
      setSelectedItem(null);
      setDirectQty('');
      return;
    }
    const found = allItems.find(i => i._id === selectedItemId);
    if (found) {
      setSelectedItem(found);
      setCostPrice(found.purchasePrice !== undefined && found.purchasePrice !== null ? String(found.purchasePrice) : '');
      setSellingPrice(found.sellingPrice !== undefined && found.sellingPrice !== null ? String(found.sellingPrice) : '');
      setDirectQty('');
      if (['kg', 'gram', 'litre', 'ml'].includes(found.unit?.toLowerCase()) || !found.barcode) {
        setInwardTab('direct');
      } else {
        setInwardTab('scanner');
      }
    }
  }, [selectedItemId, allItems]);

  // Direct 1-Click Stock Inward (Immediate update of stock & daily purchase/selling rates)
  const handleDirectInward = async (e) => {
    e?.preventDefault();
    if (!selectedItem) {
      toast.warning('Please select a product on the left first');
      return;
    }
    const qty = parseFloat(directQty);
    if (!qty || qty <= 0) {
      toast.warning('Please enter a valid quantity to inward');
      return;
    }

    setSubmitting(true);
    try {
      const pCost = costPrice !== '' ? Number(costPrice) : (selectedItem.purchasePrice || 0);
      const sRate = sellingPrice !== '' ? Number(sellingPrice) : (selectedItem.sellingPrice || 0);

      const res = await axios.post('/api/items/link-barcode-stock', {
        itemId: selectedItem._id,
        quantity: qty,
        costPrice: pCost,
        sellingPrice: sRate,
        note: `Direct Inward: +${qty} ${selectedItem.unit} (Cost: ₹${pCost}, Sell: ₹${sRate})`
      });

      playSuccessSound();
      toast.success(`Success! Added +${qty} ${selectedItem.unit} to "${getItemDisplayName(selectedItem)}". Live Stock: ${res.data.item.currentStock} ${selectedItem.unit}. Rates updated!`);
      setSelectedItem(res.data.item);
      setDirectQty('');
      await loadAllItems();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error updating stock');
    } finally {
      setSubmitting(false);
    }
  };

  // Daily Rate Sheet: Update single field in local row state
  const handleSheetRowChange = (itemId, field, value) => {
    setRateSheetRows(prev => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || {}),
        [field]: value
      }
    }));
  };

  // Daily Rate Sheet: Auto-calculate Selling Rate from Cost Price using Margin % (e.g. 20%, 25%, 30%)
  const handleApplyMargin = (itemId, marginPercent) => {
    const original = allItems.find(i => i._id === itemId);
    if (!original) return;
    const row = rateSheetRows[itemId] || {};
    const cost = row.costPrice !== undefined && row.costPrice !== '' ? parseFloat(row.costPrice) : (original.purchasePrice || 0);
    if (!cost || cost <= 0) {
      toast.warning('Please enter a Cost Price first to calculate margin');
      return;
    }
    const computedSell = Math.ceil(cost * (1 + marginPercent / 100)); // Round up to nearest integer for clean retail pricing
    handleSheetRowChange(itemId, 'sellingPrice', String(computedSell));
  };

  // Daily Rate Sheet: Commit all edited rows to the backend
  const handleSaveRateSheet = async () => {
    const itemIds = Object.keys(rateSheetRows);
    const updates = [];

    for (const id of itemIds) {
      const row = rateSheetRows[id];
      if (!row) continue;
      const original = allItems.find(i => i._id === id);
      if (!original) continue;

      const addStock = parseFloat(row.addStock) || 0;
      const hasStock = addStock > 0;
      const hasCostChange = row.costPrice !== undefined && row.costPrice !== '' && parseFloat(row.costPrice) !== original.purchasePrice;
      const hasSellChange = row.sellingPrice !== undefined && row.sellingPrice !== '' && parseFloat(row.sellingPrice) !== original.sellingPrice;

      if (hasStock || hasCostChange || hasSellChange) {
        updates.push({
          itemId: id,
          addStock: hasStock ? addStock : 0,
          costPrice: row.costPrice !== undefined && row.costPrice !== '' ? parseFloat(row.costPrice) : original.purchasePrice,
          sellingPrice: row.sellingPrice !== undefined && row.sellingPrice !== '' ? parseFloat(row.sellingPrice) : original.sellingPrice
        });
      }
    }

    if (updates.length === 0) {
      toast.info('No changes detected in the rate sheet to save.');
      return;
    }

    setSavingSheet(true);
    try {
      const res = await axios.post('/api/items/daily-rate-sheet', { updates });
      playSuccessSound();
      toast.success(`Saved! Updated ${res.data.count || updates.length} items with new rates & stock.`);
      // Clear edited rows and refresh live inventory
      setRateSheetRows({});
      await loadAllItems();
    } catch (err) {
      console.error('Error saving rate sheet:', err);
      toast.error(err.response?.data?.message || 'Failed to save daily rate sheet');
    } finally {
      setSavingSheet(false);
    }
  };

  // Stage direct loose quantity into the bulk table
  const handleStageDirectInward = (e) => {
    e?.preventDefault();
    if (!selectedItem) {
      toast.warning('Please select a product on the left first');
      return;
    }
    const qty = parseFloat(directQty);
    if (!qty || qty <= 0) {
      toast.warning('Please enter a valid quantity to stage');
      return;
    }

    playBeep();
    const newEntry = {
      id: Date.now() + Math.random().toString(36).substring(2, 7),
      itemId: selectedItem._id,
      itemName: getItemDisplayName(selectedItem),
      originalName: selectedItem.name,
      unit: selectedItem.unit,
      quantity: qty,
      barcode: '', // non-barcode loose stock
      costPrice: costPrice !== '' ? Number(costPrice) : (selectedItem.purchasePrice || 0),
      sellingPrice: sellingPrice !== '' ? Number(sellingPrice) : (selectedItem.sellingPrice || 0),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };

    setScanQueue(prev => [newEntry, ...prev]);
    toast.success(`Staged: +${qty} ${selectedItem.unit} for "${getItemDisplayName(selectedItem)}" in table`);
    setDirectQty('');
  };

  // Toast Helper
  const showToast = (message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 6);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

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

  const playWarningSound = () => {
    if (!soundEnabled) return;
    try {
      const ctx = audioCtxRef.current || new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.setValueAtTime(220, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
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
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          focusMode: { ideal: 'continuous' }
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

        const handleDetectedCode = (text) => {
          if (!text || scanLockRef.current) return;
          scanLockRef.current = true;
          handleIncomingScan(text);
          setTimeout(() => {
            scanLockRef.current = false;
          }, 1100);
        };

        // Hardware-accelerated BarcodeDetector for fine 19-char Code 128
        if ('BarcodeDetector' in window) {
          try {
            const formats = await window.BarcodeDetector.getSupportedFormats();
            if (formats.includes('code_128') || formats.includes('ean_13')) {
              const detector = new window.BarcodeDetector({ formats });
              const nativeLoop = async () => {
                if (!isMounted || !videoRef.current || scanLockRef.current) {
                  if (isMounted) requestAnimationFrame(nativeLoop);
                  return;
                }
                try {
                  if (videoRef.current.readyState >= 2) {
                    const barcodes = await detector.detect(videoRef.current);
                    if (barcodes && barcodes.length > 0) {
                      const sorted = [...barcodes].sort((a, b) => (b.rawValue?.length || 0) - (a.rawValue?.length || 0));
                      const best = sorted[0]?.rawValue;
                      if (best) handleDetectedCode(best);
                    }
                  }
                } catch (e) {}
                if (isMounted) setTimeout(nativeLoop, 80);
              };
              nativeLoop();
            }
          } catch (e) {}
        }

        const reader = new BrowserMultiFormatReader(hints, 100);
        codeReaderRef.current = reader;

        reader.decodeFromVideoElement(
          videoRef.current,
          (result) => {
            if (result && !scanLockRef.current) {
              const text = result.getText();
              if (text) handleDetectedCode(text);
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
  // Check if a barcode is already added in database under any item
  const findItemWithBarcodeInDB = (code) => {
    const clean = code.trim().toLowerCase();
    return allItems.find(it => {
      if (it.barcode && it.barcode.trim().toLowerCase() === clean) return true;
      if (it.code && it.code.trim().toLowerCase() === clean) return true;
      if (Array.isArray(it.barcodes) && it.barcodes.some(b => b && b.trim().toLowerCase() === clean)) return true;
      return false;
    });
  };

  // Main Incoming Scan Handler (Zero-confirmation, 1 stock per unique barcode, duplicates warned via Toast)
  const handleIncomingScan = (scannedCode) => {
    const code = (scannedCode || '').trim();
    if (!code) return;

    // 1. Check if this barcode is ALREADY in the current staged queue
    const duplicateInQueue = scanQueue.find(q => q.barcode.toLowerCase() === code.toLowerCase());
    if (duplicateInQueue) {
      playWarningSound();
      showToast(`Already this item added in stock! Barcode "${code}" is already in the list.`, 'error');
      return;
    }

    // 2. Check if this barcode is ALREADY registered in the Database under any item
    const existingInDB = findItemWithBarcodeInDB(code);

    let targetItem = selectedItem;

    if (!targetItem) {
      if (existingInDB) {
        targetItem = existingInDB;
        setSelectedItem(existingInDB);
        setSelectedItemId(existingInDB._id);
        setCostPrice(existingInDB.purchasePrice || '');
        setSellingPrice(existingInDB.sellingPrice || '');
      } else {
        playWarningSound();
        showToast(`Barcode "${code}" detected! Please select an item on the left first to link this barcode.`, 'warning');
        setManualBarcode(code);
        return;
      }
    } else {
      if (existingInDB && existingInDB._id !== targetItem._id) {
        playWarningSound();
        showToast(`Already added in stock! Barcode "${code}" belongs to "${getItemDisplayName(existingInDB)}"`, 'error');
        return;
      }
      if (existingInDB && existingInDB._id === targetItem._id) {
        playWarningSound();
        showToast(`Already added in stock! Barcode "${code}" already exists for "${getItemDisplayName(targetItem)}".`, 'error');
        return;
      }
    }

    // 3. Success: Valid unique barcode! Add directly into staged queue (1 count per barcode)
    playBeep();
    const newEntry = {
      id: Date.now() + Math.random().toString(36).substring(2, 7),
      itemId: targetItem._id,
      itemName: getItemDisplayName(targetItem),
      originalName: targetItem.name,
      unit: targetItem.unit,
      barcode: code,
      costPrice: costPrice !== '' ? Number(costPrice) : (targetItem.purchasePrice || 0),
      sellingPrice: sellingPrice !== '' ? Number(sellingPrice) : (targetItem.sellingPrice || 0),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };

    setScanQueue(prev => [newEntry, ...prev]);
    showToast(`Added: "${code}" for "${getItemDisplayName(targetItem)}" (+1 ${targetItem.unit})`, 'success');
  };

  // Remove a staged item from the table
  const handleRemoveFromQueue = (entryId) => {
    setScanQueue(prev => prev.filter(q => q.id !== entryId));
  };

  // Clear all staged items
  const handleClearQueue = async () => {
    if (scanQueue.length === 0) return;
    const ok = await confirm({
      title: 'Clear Inward Table',
      message: 'Are you sure you want to clear all items from the inward staging table?',
      confirmText: 'Clear All',
      cancelText: 'Cancel',
      type: 'warning'
    });
    if (ok) {
      setScanQueue([]);
      toast.info('Inward table cleared');
    }
  };

  // Commit and Create Bulk Stock
  const handleBulkCommitStock = async () => {
    if (scanQueue.length === 0) {
      toast.warning('Inward table is empty! Scan one or more barcodes first.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await axios.post('/api/items/bulk-barcode-inward', {
        items: scanQueue
      });

      playSuccessSound();
      toast.success(`Success! ${scanQueue.length} items added into stock!`);

      // Refresh items list
      await loadAllItems();

      // Clear the staged table
      setScanQueue([]);
    } catch (err) {
      console.error('Bulk commit error:', err);
      toast.error(err.response?.data?.message || 'Failed to commit stock inward');
    } finally {
      setSubmitting(false);
    }
  };

  // Quick Create New Product (No Initial Count)
  const handleCreateNewItem = async (e) => {
    e.preventDefault();
    if (!newItemForm.name?.trim()) {
      toast.warning('Product Name is required');
      return;
    }
    if (!newItemForm.category?.trim() || newItemForm.category === 'All') {
      toast.warning('Category is required! A product cannot be created without a category.');
      return;
    }
    if (newItemForm.sellingPrice === undefined || newItemForm.sellingPrice === '') {
      toast.warning('Selling Price is required');
      return;
    }

    setSubmitting(true);
    try {
      let cleanName = newItemForm.name.trim();
      if (currentLang !== 'en' && /[a-zA-Z]/.test(cleanName)) {
        const converted = await transliterateWord(cleanName, currentLang);
        if (converted) cleanName = converted;
      }

      const payload = {
        name: cleanName,
        language: currentLang,
        translations: {
          ...(newItemForm.translations || {}),
          ...(currentLang !== 'en' ? { [currentLang]: cleanName } : {})
        },
        category: newItemForm.category.trim(),
        unit: newItemForm.unit,
        sellingPrice: Number(newItemForm.sellingPrice),
        purchasePrice: Number(newItemForm.purchasePrice) || 0,
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
        lowStockLevel: 5,
        isQuickItem: false,
        gstPercent: 0
      });

      const dispName = getItemDisplayName(created);
      showToast(`Product "${dispName}" created! Ready to scan packet barcodes.`, 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create item', 'error');
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
    <div className="space-y-3 relative">
      
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

      {/* Top Navigation & Mode Switcher Bar */}
      <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          {/* Top-Level Mode Selector */}
          <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex items-center gap-1 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setMainMode('sheet')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-black transition ${
                mainMode === 'sheet'
                  ? 'bg-brand-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <ClipboardList className="w-4 h-4 text-slate-950" />
              <span>Daily Rate &amp; Inward Sheet</span>
            </button>
            <button
              type="button"
              onClick={() => setMainMode('individual')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-black transition ${
                mainMode === 'individual'
                  ? 'bg-brand-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Scale className="w-4 h-4 text-slate-950" />
              <span>Barcode &amp; Single Inward</span>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2">
          {mainMode === 'sheet' && (
            <button
              type="button"
              onClick={handleSaveRateSheet}
              disabled={savingSheet || Object.keys(rateSheetRows).length === 0}
              className="flex-1 sm:flex-none px-4 py-2 bg-brand-500 hover:bg-brand-400 text-slate-950 font-black rounded-xl text-xs transition shadow-sm flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-40"
            >
              <Save className="w-4 h-4" />
              <span>{savingSheet ? 'Saving...' : `Save Changes (${Object.keys(rateSheetRows).length})`}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl border transition shrink-0 ${
              soundEnabled ? 'text-brand-800 bg-brand-50 border-brand-200' : 'text-slate-400 bg-slate-100 border-slate-200'
            }`}
            title="Toggle Sound"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* VIEW 1: DAILY MANDI / BULK RATE SHEET (Fast Table for Vegetables, Fruits & All Items) */}
      {mainMode === 'sheet' && (
        <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          
          {/* Filters Bar: Category Pills + Search Box */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar flex-1">
              <button
                type="button"
                onClick={() => setSheetCategory('All')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition ${
                  sheetCategory === 'All'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All ({allItems.length})
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSheetCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition ${
                    sheetCategory === cat
                      ? 'bg-brand-500 text-slate-950 shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat} ({allItems.filter(i => i.category === cat).length})
                </button>
              ))}
            </div>

            <div className="relative sm:w-60 shrink-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={sheetSearch}
                onChange={(e) => setSheetSearch(e.target.value)}
                placeholder="Search items..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          {/* Rate Sheet Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200 font-black text-slate-700 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3 min-w-[140px]">Product</th>
                  <th className="py-2.5 px-3 text-right">Stock</th>
                  <th className="py-2.5 px-3 w-28 text-center bg-brand-50/50">+ Add Qty</th>
                  <th className="py-2.5 px-3 w-28 text-center">Cost (₹)</th>
                  <th className="py-2.5 px-3 w-36 text-center bg-brand-50/70">Selling Rate (₹)</th>
                  <th className="py-2.5 px-3 text-right">New Stock</th>
                  <th className="py-2.5 px-3 text-right">Total Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allItems
                  .filter(i => {
                    const matchesCat = sheetCategory === 'All' || i.category === sheetCategory;
                    const q = sheetSearch.toLowerCase().trim();
                    if (!q) return matchesCat;
                    const matchName = i.name.toLowerCase().includes(q);
                    const matchTrans = i.translations && Object.values(i.translations).some(
                      t => t && t.toLowerCase().includes(q)
                    );
                    return matchesCat && (matchName || matchTrans || (i.code && i.code.toLowerCase().includes(q)));
                  })
                  .map((item) => {
                    const rowData = rateSheetRows[item._id] || {};
                    const addStockVal = rowData.addStock !== undefined ? rowData.addStock : '';
                    const costVal = rowData.costPrice !== undefined ? rowData.costPrice : (item.purchasePrice !== undefined ? String(item.purchasePrice) : '');
                    const sellVal = rowData.sellingPrice !== undefined ? rowData.sellingPrice : (item.sellingPrice !== undefined ? String(item.sellingPrice) : '');

                    const addQtyNum = parseFloat(addStockVal) || 0;
                    const costNum = parseFloat(costVal) || 0;
                    const newTotalStock = (parseFloat(item.currentStock) || 0) + addQtyNum;
                    const totalCostForAdded = addQtyNum * costNum;
                    const isEdited = rowData.addStock || (rowData.costPrice !== undefined && rowData.costPrice !== '') || (rowData.sellingPrice !== undefined && rowData.sellingPrice !== '');

                    return (
                      <tr key={item._id} className={`transition ${isEdited ? 'bg-amber-50/40 hover:bg-amber-50/70' : 'hover:bg-slate-50'}`}>
                        {/* 1. Product */}
                        <td className="py-2 px-3">
                          <div className="font-extrabold text-slate-900 text-xs">
                            {getItemDisplayName(item)}
                          </div>
                          {currentLang !== 'en' && item.translations?.[currentLang] && item.name?.trim().toLowerCase() !== getItemDisplayName(item)?.trim().toLowerCase() && (
                            <div className="text-[10px] text-slate-400 font-medium">{item.name}</div>
                          )}
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {item.category} {item.code ? `• #${item.code}` : ''}
                          </div>
                        </td>

                        {/* 2. Live Current Stock */}
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-700">
                          {formatQuantity(item.currentStock, item.unit, item.allowDecimals)}
                        </td>

                        {/* 3. + Add Qty Input */}
                        <td className="py-2.5 px-3 bg-brand-50/20">
                          <input
                            type="number"
                            step={isDecimalUnit(item.unit, item.allowDecimals) ? 'any' : '1'}
                            min="0"
                            placeholder="0"
                            value={addStockVal}
                            onChange={(e) => handleSheetRowChange(item._id, 'addStock', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 focus:border-brand-500 rounded-lg text-slate-900 font-mono font-bold text-center text-xs focus:outline-none shadow-2xs"
                          />
                        </td>

                        {/* 4. Wholesale Cost (₹) */}
                        <td className="py-2.5 px-3">
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              value={costVal}
                              onChange={(e) => handleSheetRowChange(item._id, 'costPrice', e.target.value)}
                              className="w-full pl-6 pr-2 py-1.5 bg-white border border-slate-300 focus:border-brand-500 rounded-lg text-slate-900 font-mono text-center text-xs focus:outline-none shadow-2xs"
                            />
                          </div>
                        </td>

                        {/* 5. Selling Rate (₹) */}
                        <td className="py-2.5 px-3 bg-amber-50/30">
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-black text-amber-700">₹</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              value={sellVal}
                              onChange={(e) => handleSheetRowChange(item._id, 'sellingPrice', e.target.value)}
                              className="w-full pl-6 pr-2 py-1.5 bg-white border-2 border-brand-500 rounded-lg text-slate-950 font-mono font-black text-center text-xs focus:outline-none shadow-2xs"
                            />
                          </div>
                          {/* Margin Suggestion Buttons */}
                          <div className="flex items-center justify-center gap-1 mt-1">
                            <button
                              type="button"
                              onClick={() => handleApplyMargin(item._id, 20)}
                              className="px-1.5 py-0.5 text-[9px] font-black bg-white hover:bg-brand-50 text-slate-700 hover:text-brand-900 rounded border border-slate-200 shadow-2xs"
                              title="+20% margin"
                            >
                              +20%
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApplyMargin(item._id, 25)}
                              className="px-1.5 py-0.5 text-[9px] font-black bg-white hover:bg-brand-50 text-slate-700 hover:text-brand-900 rounded border border-slate-200 shadow-2xs"
                              title="+25% margin"
                            >
                              +25%
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApplyMargin(item._id, 30)}
                              className="px-1.5 py-0.5 text-[9px] font-black bg-white hover:bg-brand-50 text-slate-700 hover:text-brand-900 rounded border border-slate-200 shadow-2xs"
                              title="+30% margin"
                            >
                              +30%
                            </button>
                          </div>
                        </td>

                        {/* 6. New Total Stock */}
                        <td className="py-2 px-3 text-right font-mono font-black text-slate-800">
                          {formatQuantity(newTotalStock, item.unit, item.allowDecimals)}
                        </td>

                        {/* 7. Total Cost for Added Qty */}
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          {totalCostForAdded > 0 ? `₹${totalCostForAdded.toFixed(2)}` : '—'}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: INDIVIDUAL ITEM INWARD & CONTINUOUS BARCODE SCANNER (Preserved Original Logic) */}
      {mainMode === 'individual' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        
        {/* LEFT COLUMN: Item Selector & Quick Creator (lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-4">
          
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-brand-600" />
                Step 1: Select Product to Stock
              </label>

              <button
                type="button"
                onClick={() => setIsCreatingNew(!isCreatingNew)}
                className="text-xs font-bold text-brand-800 hover:text-brand-900 bg-brand-100 hover:bg-brand-200 px-2.5 py-1 rounded-lg transition flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isCreatingNew ? 'Pick Existing' : '+ Create New Product'}</span>
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
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Product Name *
                  </label>
                  <TransliterateInput
                    required
                    autoFocus
                    value={newItemForm.name}
                    onChange={(e) => setNewItemForm({ ...newItemForm, name: e.target.value })}
                    placeholder="Enter product name (பொருள் பெயர் உள்ளிடவும்)..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm font-bold focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-0.5">
                      Category *
                    </label>
                    <select
                      required
                      value={newItemForm.category}
                      onChange={async (e) => {
                        if (e.target.value === '__add_category__') {
                          const newCat = await prompt({
                            title: 'Create Category',
                            message: 'Enter new category name:',
                            placeholder: 'Enter category name...',
                            confirmText: 'Add Category'
                          });
                          if (newCat && newCat.trim()) {
                            let cleanCat = newCat.trim();
                            if (currentLang !== 'en' && /[a-zA-Z]/.test(cleanCat)) {
                              const converted = await transliterateWord(cleanCat, currentLang);
                              if (converted) cleanCat = converted;
                            }
                            try {
                              const autoTrans = currentLang !== 'en' ? { [currentLang]: cleanCat } : {};
                              await axios.post('/api/categories', { 
                                name: cleanCat, 
                                language: currentLang,
                                translations: autoTrans 
                              });
                              setCategories(prev => Array.from(new Set([...prev, cleanCat])));
                              setNewItemForm({ ...newItemForm, category: cleanCat });
                              toast.success(`Category "${cleanCat}" created`);
                            } catch (err) {
                              toast.error(err.response?.data?.message || 'Error creating category');
                            }
                          }
                        } else {
                          setNewItemForm({ ...newItemForm, category: e.target.value });
                        }
                      }}
                      className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold focus:outline-none focus:border-brand-500"
                    >
                      <option value="">-- Select Category * --</option>
                      {categories.filter(c => c && c !== 'All').map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                      <option value="__add_category__">+ Add New Category...</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-0.5">
                      Unit *
                    </label>
                    <div className="flex gap-1">
                      <select
                        value={newItemForm.unit}
                        onChange={(e) => {
                          if (e.target.value === '__add_new__') {
                            const newU = prompt('Enter new custom unit name (e.g. meter, tin, bundle, sack):');
                            if (newU && newU.trim()) {
                              const cleanU = newU.trim().toLowerCase();
                              axios.post('/api/items/units', { name: cleanU })
                                .then(res => {
                                  setUnits(res.data?.units || [...units, { name: cleanU }]);
                                  setNewItemForm({ ...newItemForm, unit: cleanU });
                                  showToast(`Unit "${cleanU}" added!`, 'success');
                                })
                                .catch(() => {
                                  setUnits(prev => [...prev, { name: cleanU }]);
                                  setNewItemForm({ ...newItemForm, unit: cleanU });
                                });
                            }
                          } else {
                            setNewItemForm({ ...newItemForm, unit: e.target.value });
                          }
                        }}
                        className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold focus:outline-none focus:border-brand-500"
                      >
                        {units.map((u) => {
                          const uName = typeof u === 'string' ? u : u.name;
                          return (
                            <option key={uName} value={uName}>{uName}</option>
                          );
                        })}
                        <option value="__add_new__">+ Add New Custom Unit...</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                    <span>{submitting ? 'Saving...' : 'Save & Select Product'}</span>
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
                    placeholder="Search product name, code or barcode..."
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
                                {currentLang !== 'en' && it.translations?.[currentLang] && (
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
                          {currentLang !== 'en' && selectedItem.translations?.[currentLang] && selectedItem.name?.trim().toLowerCase() !== getItemDisplayName(selectedItem).trim().toLowerCase() && (
                            <span className="text-xs font-normal text-slate-500 ml-1.5">({selectedItem.name})</span>
                          )}
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1">
                        Sell: <span className="font-bold text-slate-800">₹{selectedItem.sellingPrice}</span> • Live Inventory: <span className="font-mono font-bold text-brand-800 text-sm">{selectedItem.currentStock} {selectedItem.unit}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {selectedItem.currentStock > 0 && (
                        <button
                          type="button"
                          onClick={async () => {
                            const ok = await confirm({
                              title: 'Reset Stock to 0',
                              message: `Reset live inventory for "${selectedItem.name}" to 0?`,
                              description: 'All linked individual barcodes will also be cleared.',
                              confirmText: 'Zero Stock',
                              cancelText: 'Cancel',
                              type: 'warning'
                            });
                            if (!ok) return;

                            try {
                              const res = await axios.delete(`/api/items/${selectedItem._id}/stock`);
                              setSelectedItem(res.data.item);
                              await loadAllItems();
                              toast.success(`Stock for "${selectedItem.name}" reset to 0`);
                            } catch (err) {
                              toast.error('Failed to reset stock: ' + (err.response?.data?.message || err.message));
                            }
                          }}
                          className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 font-bold px-2.5 py-1.5 rounded-lg border border-red-200 transition-colors cursor-pointer"
                        >
                          Zero Stock
                        </button>
                      )}
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
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Staged Summary Card */}
          <div className="bg-slate-900 text-white p-4 rounded-2xl flex items-center justify-between shadow-xs">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Staged to Add</span>
              <div className="text-2xl font-black font-mono text-brand-400 mt-0.5">
                {scanQueue.length} <span className="text-xs text-slate-300 font-normal">items in table</span>
              </div>
            </div>
            
            {scanQueue.length > 0 && (
              <button
                type="button"
                onClick={handleBulkCommitStock}
                disabled={submitting}
                className="px-4 py-2.5 bg-brand-500 hover:bg-brand-400 text-slate-950 font-black rounded-xl text-xs transition shadow-xs flex items-center gap-1.5 active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>{submitting ? 'Creating...' : `Create All Stock (${scanQueue.length})`}</span>
              </button>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Dual Method Inwarding (lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-3">
          
          {/* Mode Switcher Tabs */}
          <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setInwardTab('direct')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-black transition ${
                inwardTab === 'direct'
                  ? 'bg-brand-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Scale className="w-4 h-4" />
              <span>
                {selectedItem 
                  ? (isDecimalUnit(selectedItem.unit, selectedItem.allowDecimals) ? 'Weight & Loose Inward (kg / gram)' : 'Direct Quantity Inward (Packets / Units)')
                  : 'Quantity & Weight Inward (kg / packets)'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setInwardTab('scanner')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-black transition ${
                inwardTab === 'scanner'
                  ? 'bg-brand-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Barcode Scanner (Packets / Products)</span>
            </button>
          </div>

          {/* TAB 1: Weight & Daily Rates Inward Panel (Vegetables, Fruits, Loose Grains, Custom Quantities) */}
          {inwardTab === 'direct' && (
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 gap-2">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-brand-600" />
                    {selectedItem && !isDecimalUnit(selectedItem.unit, selectedItem.allowDecimals)
                      ? "Step 2: Enter Purchased Packets & Rates"
                      : "Step 2: Enter Purchase Quantity / Weight & Rates"}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedItem && !isDecimalUnit(selectedItem.unit, selectedItem.allowDecimals)
                      ? `Add count of ${selectedItem.unit}s purchased, wholesale cost, and selling price`
                      : "Set wholesale purchase price, purchased quantity/kg, and retail selling rate"}
                  </p>
                </div>
                {selectedItem && (
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border shrink-0 ${
                    isDecimalUnit(selectedItem.unit, selectedItem.allowDecimals)
                      ? 'bg-amber-50 border-amber-300 text-amber-900'
                      : 'bg-brand-50 border-brand-300 text-brand-900'
                  }`}>
                    {selectedItem.unit} • {isDecimalUnit(selectedItem.unit, selectedItem.allowDecimals) ? 'Decimals allowed' : 'Whole units'}
                  </span>
                )}
              </div>

              {!selectedItem ? (
                <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-slate-400 space-y-2">
                  <Package className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="font-bold text-slate-700 text-sm">Please select a product on the left first</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Search and pick any product from the catalog on the left to add purchased stock.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleDirectInward} className="space-y-3.5">
                  {/* Selected Product Banner */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Selected Product</span>
                      <h4 className="text-base font-black text-slate-900 mt-0.5">
                        {getItemDisplayName(selectedItem)}
                        {currentLang !== 'en' && selectedItem.translations?.[currentLang] && selectedItem.name?.trim().toLowerCase() !== getItemDisplayName(selectedItem).trim().toLowerCase() && (
                          <span className="text-xs font-normal text-slate-500 ml-1.5">({selectedItem.name})</span>
                        )}
                      </h4>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Current Live Stock</span>
                      <span className="text-base font-black font-mono text-brand-700">
                        {formatQuantity(selectedItem.currentStock, selectedItem.unit, selectedItem.allowDecimals)}
                      </span>
                    </div>
                  </div>

                  {/* 3 Perfectly Aligned Input Columns */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
                    {/* Column 1: Quantity Inwarded */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between h-5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Quantity Purchased *
                        </label>
                        <span className="text-[10px] font-semibold text-slate-400">
                          {isDecimalUnit(selectedItem.unit, selectedItem.allowDecimals) ? 'kg / g' : 'Packets'}
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          step={isDecimalUnit(selectedItem.unit, selectedItem.allowDecimals) ? 'any' : '1'}
                          min={isDecimalUnit(selectedItem.unit, selectedItem.allowDecimals) ? '0.001' : '1'}
                          required
                          autoFocus
                          value={directQty}
                          onChange={(e) => setDirectQty(e.target.value)}
                          placeholder={isDecimalUnit(selectedItem.unit, selectedItem.allowDecimals) ? 'e.g. 25.5' : 'e.g. 5'}
                          className="w-full h-11 pl-3.5 pr-12 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono font-bold text-base focus:outline-none focus:border-brand-500 shadow-2xs"
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400 uppercase pointer-events-none">
                          {selectedItem.unit}
                        </span>
                      </div>
                    </div>

                    {/* Column 2: Wholesale Cost Price */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between h-5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Wholesale Cost
                        </label>
                        <span className="text-[10px] font-semibold text-slate-400">
                          ₹/{selectedItem.unit}
                        </span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 pointer-events-none">₹</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={costPrice}
                          onChange={(e) => setCostPrice(e.target.value)}
                          placeholder={String(selectedItem.purchasePrice || '0.00')}
                          className="w-full h-11 pl-8 pr-3.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono font-bold text-base focus:outline-none focus:border-brand-500 shadow-2xs"
                        />
                      </div>
                    </div>

                    {/* Column 3: Today's Selling Rate */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between h-5">
                        <label className="text-xs font-black text-brand-900 uppercase tracking-wider">
                          Today's Selling Rate *
                        </label>
                        <span className="text-[10px] font-semibold text-brand-700">
                          ₹/{selectedItem.unit}
                        </span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-brand-700 pointer-events-none">₹</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          required
                          value={sellingPrice}
                          onChange={(e) => setSellingPrice(e.target.value)}
                          placeholder={String(selectedItem.sellingPrice || '0.00')}
                          className="w-full h-11 pl-8 pr-3.5 bg-brand-50/40 border-2 border-brand-500 rounded-xl text-brand-950 font-mono font-black text-base focus:outline-none focus:border-brand-600 shadow-2xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Dedicated Quick Presets & Margin Controls Bar */}
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                    {/* Quantity Quick Presets */}
                    <div className="flex items-center flex-wrap gap-1.5">
                      <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wide mr-1 shrink-0">
                        ⚡ Quick Add:
                      </span>
                      {isDecimalUnit(selectedItem.unit, selectedItem.allowDecimals) ? (
                        <>
                          {[0.25, 0.5, 1, 2, 5, 10, 25, 50].map((w) => (
                            <button
                              key={w}
                              type="button"
                              onClick={() => {
                                const current = parseFloat(directQty) || 0;
                                setDirectQty(String(parseFloat((current + w).toFixed(3))));
                              }}
                              className="px-2.5 py-1 bg-white hover:bg-brand-50 hover:border-brand-400 text-slate-700 hover:text-brand-900 text-xs font-bold rounded-lg border border-slate-200 shadow-2xs transition active:scale-95"
                            >
                              +{w >= 1 ? `${w} kg` : `${w * 1000}g`}
                            </button>
                          ))}
                        </>
                      ) : (
                        <>
                          {[1, 2, 5, 10, 20, 50, 100].map((cnt) => (
                            <button
                              key={cnt}
                              type="button"
                              onClick={() => {
                                const current = parseInt(directQty, 10) || 0;
                                setDirectQty(String(current + cnt));
                              }}
                              className="px-2.5 py-1 bg-white hover:bg-brand-50 hover:border-brand-400 text-slate-700 hover:text-brand-900 text-xs font-bold rounded-lg border border-slate-200 shadow-2xs transition active:scale-95"
                            >
                              +{cnt} {selectedItem.unit}
                            </button>
                          ))}
                        </>
                      )}
                      {directQty && (
                        <button
                          type="button"
                          onClick={() => setDirectQty('')}
                          className="px-2 py-1 text-red-600 hover:bg-red-50 rounded-lg text-xs font-bold transition ml-1"
                          title="Clear quantity"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    {/* Quick Profit Margin Presets */}
                    <div className="flex items-center flex-wrap gap-1.5 md:border-l md:border-slate-200 md:pl-3">
                      <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wide mr-1 shrink-0">
                        Margin:
                      </span>
                      {[15, 20, 25, 30, 40].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => {
                            const cost = parseFloat(costPrice) || selectedItem.purchasePrice || 0;
                            if (!cost || cost <= 0) {
                              toast.warning('Please enter a Wholesale Cost first to calculate margin');
                              return;
                            }
                            const calc = Math.ceil(cost * (1 + pct / 100));
                            setSellingPrice(String(calc));
                          }}
                          className="px-2 py-1 bg-white hover:bg-amber-50 hover:border-amber-400 text-slate-700 hover:text-amber-900 text-xs font-bold rounded-lg border border-slate-200 shadow-2xs transition active:scale-95"
                          title={`Set selling rate with +${pct}% profit margin`}
                        >
                          +{pct}%
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Calculations Summary: 3 Balanced Metric Cards */}
                  {directQty && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3.5 bg-brand-50/70 border border-brand-200 rounded-xl animate-in fade-in duration-150">
                      <div className="bg-white/80 p-2.5 rounded-lg border border-brand-200/60">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                          Total Inward Cost
                        </span>
                        <span className="text-base font-black font-mono text-slate-900 mt-0.5 block">
                          ₹{((parseFloat(directQty) || 0) * (parseFloat(costPrice) || selectedItem.purchasePrice || 0)).toFixed(2)}
                        </span>
                      </div>

                      <div className="bg-white/80 p-2.5 rounded-lg border border-brand-200/60">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                          New Total Stock
                        </span>
                        <span className="text-base font-black font-mono text-brand-800 mt-0.5 block">
                          {formatQuantity(
                            (parseFloat(selectedItem.currentStock || 0) + (parseFloat(directQty) || 0)),
                            selectedItem.unit,
                            selectedItem.allowDecimals
                          )}
                        </span>
                      </div>

                      <div className="bg-white/80 p-2.5 rounded-lg border border-brand-200/60">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                          Updated Selling Rate
                        </span>
                        <span className="text-base font-black font-mono text-slate-900 mt-0.5 block">
                          ₹{parseFloat(sellingPrice || selectedItem.sellingPrice || 0).toFixed(2)} / {selectedItem.unit}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={handleStageDirectInward}
                      disabled={!directQty}
                      className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition active:scale-98 disabled:opacity-50 cursor-pointer"
                    >
                      + Stage to Table Below
                    </button>

                    <button
                      type="submit"
                      disabled={submitting || !directQty}
                      className="w-full sm:w-auto px-6 py-2.5 bg-brand-500 hover:bg-brand-400 text-slate-950 font-black rounded-xl text-xs sm:text-sm transition shadow-xs flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50 cursor-pointer"
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>{submitting ? 'Updating...' : `Inward ${directQty || '0'} ${selectedItem.unit} to Inventory`}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 2: Continuous Camera Scanner (Packets & Barcode Items) */}
          {inwardTab === 'scanner' && (
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-brand-600" />
                  Step 2: Instant Camera Scanner (1 Barcode = 1 Stock)
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
                </div>
              </div>

              <div className="relative rounded-2xl overflow-hidden bg-black border border-slate-300 shadow-inner min-h-[220px] sm:min-h-[260px] flex items-center justify-center">
                <video 
                  ref={videoRef} 
                  playsInline 
                  muted 
                  autoPlay 
                  className="w-full h-full object-cover min-h-[220px] sm:min-h-[260px] max-h-[340px]" 
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
                    Continuous Auto-Capture Ready
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-brand-500 text-slate-950 font-mono font-bold text-xs">
                    {scanQueue.length} staged
                  </span>
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
                    value={manualBarcode}
                    onChange={(e) => setManualBarcode(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleIncomingScan(manualBarcode);
                        setManualBarcode('');
                      }
                    }}
                    placeholder="Scan barcode or type & hit Enter..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono text-xs sm:text-sm font-bold focus:outline-none focus:border-brand-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    handleIncomingScan(manualBarcode);
                    setManualBarcode('');
                  }}
                  disabled={!manualBarcode.trim()}
                  className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-slate-950 font-black rounded-xl text-xs transition disabled:opacity-50"
                >
                  + Add Barcode
                </button>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* FULL-WIDTH STAGED BULK INWARD TABLE & CREATE BUTTON */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-brand-600" />
              Staged Stock Inward Table ({scanQueue.length} entries staged)
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Review all inward batches below (vegetable weights, packets and scanned barcodes). Click "Create &amp; Update Stock" to commit.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {scanQueue.length > 0 && (
              <button
                type="button"
                onClick={handleClearQueue}
                className="px-3 py-2 bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 hover:border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear List</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleBulkCommitStock}
              disabled={submitting || scanQueue.length === 0}
              className="px-5 py-2.5 bg-brand-500 hover:bg-brand-400 active:scale-95 text-slate-950 font-black rounded-xl text-xs sm:text-sm transition shadow-xs disabled:opacity-40 flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>{submitting ? 'Creating Stock...' : `Commit All Stock (${scanQueue.length} entries)`}</span>
            </button>
          </div>
        </div>

        {scanQueue.length === 0 ? (
          <div className="p-8 text-center text-slate-400 space-y-2">
            <Scale className="w-10 h-10 mx-auto text-slate-300 stroke-1" />
            <p className="text-sm font-bold text-slate-600">No stock entries staged yet</p>
            <p className="text-xs max-w-sm mx-auto text-slate-400">
              Select a product above to add purchased weight/quantity, or point camera to barcodes.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Item Name</th>
                  <th className="py-2.5 px-3">Barcode / Batch Type</th>
                  <th className="py-2.5 px-3 text-center">Quantity to Add</th>
                  <th className="py-2.5 px-3 text-right">Cost Price</th>
                  <th className="py-2.5 px-3 text-right">Selling Price</th>
                  <th className="py-2.5 px-3 text-right">Total Cost</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {scanQueue.map((item, index) => (
                  <tr key={item.id} className="hover:bg-brand-50/40 transition">
                    <td className="py-2.5 px-3 font-mono text-slate-400 font-bold">
                      {index + 1}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">
                      {item.itemName}
                    </td>
                    <td className="py-2.5 px-3">
                      {item.barcode ? (
                        <span className="font-mono bg-slate-100 text-slate-900 px-2 py-0.5 rounded border border-slate-200 font-bold text-xs">
                          {item.barcode}
                        </span>
                      ) : (
                        <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 font-bold px-2 py-0.5 rounded text-[10px]">
                          Loose Stock ({item.unit})
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center font-black text-brand-800">
                      <span className="px-2 py-0.5 bg-brand-100 border border-brand-300 rounded font-mono">
                        +{item.quantity || 1} {item.unit}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                      ₹{Number(item.costPrice || 0).toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                      ₹{Number(item.sellingPrice || 0).toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-slate-900 font-mono">
                      ₹{((Number(item.quantity || 1)) * Number(item.costPrice || 0)).toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveFromQueue(item.id)}
                        className="p-1 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded-md transition"
                        title="Remove from table"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
        </>
      )}

    </div>
  );
}
