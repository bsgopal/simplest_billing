import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { 
  Package, 
  Plus, 
  Search, 
  Edit3, 
  SlidersHorizontal, 
  AlertTriangle, 
  CheckCircle, 
  X,
  Star,
  Barcode,
  Layers,
  Globe,
  Trash2,
  Printer
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import TransliterateInput from '../components/TransliterateInput';
import BarcodeStockModal from '../components/BarcodeStockModal';
import BarcodeCheatSheetModal from '../components/BarcodeCheatSheetModal';

export default function Items() {
  const { currentLang, transliterateWord } = useLanguage();
  const { toast, confirm, prompt } = useToast();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('All');

  // Edit/Add modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showTranslations, setShowTranslations] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    translations: {
      ta: '',
      hi: '',
      te: '',
      kn: '',
      ml: ''
    },
    code: '',
    barcode: '',
    category: 'General',
    unit: 'pcs',
    purchasePrice: 0,
    mrp: 0,
    sellingPrice: '',
    allowRateChange: false,
    hsn: '',
    gstPercent: 0,
    openingStock: 0,
    lowStockLevel: 5,
    isQuickItem: false
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

  // Stock Adjustment modal
  const [adjustItem, setAdjustItem] = useState(null);
  const [adjustType, setAdjustType] = useState('Reduce');
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('Damaged / Spoiled');
  const [adjustNote, setAdjustNote] = useState('');

  // Barcode Fast Stock Entry modal
  const [barcodeStockModalOpen, setBarcodeStockModalOpen] = useState(false);
  const [cheatSheetModalOpen, setCheatSheetModalOpen] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const [itemsRes, metaRes] = await Promise.all([
        axios.get(`/api/items?search=${search}&category=${selectedCat}`),
        axios.get('/api/items/categories-units')
      ]);
      setItems(itemsRes.data || []);
      setCategories(metaRes.data?.categories || []);
      setUnits(metaRes.data?.units || []);
    } catch (err) {
      console.error('Error fetching items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [selectedCat]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setShowTranslations(false);
    setFormData({
      name: '',
      translations: {
        ta: '',
        hi: '',
        te: '',
        kn: '',
        ml: ''
      },
      code: '',
      barcode: '',
      category: '',
      unit: units.length > 0 ? (typeof units[0] === 'string' ? units[0] : units[0].name) : 'pcs',
      purchasePrice: 0,
      mrp: 0,
      sellingPrice: '',
      allowRateChange: false,
      hsn: '',
      gstPercent: 0,
      openingStock: 0,
      lowStockLevel: 5,
      isQuickItem: false
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (it) => {
    setEditingItem(it);
    const hasAnyTranslation = it.translations && Object.values(it.translations).some(Boolean);
    setShowTranslations(Boolean(hasAnyTranslation));
    setFormData({
      name: it.name,
      translations: {
        ta: it.translations?.ta || '',
        hi: it.translations?.hi || '',
        te: it.translations?.te || '',
        kn: it.translations?.kn || '',
        ml: it.translations?.ml || ''
      },
      code: it.code || '',
      barcode: it.barcode || '',
      category: it.category || '',
      unit: it.unit || 'pcs',
      purchasePrice: it.purchasePrice || 0,
      mrp: it.mrp || 0,
      sellingPrice: it.sellingPrice || '',
      allowRateChange: Boolean(it.allowRateChange),
      hsn: it.hsn || '',
      gstPercent: it.gstPercent || 0,
      openingStock: it.currentStock || 0,
      lowStockLevel: it.lowStockLevel || 5,
      isQuickItem: Boolean(it.isQuickItem)
    });
    setModalOpen(true);
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      toast.warning('Product Name is required');
      return;
    }
    if (!formData.category?.trim() || formData.category === 'All') {
      toast.warning('Category is required! A product cannot be created without a category.');
      return;
    }
    if (!formData.unit?.trim()) {
      toast.warning('Unit is required');
      return;
    }
    if (formData.sellingPrice === undefined || formData.sellingPrice === '') {
      toast.warning('Selling Price is required');
      return;
    }

    try {
      let cleanName = formData.name.trim();
      if (currentLang !== 'en' && /[a-zA-Z]/.test(cleanName)) {
        const converted = await transliterateWord(cleanName, currentLang);
        if (converted) cleanName = converted;
      }

      const payload = {
        ...formData,
        name: cleanName,
        language: currentLang,
        translations: {
          ...(formData.translations || {}),
          ...(currentLang !== 'en' ? { [currentLang]: cleanName } : {})
        }
      };
      if (editingItem) {
        await axios.put(`/api/items/${editingItem._id}`, payload);
        toast.success(`Product "${payload.name}" updated successfully`);
      } else {
        await axios.post('/api/items', payload);
        toast.success(`Product "${payload.name}" created successfully`);
      }
      setModalOpen(false);
      fetchItems();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving product');
    }
  };

  const handleDeleteItem = async (it) => {
    const ok = await confirm({
      title: 'Delete Product',
      message: `Are you sure you want to delete "${it.name}"?`,
      description: 'This will permanently delete it from inventory and catalog.',
      confirmText: 'Delete Product',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (!ok) return;

    try {
      await axios.delete(`/api/items/${it._id}`);
      fetchItems();
      toast.success(`"${it.name}" deleted successfully`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete product');
    }
  };

  const handleResetStock = async (it) => {
    const ok = await confirm({
      title: 'Reset Stock to 0',
      message: `Reset stock for "${it.name}" to 0?`,
      description: 'All linked individual barcodes will also be cleared.',
      confirmText: 'Zero Stock',
      cancelText: 'Cancel',
      type: 'warning'
    });
    if (!ok) return;

    try {
      await axios.delete(`/api/items/${it._id}/stock`);
      fetchItems();
      toast.success(`Stock for "${it.name}" reset to 0`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset stock');
    }
  };

  const handleStockAdjust = async (e) => {
    e.preventDefault();
    if (!adjustQty || parseFloat(adjustQty) <= 0) return;

    try {
      await axios.post('/api/items/stock-adjust', {
        itemId: adjustItem._id,
        type: adjustType,
        quantity: parseFloat(adjustQty),
        reason: adjustReason,
        note: adjustNote
      });
      setAdjustItem(null);
      setAdjustQty('');
      setAdjustNote('');
      fetchItems();
      toast.success('Stock adjusted successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error adjusting stock');
    }
  };

  return (
    <div className="space-y-3">
      {/* Top Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="w-5 h-5 text-brand-600" />
            Products &amp; Stock Master
          </h2>
          <p className="text-xs text-slate-500 font-medium">Manage product catalogue, selling prices, categories, and stock</p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:flex-wrap gap-2 w-full sm:w-auto">
          <div className="grid grid-cols-3 gap-1.5 w-full sm:w-auto">
            <Link
              to="/stock"
              className="flex items-center justify-center gap-1 px-2.5 py-2 bg-brand-50 hover:bg-brand-100 text-brand-900 border border-brand-300 font-extrabold rounded-xl text-xs transition shadow-2xs active:scale-98 text-center"
            >
              <Barcode className="w-3.5 h-3.5 text-brand-600 shrink-0" />
              <span className="truncate">Stock Inward</span>
            </Link>

            <button
              type="button"
              onClick={() => setCheatSheetModalOpen(true)}
              className="flex items-center justify-center gap-1 px-2.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 font-extrabold rounded-xl text-xs transition shadow-2xs active:scale-98 text-center"
              title="Generate & print laminated barcode cheat sheet for loose items"
            >
              <Printer className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span className="truncate">Cheat Sheet</span>
            </button>

            <Link
              to="/categories"
              className="flex items-center justify-center gap-1 px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold rounded-xl text-xs transition active:scale-98 text-center"
            >
              <Layers className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              <span className="truncate">Categories</span>
            </Link>
          </div>
          
          <button
            onClick={handleOpenAdd}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-slate-950 font-black rounded-xl text-xs transition shadow-xs active:scale-98"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* Filters Bar & Language Selector */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
        <div className="flex-1 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search products by English or Regional name, barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchItems()}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:border-brand-500"
            />
          </div>

          <select
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:border-brand-500"
          >
            <option value="All">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Total count badge */}
        <div className="flex items-center justify-between sm:justify-start gap-2 px-3 py-1.5 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 shrink-0">
          <span>Total Products:</span>
          <span className="font-black text-slate-900 bg-white px-2 py-0.5 rounded-lg border border-slate-200 shadow-2xs">
            {items.length}
          </span>
        </div>
      </div>

      {/* Mobile Products Cards List (md:hidden) - Zero cutoffs, touch-friendly */}
      <div className="md:hidden space-y-2.5">
        {loading ? (
          <div className="p-8 text-center text-slate-400 font-bold bg-white rounded-2xl border border-slate-200">
            Loading products list...
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
            <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="font-bold">No products found</p>
          </div>
        ) : (
          items.map((it) => (
            <div key={it._id} className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
              {/* Row 1: Name, Code & Selling Price */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-black text-slate-900 text-sm flex items-center gap-1.5 flex-wrap">
                    <span>{getItemDisplayName(it)}</span>
                    {currentLang !== 'en' && it.translations?.[currentLang] && it.name?.trim().toLowerCase() !== getItemDisplayName(it)?.trim().toLowerCase() && (
                      <span className="text-xs font-normal text-slate-400">({it.name})</span>
                    )}
                    {it.isQuickItem && (
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0" />
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {it.code ? `Code: #${it.code} ` : ''}
                    {it.barcodes?.length > 1
                      ? `• ${it.barcodes.length} Barcodes linked`
                      : it.barcode
                      ? `• Barcode: ${it.barcode}`
                      : '• No barcode linked yet'}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-base font-black text-brand-700">
                    ₹{it.sellingPrice.toFixed(2)}
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">
                    per {it.unit}
                  </div>
                </div>
              </div>

              {/* Row 2: Badges (Category, Stock, Cost) */}
              <div className="flex items-center gap-1.5 flex-wrap text-xs pt-1 border-t border-slate-100">
                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold rounded-lg border border-slate-200 text-[11px]">
                  {it.category}
                </span>
                <span className={`px-2 py-0.5 rounded-lg font-black text-[11px] ${
                  it.currentStock <= it.lowStockLevel
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                }`}>
                  Stock: {it.currentStock} {it.unit}
                </span>
                {it.gstPercent > 0 && (
                  <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 font-black rounded-lg border border-blue-200 text-[10px]">
                    {it.gstPercent}% GST
                  </span>
                )}
                <span className="text-[11px] text-slate-500 font-semibold ml-auto">
                  Cost: ₹{it.purchasePrice.toFixed(2)}
                </span>
              </div>

              {/* Row 3: Action Buttons */}
              <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
                <button
                  onClick={() => setAdjustItem(it)}
                  className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition text-center"
                >
                  Adjust Stock
                </button>
                {it.currentStock > 0 && (
                  <button
                    onClick={() => handleResetStock(it)}
                    className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold rounded-xl text-xs border border-amber-200 transition"
                    title="Reset stock to 0 and remove barcodes"
                  >
                    Zero Stock
                  </button>
                )}
                <button
                  onClick={() => handleOpenEdit(it)}
                  className="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition"
                  title="Edit product"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteItem(it)}
                  className="p-1.5 text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition"
                  title="Delete product permanently"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Products Table (hidden md:block) */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[700px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3">Product Details</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3 text-right">Cost Price</th>
                <th className="px-4 py-3 text-right">Selling Price</th>
                <th className="px-4 py-3 text-center">In Stock</th>
                <th className="px-4 py-3 text-center">Quick</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-10 text-slate-400 font-bold">
                    Loading products list...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-12 text-slate-400">
                    <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold">No products found</p>
                  </td>
                </tr>
              ) : (
                items.map((it) => (
                  <tr key={it._id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{getItemDisplayName(it)}</span>
                        {currentLang !== 'en' && it.translations?.[currentLang] && it.name?.trim().toLowerCase() !== getItemDisplayName(it)?.trim().toLowerCase() && (
                          <span className="text-[11px] font-normal text-slate-400">({it.name})</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {it.code ? `Code: #${it.code} ` : ''}
                        {it.barcodes?.length > 1
                          ? `• ${it.barcodes.length} Barcodes linked`
                          : it.barcode
                          ? `• Barcode: ${it.barcode}`
                          : '• No barcode linked yet'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-semibold">{it.category}</td>
                    <td className="px-4 py-3 text-slate-600 uppercase font-bold text-[10px]">{it.unit}</td>
                    <td className="px-4 py-3 text-right text-slate-500 font-bold">₹{it.purchasePrice.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-black text-brand-700 text-sm">
                      <div>₹{it.sellingPrice.toFixed(2)}</div>
                      {it.gstPercent > 0 && (
                        <div className="mt-0.5">
                          <span className="inline-block text-[9px] font-black px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded">
                            {it.gstPercent}% GST{it.hsn ? ` • ${it.hsn}` : ''}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full font-black text-[10px] ${
                        it.currentStock <= it.lowStockLevel
                          ? 'bg-red-100 text-red-700'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {it.currentStock} {it.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {it.isQuickItem && <Star className="w-4 h-4 text-amber-500 fill-amber-400 mx-auto" />}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setAdjustItem(it)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[10px] transition"
                          title="Adjust stock quantity"
                        >
                          Adjust
                        </button>
                        {it.currentStock > 0 && (
                          <button
                            onClick={() => handleResetStock(it)}
                            className="px-1.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold rounded-lg text-[10px] border border-amber-200 transition"
                            title="Reset stock to 0 and remove barcodes"
                          >
                            Zero Stock
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenEdit(it)}
                          className="p-1 text-slate-400 hover:text-slate-800 rounded-lg transition"
                          title="Edit product"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(it)}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Delete product permanently"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Item Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <form onSubmit={handleSaveItem} className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-slate-200 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <h3 className="font-extrabold text-slate-900 text-base">
                {editingItem ? 'Edit Product Master' : 'Add New Product'}
              </h3>
              <button type="button" onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Product Name *</label>
                <TransliterateInput
                  required
                  placeholder="Enter product name (பொருள் பெயர்)..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Product Code (Short Code)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 101, DAL, AY01 (Auto if blank)"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:border-brand-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Leave blank to auto-generate
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Primary Barcode</label>
                  <input
                    type="text"
                    placeholder="Optional (e.g. 890123...)"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:border-brand-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Can also link in Stock Inward
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Category *</label>
                  <select
                    required
                    value={formData.category}
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
                            setCategories((prev) => Array.from(new Set([...prev, cleanCat])));
                            setFormData({ ...formData, category: cleanCat });
                            toast.success(`Category "${cleanCat}" created`);
                          } catch (err) {
                            toast.error(err.response?.data?.message || 'Error creating category');
                          }
                        }
                      } else {
                        setFormData({ ...formData, category: e.target.value });
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:border-brand-500"
                  >
                    <option value="">-- Select Category * --</option>
                    {categories.filter(c => c && c !== 'All').map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                    <option value="__add_category__">+ Create New Category...</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Unit *</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => {
                      if (e.target.value === '__add_new__') {
                        const newU = prompt('Enter new custom unit name (e.g. meter, tin, bundle, sack):');
                        if (newU && newU.trim()) {
                          const cleanU = newU.trim().toLowerCase();
                          axios.post('/api/items/units', { name: cleanU })
                            .then(res => {
                              setUnits(res.data?.units || [...units, { name: cleanU }]);
                              setFormData({ ...formData, unit: cleanU });
                            })
                            .catch(() => {
                              setUnits(prev => [...prev, { name: cleanU }]);
                              setFormData({ ...formData, unit: cleanU });
                            });
                        }
                      } else {
                        setFormData({ ...formData, unit: e.target.value });
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden"
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

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="40.00"
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black text-brand-700 focus:outline-hidden focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Purchase Cost (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="30.00"
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* GST Tax Rate & HSN Code */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">GST Tax Rate (%)</label>
                  <select
                    value={formData.gstPercent}
                    onChange={(e) => setFormData({ ...formData, gstPercent: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:border-brand-500"
                  >
                    <option value={0}>0% (Tax Exempt / Nil)</option>
                    <option value={5}>5% (Essential Goods)</option>
                    <option value={12}>12% (Processed / Dairy)</option>
                    <option value={18}>18% (Standard FMCG)</option>
                    <option value={28}>28% (Luxury / Aerated)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">HSN / SAC Code</label>
                  <input
                    type="text"
                    placeholder="e.g. 1006, 0902"
                    value={formData.hsn || ''}
                    onChange={(e) => setFormData({ ...formData, hsn: e.target.value.trim() })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Alert Below (Low Stock Qty)</label>
                <input
                  type="number"
                  step="any"
                  value={formData.lowStockLevel}
                  onChange={(e) => setFormData({ ...formData, lowStockLevel: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden"
                />
              </div>

              {/* Informational Barcode Banner */}
              <div className="p-3 bg-brand-50/60 rounded-2xl border border-brand-200/80 text-slate-700 text-[11px] flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Barcode className="w-4 h-4 text-brand-600 shrink-0" />
                  <span>
                    Barcodes are scanned &amp; linked in <strong>Stock Inward</strong> (1 stock added per unique barcode).
                  </span>
                </div>
                {editingItem?.barcodes?.length > 0 && (
                  <span className="text-[10px] font-black bg-brand-200 text-brand-950 px-2 py-0.5 rounded-full shrink-0">
                    {editingItem.barcodes.length} linked
                  </span>
                )}
              </div>

              {/* Quick Item Checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="quickItem"
                  checked={formData.isQuickItem}
                  onChange={(e) => setFormData({ ...formData, isQuickItem: e.target.checked })}
                  className="rounded text-brand-600 focus:ring-brand-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="quickItem" className="text-xs font-extrabold text-slate-800 cursor-pointer">
                  Show in Quick Items (One-tap POS bar)
                </label>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="py-2.5 bg-brand-500 hover:bg-brand-600 text-slate-950 font-black rounded-xl text-xs"
              >
                Save Product
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {adjustItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleStockAdjust} className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <h3 className="font-extrabold text-slate-900 text-sm mb-1">Adjust Stock: {adjustItem.name}</h3>
            <p className="text-xs text-slate-500 mb-3">Current Stock: <strong className="text-slate-800">{adjustItem.currentStock} {adjustItem.unit}</strong></p>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustType('Add')}
                  className={`py-2 rounded-xl text-xs font-extrabold transition ${
                    adjustType === 'Add' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  + Add Stock
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustType('Reduce')}
                  className={`py-2 rounded-xl text-xs font-extrabold transition ${
                    adjustType === 'Reduce' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  − Reduce Stock
                </button>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Quantity ({adjustItem.unit}) *</label>
                <input
                  type="number"
                  step="any"
                  min="0.001"
                  required
                  placeholder="Quantity"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Reason *</label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden"
                >
                  <option value="Damaged / Spoiled">Damaged / Spoiled</option>
                  <option value="Expired">Expired</option>
                  <option value="Counting correction">Counting correction</option>
                  <option value="Own use">Own use</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAdjustItem(null)}
                className="py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="py-2.5 bg-brand-500 text-slate-950 font-black rounded-xl text-xs"
              >
                Save Adjustment
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Barcode Fast Stock Management Modal */}
      <BarcodeStockModal
        isOpen={barcodeStockModalOpen}
        onClose={() => setBarcodeStockModalOpen(false)}
        onItemSaved={fetchItems}
        categories={categories}
      />

      {/* Barcode Cheat Sheet Generator Modal */}
      <BarcodeCheatSheetModal
        isOpen={cheatSheetModalOpen}
        onClose={() => setCheatSheetModalOpen(false)}
        items={items}
        categories={categories}
      />
    </div>
  );
}
