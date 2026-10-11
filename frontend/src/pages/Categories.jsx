import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Layers, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Globe, 
  Tag, 
  Check, 
  X, 
  AlertCircle,
  Package,
  Sparkles,
  RefreshCw,
  Scale
} from 'lucide-react';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeLang, setActiveLang] = useState('en'); // en, ta, hi, te, kn, ml

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  // Unit Management State
  const [units, setUnits] = useState([]);
  const [unitsModalOpen, setUnitsModalOpen] = useState(false);
  const [newUnitName, setNewUnitName] = useState('');
  const [newUnitDecimals, setNewUnitDecimals] = useState(false);
  const [savingUnit, setSavingUnit] = useState(false);
  const [unitToast, setUnitToast] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    translations: {
      ta: '',
      hi: '',
      te: '',
      kn: '',
      ml: ''
    },
    color: '#84cc16',
    displayOrder: 0
  });

  const languageTabs = [
    { code: 'en', label: 'English', native: 'English' },
    { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
    { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
    { code: 'te', label: 'Telugu', native: 'తెలుగు' },
    { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
    { code: 'ml', label: 'Malayalam', native: 'മലയാളം' }
  ];

  const colorPresets = [
    '#84cc16', '#10b981', '#06b6d4', '#3b82f6', 
    '#6366f1', '#a855f7', '#ec4899', '#f97316', '#eab308'
  ];

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const [catRes, unitsRes] = await Promise.all([
        axios.get(`/api/categories?search=${encodeURIComponent(search)}`),
        axios.get('/api/items/categories-units')
      ]);
      setCategories(catRes.data || []);
      setUnits(unitsRes.data?.units || []);
    } catch (err) {
      console.error('Error fetching categories & units:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [search]);

  const handleCreateUnit = async (e) => {
    e.preventDefault();
    const cleanName = newUnitName.trim().toLowerCase();
    if (!cleanName) return;

    setSavingUnit(true);
    try {
      const res = await axios.post('/api/items/units', {
        name: cleanName,
        allowDecimals: newUnitDecimals
      });
      setUnits(res.data?.units || [...units, { name: cleanName, allowDecimals: newUnitDecimals }]);
      setNewUnitName('');
      setNewUnitDecimals(false);
      setUnitToast(`Unit "${cleanName}" saved! Synced across Item Master and Stock Inward.`);
      setTimeout(() => setUnitToast(''), 3000);
    } catch (err) {
      alert(err.response?.data?.message || 'Error creating unit');
    } finally {
      setSavingUnit(false);
    }
  };

  const handleDeleteUnit = async (unitName) => {
    if (!window.confirm(`Delete unit "${unitName}"?`)) return;
    try {
      await axios.delete(`/api/items/units/${encodeURIComponent(unitName)}`);
      setUnits(prev => prev.filter(u => (typeof u === 'string' ? u : u.name).toLowerCase() !== unitName.toLowerCase()));
      setUnitToast(`Unit "${unitName}" removed.`);
      setTimeout(() => setUnitToast(''), 3000);
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting unit');
    }
  };

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      description: '',
      translations: { ta: '', hi: '', te: '', kn: '', ml: '' },
      color: '#84cc16',
      displayOrder: categories.length + 1
    });
    setErrorMsg('');
    setModalOpen(true);
  };

  const handleOpenEdit = (cat) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name,
      description: cat.description || '',
      translations: {
        ta: cat.translations?.ta || '',
        hi: cat.translations?.hi || '',
        te: cat.translations?.te || '',
        kn: cat.translations?.kn || '',
        ml: cat.translations?.ml || ''
      },
      color: cat.color || '#84cc16',
      displayOrder: cat.displayOrder || 0
    });
    setErrorMsg('');
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMsg('Category Name is required');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    try {
      if (editingCategory) {
        await axios.put(`/api/categories/${editingCategory._id}`, formData);
      } else {
        await axios.post('/api/categories', formData);
      }
      setModalOpen(false);
      fetchCategories();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Error saving category');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat) => {
    if (!window.confirm(`Are you sure you want to delete category "${cat.name}"?`)) return;

    try {
      await axios.delete(`/api/categories/${cat._id}`);
      fetchCategories();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete category');
    }
  };

  // Helper to render localized name based on active language tab
  const getCategoryDisplayName = (cat) => {
    if (activeLang === 'en') return cat.name;
    return cat.translations?.[activeLang] || cat.name;
  };

  return (
    <div className="p-3 sm:p-5 max-w-7xl mx-auto space-y-4 pb-20 md:pb-6">
      
      {/* Top Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-brand-600" />
            Categories Management
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Create categories with multi-language names (Tamil, Hindi, Telugu, Kannada, Malayalam)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchCategories}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setUnitsModalOpen(true)}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-black rounded-xl text-xs border border-indigo-200 transition shadow-xs active:scale-98"
          >
            <Scale className="w-4 h-4 text-indigo-600" />
            <span>Manage Units ({units.length})</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-slate-950 font-black rounded-xl text-xs transition shadow-xs active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>+ Create Category</span>
          </button>
        </div>
      </div>

      {/* Language Switch Strip & Search Bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Language Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1 shrink-0">
            <Globe className="w-3.5 h-3.5 text-brand-600" />
            View Lang:
          </span>
          {languageTabs.map((l) => (
            <button
              key={l.code}
              onClick={() => setActiveLang(l.code)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                activeLang === l.code
                  ? 'bg-brand-500 text-slate-950 shadow-2xs font-black'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{l.label}</span>
              <span className="text-[10px] opacity-75 ml-1">({l.native})</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search categories in any language..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-brand-500"
          />
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {loading ? (
          <div className="col-span-full py-16 text-center text-slate-400 font-bold">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-600" />
            Loading categories from database...
          </div>
        ) : categories.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-slate-200">
            <Layers className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <h3 className="font-bold text-slate-700 text-sm">No Categories Found</h3>
            <p className="text-xs text-slate-400 mt-1">Click "+ Create Category" to add your first category.</p>
          </div>
        ) : (
          categories.map((cat) => (
            <div
              key={cat._id}
              className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-brand-400 transition shadow-xs flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: cat.color || '#84cc16' }}
                  />
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {cat.itemCount || 0} items
                  </span>
                </div>

                <div className="mt-3">
                  <h3 className="text-base font-black text-slate-900 leading-tight">
                    {getCategoryDisplayName(cat)}
                  </h3>
                  {activeLang !== 'en' && cat.translations?.[activeLang] && (
                    <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                      English: {cat.name}
                    </p>
                  )}
                  {cat.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {cat.description}
                    </p>
                  )}
                </div>

                {/* Multi-language Translation Badges Preview */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap gap-1">
                  {cat.translations?.ta && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-brand-50 text-brand-900 border border-brand-200">
                      தமிழ்: {cat.translations.ta}
                    </span>
                  )}
                  {cat.translations?.hi && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-900 border border-blue-200">
                      हिन्दी: {cat.translations.hi}
                    </span>
                  )}
                  {cat.translations?.te && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-900 border border-emerald-200">
                      తెలుగు: {cat.translations.te}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-1.5">
                <button
                  onClick={() => handleOpenEdit(cat)}
                  className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                  title="Edit Category"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(cat)}
                  className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                  title="Delete Category"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* CREATE / EDIT CATEGORY MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col my-auto animate-in zoom-in-95 duration-150 text-slate-900">
            
            {/* Modal Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-brand-100 text-brand-800 rounded-xl">
                  <Layers className="w-5 h-5" />
                </div>
                <h3 className="text-base font-black text-slate-900">
                  {editingCategory ? 'Edit Category' : 'Create New Category'}
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSave} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Category Name (English / Primary) *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Grocery, Snacks, Dairy, Spices..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm font-bold focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Short note about items in this category"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-brand-500"
                />
              </div>

              {/* Multi-Language Section */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-black uppercase text-brand-800">
                  <Globe className="w-4 h-4 text-brand-600" />
                  Multi-Language Names (Optional)
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-0.5">
                      Tamil (தமிழ்)
                    </label>
                    <input
                      type="text"
                      placeholder="எ.கா. மளிகை, தின்பண்டங்கள்"
                      value={formData.translations.ta}
                      onChange={(e) => setFormData({
                        ...formData,
                        translations: { ...formData.translations, ta: e.target.value }
                      })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-0.5">
                      Hindi (हिन्दी)
                    </label>
                    <input
                      type="text"
                      placeholder="उदा. किराना, स्नैक्स"
                      value={formData.translations.hi}
                      onChange={(e) => setFormData({
                        ...formData,
                        translations: { ...formData.translations, hi: e.target.value }
                      })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-0.5">
                      Telugu (తెలుగు)
                    </label>
                    <input
                      type="text"
                      placeholder="ఉదా. కిరాణా, స్నాక్స్"
                      value={formData.translations.te}
                      onChange={(e) => setFormData({
                        ...formData,
                        translations: { ...formData.translations, te: e.target.value }
                      })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-0.5">
                      Kannada (ಕನ್ನಡ)
                    </label>
                    <input
                      type="text"
                      placeholder="ಉದಾ. ದಿನಸಿ, ತಿಂಡಿಗಳು"
                      value={formData.translations.kn}
                      onChange={(e) => setFormData({
                        ...formData,
                        translations: { ...formData.translations, kn: e.target.value }
                      })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 mb-0.5">
                      Malayalam (മലയാളം)
                    </label>
                    <input
                      type="text"
                      placeholder="ഉദാ. പലചരക്ക്, പലഹാരങ്ങൾ"
                      value={formData.translations.ml}
                      onChange={(e) => setFormData({
                        ...formData,
                        translations: { ...formData.translations, ml: e.target.value }
                      })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>
              </div>

              {/* Color Preset */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Category Color Badge
                </label>
                <div className="flex items-center gap-2">
                  {colorPresets.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: c })}
                      className={`w-6 h-6 rounded-full transition-all ${
                        formData.color === c ? 'scale-125 ring-2 ring-slate-900' : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-brand-500 hover:bg-brand-600 text-slate-950 font-black rounded-xl text-xs transition shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Save Category'}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* UNIT MANAGEMENT MODAL */}
      {unitsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col my-auto animate-in zoom-in-95 duration-150 text-slate-900">
            {/* Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Units of Measurement
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Manage dynamic units synced to Item Master & Stock Inward
                  </p>
                </div>
              </div>
              <button
                onClick={() => setUnitsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Notification Banner */}
              {unitToast && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{unitToast}</span>
                </div>
              )}

              {/* Add Unit Form */}
              <form onSubmit={handleCreateUnit} className="space-y-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Add New Custom Unit
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="e.g. meter, tin, bundle, box, kg..."
                    value={newUnitName}
                    onChange={(e) => setNewUnitName(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-brand-500"
                  />
                  <button
                    type="submit"
                    disabled={savingUnit || !newUnitName.trim()}
                    className="px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-slate-950 font-black rounded-xl text-xs transition flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{savingUnit ? 'Adding...' : 'Add'}</span>
                  </button>
                </div>
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-600 font-medium pt-1">
                  <input
                    type="checkbox"
                    checked={newUnitDecimals}
                    onChange={(e) => setNewUnitDecimals(e.target.checked)}
                    className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500"
                  />
                  <span>Allow decimal quantities (e.g. 1.5 kg, 2.75 meter)</span>
                </label>
              </form>

              {/* Existing Units List */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Existing Active Units ({units.length})
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">
                    Not hardcoded (Dynamic)
                  </span>
                </div>

                <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100">
                  {units.map((u, idx) => {
                    const uName = typeof u === 'string' ? u : u.name;
                    const allowDec = typeof u === 'object' ? u.allowDecimals : false;
                    return (
                      <div
                        key={uName || idx}
                        className="pt-1.5 first:pt-0 flex items-center justify-between py-1.5 px-2 hover:bg-slate-50 rounded-lg group"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-900 px-2 py-0.5 bg-slate-100 rounded-md">
                            {uName}
                          </span>
                          {allowDec && (
                            <span className="text-[10px] bg-sky-50 text-sky-700 border border-sky-200 px-1.5 py-0.2 rounded font-semibold">
                              decimals ok
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteUnit(uName)}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title={`Delete unit ${uName}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                  {units.length === 0 && (
                    <div className="py-6 text-center text-xs text-slate-400 font-medium">
                      No units configured yet.
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setUnitsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
