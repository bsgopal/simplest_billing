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
  Globe
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import TransliterateInput from '../components/TransliterateInput';
import BarcodeStockModal from '../components/BarcodeStockModal';

export default function Items() {
  const { currentLang } = useLanguage();
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
      alert('Product Name is required');
      return;
    }
    if (!formData.category?.trim() || formData.category === 'All') {
      alert('Category is required! A product cannot be created without a category.');
      return;
    }
    if (!formData.unit?.trim()) {
      alert('Unit is required');
      return;
    }
    if (formData.sellingPrice === undefined || formData.sellingPrice === '') {
      alert('Selling Price is required');
      return;
    }

    try {
      if (editingItem) {
        await axios.put(`/api/items/${editingItem._id}`, formData);
      } else {
        await axios.post('/api/items', formData);
      }
      setModalOpen(false);
      fetchItems();
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving product');
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
    } catch (err) {
      alert(err.response?.data?.message || 'Error adjusting stock');
    }
  };

  return (
    <div className="p-3 sm:p-5 max-w-7xl mx-auto space-y-4 pb-20 md:pb-6">
      {/* Top Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="w-5 h-5 text-brand-600" />
            Products &amp; Stock Master
          </h2>
          <p className="text-xs text-slate-500 font-medium">Manage product catalogue, selling prices, categories, and stock</p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/stock"
            className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-brand-50 hover:bg-brand-100 text-brand-900 border border-brand-300 font-extrabold rounded-xl text-xs transition shadow-2xs active:scale-98"
          >
            <Barcode className="w-4 h-4 text-brand-600" />
            <span>Stock Inward</span>
          </Link>

          <Link
            to="/categories"
            className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold rounded-xl text-xs transition active:scale-98"
          >
            <Layers className="w-4 h-4 text-slate-600" />
            <span>Categories</span>
          </Link>
          
          <button
            onClick={handleOpenAdd}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-slate-950 font-black rounded-xl text-xs transition shadow-xs active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add New Product</span>
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
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 shrink-0 self-end md:self-auto">
          <span>Total Products:</span>
          <span className="font-black text-slate-900 bg-white px-2 py-0.5 rounded-lg border border-slate-200 shadow-2xs">
            {items.length}
          </span>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
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
                        {currentLang !== 'en' && it.translations?.[currentLang] && (
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
                    <td className="px-4 py-3 text-right font-black text-brand-700 text-sm">₹{it.sellingPrice.toFixed(2)}</td>
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
                        <button
                          onClick={() => handleOpenEdit(it)}
                          className="p-1 text-slate-400 hover:text-slate-800 rounded-lg transition"
                          title="Edit item"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
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
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 block">Product Name (English / Primary) *</label>
                  <button
                    type="button"
                    onClick={() => setShowTranslations(!showTranslations)}
                    className="text-[10px] font-bold text-brand-800 hover:text-brand-900 bg-brand-50 hover:bg-brand-100 px-2 py-0.5 rounded-md border border-brand-200 flex items-center gap-1 transition"
                  >
                    <Globe className="w-3 h-3 text-brand-600" />
                    <span>{showTranslations ? 'Hide Regional Names' : '+ Multi-Language Names'}</span>
                  </button>
                </div>
                <TransliterateInput
                  required
                  placeholder="e.g. Tomato, Sugar 1kg, Milk..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:border-brand-500"
                />
              </div>

              {/* Multi-Language Regional Names Section */}
              {showTranslations && (
                <div className="p-3 bg-brand-50/50 rounded-2xl border border-brand-200 space-y-2.5 animate-in fade-in duration-150">
                  <div className="flex items-center gap-1.5 text-xs font-black text-brand-900">
                    <Globe className="w-3.5 h-3.5 text-brand-600" />
                    <span>Regional Script Item Names</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                        Tamil (தமிழ்)
                      </label>
                      <input
                        type="text"
                        value={formData.translations.ta}
                        onChange={(e) => setFormData({
                          ...formData,
                          translations: { ...formData.translations, ta: e.target.value }
                        })}
                        placeholder="எ.கா. தக்காளி, பால்..."
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs font-semibold focus:outline-hidden focus:border-brand-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                        Hindi (हिन्दी)
                      </label>
                      <input
                        type="text"
                        value={formData.translations.hi}
                        onChange={(e) => setFormData({
                          ...formData,
                          translations: { ...formData.translations, hi: e.target.value }
                        })}
                        placeholder="उदा. टमाटर, दूध..."
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs font-semibold focus:outline-hidden focus:border-brand-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                        Telugu (తెలుగు)
                      </label>
                      <input
                        type="text"
                        value={formData.translations.te}
                        onChange={(e) => setFormData({
                          ...formData,
                          translations: { ...formData.translations, te: e.target.value }
                        })}
                        placeholder="ఉదా. టమోటా, పాలు..."
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs font-semibold focus:outline-hidden focus:border-brand-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                        Kannada (ಕನ್ನಡ)
                      </label>
                      <input
                        type="text"
                        value={formData.translations.kn}
                        onChange={(e) => setFormData({
                          ...formData,
                          translations: { ...formData.translations, kn: e.target.value }
                        })}
                        placeholder="ಉದಾ. ಟೊಮೆಟೊ, ಹಾಲು..."
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs font-semibold focus:outline-hidden focus:border-brand-500"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                        Malayalam (മലയാളം)
                      </label>
                      <input
                        type="text"
                        value={formData.translations.ml}
                        onChange={(e) => setFormData({
                          ...formData,
                          translations: { ...formData.translations, ml: e.target.value }
                        })}
                        placeholder="ഉദാ. തക്കാളി, പാൽ..."
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs font-semibold focus:outline-hidden focus:border-brand-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Category *</label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => {
                      if (e.target.value === '__add_category__') {
                        const newCat = prompt('Enter new category name:');
                        if (newCat && newCat.trim()) {
                          const cleanCat = newCat.trim();
                          axios.post('/api/categories', { name: cleanCat })
                            .then(() => {
                              setCategories(prev => Array.from(new Set([...prev, cleanCat])));
                              setFormData({ ...formData, category: cleanCat });
                            })
                            .catch((err) => {
                              alert(err.response?.data?.message || 'Error creating category');
                            });
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
                  step="0.05"
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
    </div>
  );
}
