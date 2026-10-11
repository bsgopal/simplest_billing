import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { 
  Barcode, 
  Camera, 
  Plus, 
  Check, 
  Search, 
  X, 
  Sparkles, 
  RefreshCw, 
  Package, 
  AlertCircle,
  Tag,
  CheckCircle2,
  Volume2,
  VolumeX,
  Zap,
  ArrowRight,
  History,
  Link,
  ChevronDown,
  Layers,
  Globe
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import TransliterateInput from './TransliterateInput';

export default function BarcodeStockModal({
  isOpen,
  onClose,
  onItemSaved,
  categories = []
}) {
  const { currentLang } = useLanguage();
  const [allItems, setAllItems] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchItemQuery, setSearchItemQuery] = useState('');
  const [itemDropdownOpen, setItemDropdownOpen] = useState(false);

  // New Item Quick Creation inline form
  const [isCreatingNew, setIsCreatingNew] = useState(false);
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

  const getItemDisplayName = (it, lang = currentLang) => {
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

  const scannerRef = useRef(null);
  const scanLockRef = useRef(false);
  const audioCtxRef = useRef(null);
  const itemSearchInputRef = useRef(null);

  // Fetch all items from DB
  const loadAllItems = async () => {
    try {
      const res = await axios.get('/api/items?active=true');
      const items = res.data || [];
      setAllItems(items);
      return items;
    } catch (err) {
      console.error('Error fetching items for barcode modal:', err);
      return [];
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadAllItems();
      setSaveSuccessMsg('');
    }
  }, [isOpen]);

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
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
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

  // Start / Stop Camera Lifecycle
  useEffect(() => {
    if (!isOpen || !cameraActive) {
      stopCamera();
      return;
    }

    let isMounted = true;
    const scannerElementId = 'continuous-stock-camera-reader';

    const startCamera = async () => {
      try {
        setCameraError('');
        const devices = await Html5Qrcode.getCameras();
        if (!devices || devices.length === 0) {
          if (isMounted) setCameraError('No camera found. Connect a webcam or verify browser permissions.');
          return;
        }

        let chosenCameraId = devices[0].id;
        const backCam = devices.find(d => 
          d.label.toLowerCase().includes('back') || 
          d.label.toLowerCase().includes('rear') ||
          d.label.toLowerCase().includes('environment')
        );
        if (backCam) chosenCameraId = backCam.id;

        const html5QrCode = new Html5Qrcode(scannerElementId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.ITF
          ],
          verbose: false,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true
          }
        });
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          chosenCameraId,
          {
            fps: 22,
            qrbox: { width: 280, height: 140 },
            aspectRatio: 1.777778
          },
          (decodedText) => {
            if (scanLockRef.current) return;
            scanLockRef.current = true;
            playBeep();
            handleBarcodeScanned(decodedText);

            // Debounce lock for 1.4s
            setTimeout(() => {
              scanLockRef.current = false;
            }, 1400);
          },
          () => {}
        );
      } catch (err) {
        console.error('Camera barcode scanner error:', err);
        if (isMounted) {
          setCameraError(err?.message || 'Camera access unavailable in this browser context.');
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
  }, [isOpen, cameraActive]);

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch {}
      scannerRef.current = null;
    }
  };

  // When a barcode is scanned by camera or typed
  const handleBarcodeScanned = async (scannedCode) => {
    const code = (scannedCode || '').trim();
    if (!code) return;

    setBarcode(code);
    setSaveSuccessMsg('');

    // If an item is already selected by the user, link barcode and add stock to that item
    if (selectedItem) {
      if (autoAddOnScan) {
        await linkBarcodeAndAddStock(selectedItem, code, autoAddAmount);
      } else {
        setSaveSuccessMsg(`Barcode "${code}" ready! Review quantity below and tap "Confirm Add Stock".`);
      }
      return;
    }

    // If NO item is selected yet, check if this barcode already exists in DB
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
          setSaveSuccessMsg(`Product "${found.name}" found for barcode ${code}! Current stock: ${found.currentStock}.`);
        }
      }
    } catch {
      // Barcode does not belong to any existing product yet
      setSaveSuccessMsg(`Scanned: "${code}". Please select the Item above to link this barcode, or click "+ Create New Item".`);
    }
  };

  // Perform linking barcode and adding stock to the selected item
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
        note: `Scanned inward (+${qtyNum})`
      });

      const updated = res.data.item;
      playSuccessSound();

      // Update local states
      setSelectedItem(updated);
      setAllItems(prev => prev.map(i => i._id === updated._id ? updated : i));

      const logEntry = {
        name: updated.name,
        code: codeToLink || barcode,
        qty: qtyNum,
        unit: updated.unit,
        newStock: updated.currentStock,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };
      setRecentScans(prev => [logEntry, ...prev.slice(0, 9)]);
      setSaveSuccessMsg(`Success! Added +${qtyNum} ${updated.unit} to "${updated.name}" (Stock now: ${updated.currentStock})`);

      if (onItemSaved) onItemSaved();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update stock');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Quick Creation of New Item
  const handleCreateNewItem = async (e) => {
    e.preventDefault();
    const cleanName = newItemForm.name.trim();
    if (!cleanName || !newItemForm.sellingPrice) {
      alert('Item Name and Selling Price are required');
      return;
    }

    setSubmitting(true);
    try {
      const autoTranslations = { ...(newItemForm.translations || {}) };
      if (currentLang !== 'en' && cleanName) {
        autoTranslations[currentLang] = cleanName;
      }

      const payload = {
        name: cleanName,
        translations: autoTranslations,
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

      // Set as currently active selected item
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
      setSaveSuccessMsg(`Item "${dispName}" created! Ready to scan packet barcodes to add more stock.`);
      if (onItemSaved) onItemSaved();
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col my-auto animate-in zoom-in-95 duration-150 text-slate-900 max-h-[95vh]">
        
        {/* Top Header */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-brand-100 text-brand-800 rounded-xl">
              <Camera className="w-5 h-5 text-brand-700" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                Fast Barcode &amp; QR Stock Inward
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-100 text-brand-900 border border-brand-300">
                  <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
                  LIVE CAMERA
                </span>
              </h2>
              <p className="text-[11px] text-slate-500">
                1. Select / create product &rarr; 2. Point camera at barcode to link and add stock continuously
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-xl transition ${soundEnabled ? 'text-brand-700 bg-brand-50 hover:bg-brand-100' : 'text-slate-400 bg-slate-100'}`}
              title={soundEnabled ? 'Sound feedback ON' : 'Muted'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-xl bg-slate-100 hover:bg-slate-200 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-3 sm:p-5 space-y-4 overflow-y-auto flex-1">

          {/* STEP 1: ITEM SELECTION & CREATION SECTION */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 sm:p-4 space-y-2.5">
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
                <span>{isCreatingNew ? 'Choose Existing Item' : '+ Create New Item'}</span>
              </button>
            </div>

            {/* A: Quick Item Creation Form */}
            {isCreatingNew ? (
              <form onSubmit={handleCreateNewItem} className="bg-white p-3.5 rounded-xl border border-brand-300 space-y-3">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                  <span className="text-[11px] font-black text-brand-800 uppercase tracking-wider">
                    Quick Create New Item
                  </span>
                  <span className="text-[11px] text-slate-400">Save to start scanning barcodes for it</span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Product Name *
                  </label>
                  <TransliterateInput
                    value={newItemForm.name}
                    onChange={(val) => setNewItemForm({ ...newItemForm, name: val })}
                    placeholder="e.g. Tomato, Parle-G 250g, Aavin Milk 500ml..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm font-bold placeholder:text-slate-400 focus:outline-none focus:border-brand-500"
                    required
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-brand-700 uppercase tracking-wider mb-1">
                      Selling Price (₹) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={newItemForm.sellingPrice}
                      onChange={(e) => setNewItemForm({ ...newItemForm, sellingPrice: e.target.value })}
                      placeholder="0.00"
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-brand-400 rounded-xl text-slate-900 font-mono font-bold text-xs focus:outline-none focus:border-brand-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Cost Price (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={newItemForm.purchasePrice}
                      onChange={(e) => setNewItemForm({ ...newItemForm, purchasePrice: e.target.value })}
                      placeholder="0.00"
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono text-xs focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Unit
                    </label>
                    <select
                      value={newItemForm.unit}
                      onChange={(e) => setNewItemForm({ ...newItemForm, unit: e.target.value })}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs font-bold focus:outline-none focus:border-brand-500"
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
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Initial Qty
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={newItemForm.openingStock}
                      onChange={(e) => setNewItemForm({ ...newItemForm, openingStock: e.target.value })}
                      placeholder="0"
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono text-xs font-bold focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsCreatingNew(false)}
                    className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-200"
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
              /* B: Item Selection Dropdown / Search */
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    ref={itemSearchInputRef}
                    type="text"
                    value={searchItemQuery}
                    onChange={(e) => {
                      setSearchItemQuery(e.target.value);
                      setItemDropdownOpen(true);
                    }}
                    onFocus={() => setItemDropdownOpen(true)}
                    placeholder="Search item name, code or barcode to select..."
                    className="w-full pl-9 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 shadow-2xs"
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
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 max-h-56 overflow-y-auto divide-y divide-slate-100">
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
                            className={`p-2.5 sm:p-3 hover:bg-brand-50 cursor-pointer flex items-center justify-between transition ${selectedItemId === it._id ? 'bg-brand-50/80 font-bold' : ''}`}
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

                {/* Active Selected Item Header Chip */}
                {selectedItem && (
                  <div className="p-3 bg-white border border-brand-300 rounded-xl flex items-center justify-between animate-in fade-in duration-150">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-brand-100 text-brand-900 rounded-full border border-brand-300 uppercase">
                          Selected Item
                        </span>
                        <h4 className="text-sm font-black text-slate-900">
                          {getItemDisplayName(selectedItem)}
                          {currentLang !== 'en' && selectedItem.translations?.[currentLang] && (
                            <span className="text-xs font-normal text-slate-500 ml-1.5">({selectedItem.name})</span>
                          )}
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Sell Price: <span className="font-bold text-slate-800">₹{selectedItem.sellingPrice}</span> • Current Stock: <span className="font-mono font-bold text-brand-700">{selectedItem.currentStock} {selectedItem.unit}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {selectedItem.currentStock > 0 && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (!window.confirm(`Reset inventory for "${selectedItem.name}" to 0?`)) return;
                            try {
                              const res = await axios.delete(`/api/items/${selectedItem._id}/stock`);
                              setSelectedItem(res.data.item);
                              await loadAllItems();
                              if (onItemSaved) onItemSaved();
                              setSaveSuccessMsg(`Stock for "${selectedItem.name}" reset to 0.`);
                            } catch (err) {
                              alert('Failed to reset stock: ' + (err.response?.data?.message || err.message));
                            }
                          }}
                          className="text-xs text-red-600 hover:text-red-700 font-bold px-2 py-1 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 transition-colors"
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
                        className="text-xs text-slate-400 hover:text-slate-600 font-bold px-2 py-1 rounded-lg bg-slate-100"
                      >
                        Change
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* STEP 2: CONTINUOUS LIVE CAMERA SCANNER */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-brand-600" />
                Step 2: Continuous Camera Barcode &amp; QR Scanner
              </label>

              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
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

            {/* Continuous Viewfinder Screen */}
            <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-300 shadow-inner">
              {cameraActive ? (
                <div className="relative">
                  <div id="continuous-stock-camera-reader" className="w-full min-h-[170px] sm:min-h-[210px]"></div>

                  {/* Target Scanner Reticle */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-52 sm:w-64 h-24 sm:h-28 border-2 border-brand-400/90 rounded-2xl relative shadow-[0_0_15px_rgba(132,204,22,0.4)]">
                      <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-brand-400 rounded-tl-lg"></div>
                      <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-brand-400 rounded-tr-lg"></div>
                      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-brand-400 rounded-bl-lg"></div>
                      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-brand-400 rounded-br-lg"></div>
                      <div className="absolute left-2 right-2 top-1/2 -translate-y-1/2 h-0.5 bg-brand-400/80 shadow-[0_0_8px_#84cc16]"></div>
                    </div>
                  </div>

                  {/* Overlaid Banner */}
                  <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                    <span className="px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-xs text-[10px] font-bold text-white flex items-center gap-1 border border-white/10">
                      <Zap className="w-3 h-3 text-brand-400 fill-brand-400" />
                      Continuous Detection Ready
                    </span>
                  </div>
                </div>
              ) : (
                <div className="py-10 text-center text-slate-400 space-y-2">
                  <Camera className="w-7 h-7 mx-auto text-slate-500" />
                  <p className="text-xs font-bold">Camera is paused</p>
                  <button
                    type="button"
                    onClick={() => setCameraActive(true)}
                    className="px-3 py-1 bg-brand-500 text-slate-950 font-black rounded-lg text-xs"
                  >
                    Resume Camera
                  </button>
                </div>
              )}

              {cameraError && (
                <div className="p-3 bg-red-950/90 border border-red-500/50 text-red-200 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                  <div>
                    <p className="font-bold">Camera Notice:</p>
                    <p className="text-[11px] text-red-300">{cameraError}</p>
                    <p className="text-[10px] text-red-400 mt-1">
                      Tip: If running on mobile via local IP (e.g. 192.168.1.5), enable <code>chrome://flags/#unsafely-treat-insecure-origin-as-secure</code>. Or enter barcode manually below.
                    </p>
                  </div>
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
                  placeholder="Last scanned barcode or type manual barcode..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono text-xs sm:text-sm font-bold focus:outline-none focus:border-brand-500"
                />
              </div>

              <button
                type="button"
                onClick={() => handleBarcodeScanned(barcode)}
                disabled={!barcode.trim()}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition disabled:opacity-50"
              >
                Scan Code
              </button>
            </div>
          </div>

          {/* Success Banner */}
          {saveSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 text-xs sm:text-sm font-bold flex items-center gap-2.5 animate-in slide-in-from-top duration-200">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          {/* STEP 3: STOCK INWARD DETAILS CARD DIRECTLY BELOW CAMERA */}
          {selectedItem && (
            <div className="bg-slate-50 border border-brand-300 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                    Stocking Product
                  </span>
                  <span className="font-bold text-xs text-slate-900">{selectedItem.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Current Stock: </span>
                  <span className="text-base font-black text-brand-700 font-mono">
                    {selectedItem.currentStock} {selectedItem.unit}
                  </span>
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
                          className="px-1.5 py-0.5 text-[10px] bg-slate-200 hover:bg-brand-500 hover:text-slate-950 text-slate-700 font-bold rounded"
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
                    className="w-full px-3 py-2 bg-white border-2 border-brand-500 rounded-xl text-slate-900 font-mono font-black text-lg focus:outline-none focus:border-brand-600 shadow-2xs"
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
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono text-sm focus:outline-none focus:border-brand-500"
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
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono text-sm focus:outline-none focus:border-brand-500 font-bold"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => linkBarcodeAndAddStock(selectedItem, barcode, incomingQty)}
                disabled={submitting}
                className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 active:scale-98 text-slate-950 font-black rounded-xl text-xs sm:text-sm transition shadow-xs disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>
                  {submitting ? 'Updating...' : `Confirm Add +${incomingQty || 0} ${selectedItem.unit} to "${selectedItem.name}"`}
                </span>
              </button>
            </div>
          )}

          {/* RECENT SCANNED ACTIVITY LOG */}
          {recentScans.length > 0 && (
            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                <span className="flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-brand-600" />
                  Recent Inward Scans ({recentScans.length})
                </span>
                <button
                  type="button"
                  onClick={() => setRecentScans([])}
                  className="text-[10px] text-slate-400 hover:text-slate-600"
                >
                  Clear log
                </button>
              </div>

              <div className="max-h-32 overflow-y-auto divide-y divide-slate-200">
                {recentScans.map((scan, idx) => (
                  <div key={idx} className="py-1.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-900">{scan.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono ml-2">#{scan.code}</span>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <span className="font-mono font-black text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded text-[11px]">
                        +{scan.qty} {scan.unit}
                      </span>
                      <span className="text-[10px] text-slate-400">{scan.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Bottom Modal Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <p className="text-[11px] text-slate-500 font-medium">
            Camera stays active throughout. Point barcode to stock items continuously.
          </p>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition"
          >
            Done / Close
          </button>
        </div>

      </div>
    </div>
  );
}

