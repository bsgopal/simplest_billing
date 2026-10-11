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

import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import TransliterateInput from '../components/TransliterateInput';

export default function Categories() {
  const { currentLang, transliterateWord } = useLanguage();
  const { toast, confirm } = useToast();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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
      toast.error(err.response?.data?.message || 'Error creating unit');
    } finally {
      setSavingUnit(false);
    }
  };

  const handleDeleteUnit = async (unitName) => {
    const ok = await confirm({
      title: 'Delete Unit',
      message: `Are you sure you want to delete unit "${unitName}"?`,
      confirmText: 'Delete Unit',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (!ok) return;

    try {
      await axios.delete(`/api/items/units/${encodeURIComponent(unitName)}`);
      setUnits(prev => prev.filter(u => (typeof u === 'string' ? u : u.name).toLowerCase() !== unitName.toLowerCase()));
      toast.success(`Unit "${unitName}" removed.`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error deleting unit');
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
    let cleanName = formData.name.trim();
    if (!cleanName) {
      setErrorMsg('Category Name is required');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    try {
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
      if (editingCategory) {
        await axios.put(`/api/categories/${editingCategory._id}`, payload);
        toast.success(`Category "${cleanName}" updated successfully`);
      } else {
        await axios.post('/api/categories', payload);
        toast.success(`Category "${cleanName}" created successfully`);
      }
      setModalOpen(false);
      fetchCategories();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Error saving category');
      toast.error(err.response?.data?.message || 'Error saving category');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat) => {
    const ok = await confirm({
      title: 'Delete Category',
      message: `Are you sure you want to delete category "${cat.name}"?`,
      description: 'Any existing products in this category will be safely reassigned to "General".',
      confirmText: 'Delete Category',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (!ok) return;

    try {
      await axios.delete(`/api/categories/${cat._id}`);
      fetchCategories();
      toast.success(`Category "${cat.name}" deleted successfully`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete category');
    }
  };

  // Helper to render localized name based on active language set in Settings
  const getCategoryDisplayName = (cat) => {
    if (currentLang === 'en') return cat.name;
    return cat.translations?.[currentLang] || cat.name;
  };

  return (
    <div className="space-y-3">
      {/* Top Header & Compact Toolbar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-brand-50 text-brand-700 rounded-lg shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900 leading-tight">
              Categories Management
            </h2>
            <p className="text-[11px] text-slate-500 font-medium">
              Dynamic category catalog with auto-transliterated regional script
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search categories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:border-brand-500"
            />
          </div>

          <button
            onClick={fetchCategories}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setUnitsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-black rounded-lg text-xs border border-indigo-200 transition"
          >
            <Scale className="w-3.5 h-3.5 text-indigo-600" />
            <span>Units ({units.length})</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-500 hover:bg-brand-600 text-slate-950 font-black rounded-lg text-xs transition shadow-xs active:scale-98"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Category</span>
          </button>
        </div>
      </div>

      {/* Categories Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-3.5 py-2.5 w-12 text-center">#</th>
                <th className="px-3.5 py-2.5">Category Name</th>
                <th className="px-3.5 py-2.5">Description</th>
                <th className="px-3.5 py-2.5">Regional Translations</th>
                <th className="px-3.5 py-2.5 text-center">Linked Items</th>
                <th className="px-3.5 py-2.5 text-center">Display Order</th>
                <th className="px-3.5 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-10 text-slate-400 font-bold">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-brand-600" />
                    Loading categories...
                  </td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-slate-400">
                    <Layers className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-slate-700">No categories found</p>
                    <p className="text-xs text-slate-400 mt-0.5">Click "+ Add Category" to create your first category.</p>
                  </td>
                </tr>
              ) : (
                categories.map((cat, idx) => (
                  <tr key={cat._id} className="hover:bg-slate-50/80 transition group">
                    <td className="px-3.5 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <span 
                          className="w-2.5 h-2.5 rounded-full shrink-0" 
                          style={{ backgroundColor: cat.color || '#84cc16' }}
                        />
                        <span className="text-[11px] font-bold text-slate-400">{idx + 1}</span>
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <div className="font-black text-slate-900 text-sm flex items-center gap-2">
                        <span>{getCategoryDisplayName(cat)}</span>
                        {currentLang !== 'en' && cat.translations?.[currentLang] && cat.name !== cat.translations[currentLang] && (
                          <span className="text-[11px] font-normal text-slate-400">({cat.name})</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5 text-slate-500 max-w-xs truncate">
                      {cat.description || <span className="text-slate-300 italic text-[11px]">—</span>}
                    </td>
                    <td className="px-3.5 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {cat.translations?.ta && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand-50 text-brand-900 border border-brand-200">
                            தமிழ்: {cat.translations.ta}
                          </span>
                        )}
                        {cat.translations?.hi && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-900 border border-blue-200">
                            हिन्दी: {cat.translations.hi}
                          </span>
                        )}
                        {cat.translations?.te && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-900 border border-emerald-200">
                            తెలుగు: {cat.translations.te}
                          </span>
                        )}
                        {cat.translations?.kn && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200">
                            ಕನ್ನಡ: {cat.translations.kn}
                          </span>
                        )}
                        {cat.translations?.ml && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-900 border border-purple-200">
                            മലയാളം: {cat.translations.ml}
                          </span>
                        )}
                        {(!cat.translations || Object.values(cat.translations).every(v => !v)) && (
                          <span className="text-[10px] text-slate-400 italic">No regional translations</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5 text-center">
                      <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-slate-100 text-slate-700 border border-slate-200">
                        {cat.itemCount || 0} items
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 text-center font-bold text-slate-600">
                      {cat.displayOrder || idx + 1}
                    </td>
                    <td className="px-3.5 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(cat)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                          title="Edit Category"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(cat)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Delete Category"
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
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 font-bold">
          <span>Total: <strong className="text-slate-900">{categories.length}</strong> categories</span>
          <span>Synced with Item Master</span>
        </div>
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
                  Category Name *
                </label>
                <TransliterateInput
                  required
                  autoFocus
                  placeholder="e.g. Grocery, Snacks, Vegetables..."
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
