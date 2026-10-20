import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Settings as SettingsIcon, 
  Store, 
  Printer, 
  Shield, 
  Save, 
  Users, 
  Plus, 
  Check, 
  RefreshCw, 
  Languages, 
  Globe, 
  Percent,
  Barcode,
  Lock,
  Unlock,
  KeyRound,
  Eye,
  EyeOff,
  Tag,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import TransliterateInput from '../components/TransliterateInput';
import BarcodeCheatSheetModal from '../components/BarcodeCheatSheetModal';

export default function Settings() {
  const { user, client, updateShop } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('SHOP');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Shop & Billing Settings
  const [settings, setSettings] = useState({
    shopName: '',
    phone: '',
    address: '',
    chargeGst: false,
    gstin: '',
    priceIncludesGst: true,
    defaultGstRate: 0,
    upiId: '',
    footerNote: 'Thank you! Visit again.',
    printerWidth: '58mm',
    roundOff: true,
    allowNegativeStock: true,
    lowStockThreshold: 5,
    autoPrintReceipt: true,

    // Item code format configuration
    itemCodePrefix: 'ITM',
    itemCodeStartNumber: 1001,
    itemCodeDigits: 4,
    itemCodeAutoGenerate: true,

    // Without-GST / Secret Key Configuration
    withoutGstEnabled: true,
    withoutGstHotkey: 'F5',
    withoutGstPassword: '',
    withoutGstBillTitle: 'ESTIMATE / CASH MEMO',
    withoutGstBillPrefix: 'EST-',
    withoutGstHideGstin: true
  });

  // Staff users
  const [staffUsers, setStaffUsers] = useState([]);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: '', role: 'CASHIER', pin: '' });

  // Language & Phonetic Settings
  const { currentLang, selectLanguage, phoneticEnabled, setPhoneticEnabled, languageList } = useLanguage();
  const [testTyping, setTestTyping] = useState('');

  // Loose Item Barcode Generator Modal
  const [barcodeModalOpen, setBarcodeModalOpen] = useState(false);
  const [allItemsList, setAllItemsList] = useState([]);
  const [showWithoutGstPass, setShowWithoutGstPass] = useState(false);

  // Role check: Only Owner / Admin can access or edit Without-GST settings
  const isAdmin = !user || ['owner', 'admin'].includes(String(user?.role || '').toLowerCase());

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const [setRes, usersRes, itemsRes] = await Promise.all([
        axios.get('/api/settings'),
        axios.get('/api/auth/users'),
        axios.get('/api/items').catch(() => ({ data: [] }))
      ]);
      if (setRes.data) {
        setSettings(prev => ({ ...prev, ...setRes.data }));
      }
      if (usersRes.data?.users) {
        setStaffUsers(usersRes.data.users);
      }
      if (itemsRes.data) {
        setAllItemsList(itemsRes.data || []);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenBarcodeGenerator = async () => {
    try {
      const res = await axios.get('/api/items');
      setAllItemsList(res.data || []);
    } catch (e) {}
    setBarcodeModalOpen(true);
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await axios.put('/api/settings', settings);
      const updated = res.data?.settings || settings;
      if (updateShop) updateShop(updated);
      toast.success('Settings updated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    if (!newStaff.name || !newStaff.pin) {
      toast.warning('Please provide staff name and 4-digit PIN');
      return;
    }
    try {
      await axios.post('/api/auth/users', newStaff);
      setShowAddStaff(false);
      setNewStaff({ name: '', role: 'CASHIER', pin: '' });
      toast.success('Staff operator added successfully!');
      const res = await axios.get('/api/auth/users');
      setStaffUsers(res.data.users || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add staff');
    }
  };

  const navTabs = [
    { id: 'SHOP', label: 'Shop & Receipt', icon: Store },
    { id: 'ITEM_CODE', label: 'Item Code & Barcodes', icon: Barcode },
    { id: 'WITHOUT_GST', label: 'Without-GST Billing', icon: Lock, adminOnly: true },
    { id: 'PRINTER', label: 'Thermal Printer & Billing', icon: Printer },
    { id: 'LANGUAGE', label: 'Language & Phonetic Typing', icon: Languages },
    { id: 'STAFF', label: 'Staff PINs & Roles', icon: Users }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-3 pb-8">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-800 p-4 rounded-xl border border-slate-700">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <SettingsIcon className="w-7 h-7 text-lime-400" />
            Shop & App Settings
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Configure receipt header, item code format, loose barcode sheets, secret Without-GST hotkey & staff
          </p>
        </div>
        <div className="text-xs bg-slate-900 border border-slate-700 px-3.5 py-2 rounded-xl text-slate-400">
          Tenant: <span className="text-lime-400 font-bold font-mono">{client?.shopCode || 'MAIN'}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-700 gap-4 overflow-x-auto no-scrollbar">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isRestricted = tab.adminOnly && !isAdmin;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 pb-3 text-sm font-bold border-b-2 transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-lime-400 text-lime-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.adminOnly && (
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Admin
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: SHOP & RECEIPT */}
      {activeTab === 'SHOP' && (
        <form onSubmit={handleSaveSettings} className="bg-slate-800 p-6 rounded-2xl border border-slate-700 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Shop / Store Name</label>
              <input
                type="text"
                value={settings.shopName}
                onChange={(e) => setSettings({ ...settings, shopName: e.target.value })}
                placeholder="e.g. Balaji Provision & Fancy Store"
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-lime-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Store Phone / Mobile</label>
              <input
                type="text"
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                placeholder="e.g. 9842512143"
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-lime-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Store Address (Prints on Receipt)</label>
            <textarea
              rows={2}
              value={settings.address}
              onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              placeholder="e.g. No. 12, Main Bazaar Road, Near Bus Stand, Salem - 636001"
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-lime-500"
            />
          </div>

          {/* GST & Tax Configuration Section */}
          <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-700/80 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <Percent className="w-4 h-4 text-lime-400" />
                  Enable GST Tax Billing
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Calculate CGST / SGST on bills, print GSTIN on thermal receipts & generate tax filing reports
                </div>
              </div>
              <input
                type="checkbox"
                checked={Boolean(settings.chargeGst)}
                onChange={(e) => setSettings({ ...settings, chargeGst: e.target.checked })}
                className="w-5 h-5 accent-lime-500 rounded cursor-pointer"
              />
            </div>

            {settings.chargeGst && (
              <div className="space-y-4 pt-3 border-t border-slate-800 animate-in fade-in duration-150">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                      GSTIN Number (15 Digits) *
                    </label>
                    <input
                      type="text"
                      maxLength={15}
                      value={settings.gstin || ''}
                      onChange={(e) => setSettings({ ...settings, gstin: e.target.value.toUpperCase().trim() })}
                      placeholder="e.g. 33AAAAA0000A1Z5"
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono font-bold focus:outline-none focus:border-lime-500"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">State code + PAN + entity + checksum</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                      Default Product GST Slab (%)
                    </label>
                    <select
                      value={settings.defaultGstRate || 0}
                      onChange={(e) => setSettings({ ...settings, defaultGstRate: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold focus:outline-none focus:border-lime-500"
                    >
                      <option value={0}>0% (Exempt / Nil)</option>
                      <option value={5}>5% (Essential Goods)</option>
                      <option value={12}>12% (Processed Goods)</option>
                      <option value={18}>18% (Standard FMCG)</option>
                      <option value={28}>28% (Luxury / Aerated)</option>
                    </select>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Default tax rate for newly created products</span>
                  </div>
                </div>

                {/* Tax Inclusive vs Exclusive Mode */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-2">
                    GST Calculation Mode
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div
                      onClick={() => setSettings({ ...settings, priceIncludesGst: true })}
                      className={`cursor-pointer p-3.5 rounded-xl border transition ${
                        settings.priceIncludesGst !== false
                          ? 'bg-lime-500/10 border-lime-500 ring-1 ring-lime-500'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-bold text-white text-xs sm:text-sm">🟢 Tax Inclusive (Retail Default)</div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        Selling prices already include GST. (e.g. ₹100 item @ 18% = Base ₹84.75 + GST ₹15.25 = ₹100 total)
                      </div>
                    </div>

                    <div
                      onClick={() => setSettings({ ...settings, priceIncludesGst: false })}
                      className={`cursor-pointer p-3.5 rounded-xl border transition ${
                        settings.priceIncludesGst === false
                          ? 'bg-lime-500/10 border-lime-500 ring-1 ring-lime-500'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-bold text-white text-xs sm:text-sm">🔵 Tax Exclusive (Wholesale / B2B)</div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        GST is added on top of selling price. (e.g. ₹100 item @ 18% = Base ₹100 + GST ₹18 = ₹118 total)
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">UPI ID (For Dynamic QR Code)</label>
            <input
              type="text"
              value={settings.upiId || ''}
              onChange={(e) => setSettings({ ...settings, upiId: e.target.value })}
              placeholder="e.g. 9842512143@upi or shop@okaxis"
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-lime-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Receipt Footer Message</label>
            <input
              type="text"
              value={settings.footerNote}
              onChange={(e) => setSettings({ ...settings, footerNote: e.target.value })}
              placeholder="e.g. Thank you! Visit again. Goods once sold cannot be taken back."
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-lime-500"
            />
          </div>

          <div className="pt-3 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-lime-500 hover:bg-lime-400 text-slate-950 font-bold rounded-xl transition shadow-lg shadow-lime-500/20 disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Shop Profile'}
            </button>
          </div>
        </form>
      )}

      {/* TAB: ITEM CODE FORMAT & BARCODE GENERATOR */}
      {activeTab === 'ITEM_CODE' && (
        <form onSubmit={handleSaveSettings} className="bg-slate-800 p-6 rounded-2xl border border-slate-700 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-900 rounded-xl border border-slate-700">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Barcode className="w-5 h-5 text-lime-400" />
                Automatic Item Code Numbering Format
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Customize how product item codes are generated when creating new products or loose grocery items.
              </p>
            </div>
            <div className="shrink-0">
              <span className="px-3 py-1 bg-lime-500/10 text-lime-400 border border-lime-500/20 text-xs font-mono font-bold rounded-lg">
                Format: {settings.itemCodePrefix || 'ITM'}-{String(settings.itemCodeStartNumber || 1001).padStart(Number(settings.itemCodeDigits) || 4, '0')}
              </span>
            </div>
          </div>

          {/* Form fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                Item Code Prefix
              </label>
              <input
                type="text"
                value={settings.itemCodePrefix || ''}
                onChange={(e) => setSettings({ ...settings, itemCodePrefix: e.target.value.toUpperCase() })}
                placeholder="e.g. ITM, GRO, DAL"
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono uppercase focus:outline-none focus:border-lime-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Letter prefix placed before number</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                Starting Number
              </label>
              <input
                type="number"
                min="1"
                value={settings.itemCodeStartNumber || 1001}
                onChange={(e) => setSettings({ ...settings, itemCodeStartNumber: parseInt(e.target.value) || 1 })}
                placeholder="e.g. 1001"
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-lime-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Initial starting serial number</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                Zero Padding Digits
              </label>
              <select
                value={settings.itemCodeDigits || 4}
                onChange={(e) => setSettings({ ...settings, itemCodeDigits: parseInt(e.target.value) || 4 })}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-lime-500"
              >
                <option value={3}>3 Digits (e.g. 001)</option>
                <option value={4}>4 Digits (e.g. 0001 / 1001)</option>
                <option value={5}>5 Digits (e.g. 00001)</option>
                <option value={6}>6 Digits (e.g. 000001)</option>
              </select>
              <span className="text-[10px] text-slate-400 mt-1 block">Padding length with leading zeros</span>
            </div>
          </div>

          {/* Auto-generate toggle */}
          <label className="flex items-center justify-between p-4 bg-slate-900 rounded-xl border border-slate-700 cursor-pointer">
            <div>
              <div className="font-bold text-white text-sm">Auto-generate Code on New Item Creation</div>
              <div className="text-xs text-slate-400">Automatically suggest the next sequential item code when adding a new item</div>
            </div>
            <input
              type="checkbox"
              checked={Boolean(settings.itemCodeAutoGenerate)}
              onChange={(e) => setSettings({ ...settings, itemCodeAutoGenerate: e.target.checked })}
              className="w-5 h-5 accent-lime-500 rounded"
            />
          </label>

          {/* Live Preview Box */}
          <div className="p-4 bg-gradient-to-r from-slate-900 to-slate-950 rounded-xl border border-slate-700 space-y-3">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-lime-400" />
              Live Item Code Preview & Sequence Sample
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[0, 1, 2].map((idx) => {
                const sampleNum = (parseInt(settings.itemCodeStartNumber) || 1001) + idx;
                const samplePad = String(sampleNum).padStart(Number(settings.itemCodeDigits) || 4, '0');
                const sampleCode = `${(settings.itemCodePrefix || 'ITM').trim().toUpperCase()}-${samplePad}`;
                const sampleNames = ['Toor Dal (துவரம் பருப்பு)', 'Chilli Powder (மிளகாய் தூள்)', 'Mustard Seeds (கடுகு)'];
                return (
                  <div key={idx} className="p-3 bg-slate-800/80 rounded-lg border border-slate-700/60">
                    <div className="text-[11px] text-slate-400 font-medium truncate">{sampleNames[idx]}</div>
                    <div className="text-lg font-mono font-black text-lime-400 mt-0.5 tracking-wider">{sampleCode}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section: Loose Items Barcode Generator */}
          <div className="p-5 bg-lime-950/20 border border-lime-500/30 rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Tag className="w-4 h-4 text-lime-400" />
                  Loose Items Barcode Generator (Dal, Chilli Powder, Spices)
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  Print Code128 barcode stickers or a counter cheat-sheet for loose items sold by weight (kg/gram) or without factory barcodes.
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenBarcodeGenerator}
                className="px-4 py-2.5 bg-lime-500 hover:bg-lime-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shrink-0 shadow-md transition"
              >
                <Barcode className="w-4 h-4" />
                Open Loose Barcode Generator
              </button>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-lime-500 hover:bg-lime-400 text-slate-950 font-bold rounded-xl transition shadow-lg shadow-lime-500/20 disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Item Code Settings'}
            </button>
          </div>
        </form>
      )}

      {/* TAB: WITHOUT-GST BILLING (ADMIN ONLY) */}
      {activeTab === 'WITHOUT_GST' && (
        <div className="space-y-6">
          {!isAdmin ? (
            <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 text-center space-y-3">
              <Lock className="w-12 h-12 text-amber-400 mx-auto" />
              <h3 className="text-lg font-bold text-white">Administrator Access Required</h3>
              <p className="text-sm text-slate-400 max-w-md mx-auto">
                Only the Store Owner or Admin can configure Without-GST billing format, secret hotkeys, and passwords.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSaveSettings} className="bg-slate-800 p-6 rounded-2xl border border-slate-700 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-amber-500/10 rounded-xl border border-amber-500/30">
                <div>
                  <h2 className="text-base font-bold text-amber-300 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-amber-400" />
                    Without-GST / Secret Key Billing Mode (Admin Only)
                  </h2>
                  <p className="text-xs text-amber-200/80 mt-1">
                    Configure secret hotkeys and passwords to toggle between GST Tax Invoice and Non-GST / Estimate billing on the POS counter.
                  </p>
                </div>
                <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-mono font-bold rounded-lg shrink-0">
                  Secret Mode
                </span>
              </div>

              {/* Toggle Enable */}
              <label className="flex items-center justify-between p-4 bg-slate-900 rounded-xl border border-slate-700 cursor-pointer">
                <div>
                  <div className="font-bold text-white text-sm">Enable Without-GST Billing Mode</div>
                  <div className="text-xs text-slate-400">Allows switching the POS into Without-GST (Estimate / Cash Memo) format</div>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(settings.withoutGstEnabled)}
                  onChange={(e) => setSettings({ ...settings, withoutGstEnabled: e.target.checked })}
                  className="w-5 h-5 accent-amber-500 rounded"
                />
              </label>

              {settings.withoutGstEnabled && (
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Hotkey selector */}
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                        Activation Hotkey on Billing Screen
                      </label>
                      <select
                        value={settings.withoutGstHotkey || 'F5'}
                        onChange={(e) => setSettings({ ...settings, withoutGstHotkey: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-amber-500"
                      >
                        <option value="F5">Fn + F5 / F5 (Recommended: Enter password after pressing)</option>
                        <option value="Ctrl+F5">Ctrl + F5</option>
                        <option value="Alt+F5">Alt + F5</option>
                        <option value="F9">F9</option>
                        <option value="Ctrl+B">Ctrl + B</option>
                      </select>
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Pressing this hotkey on the billing screen triggers the secret password prompt
                      </span>
                    </div>

                    {/* Secret Password */}
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                        Secret Authorization Password
                      </label>
                      <div className="relative">
                        <input
                          type={showWithoutGstPass ? 'text' : 'password'}
                          value={settings.withoutGstPassword || ''}
                          onChange={(e) => setSettings({ ...settings, withoutGstPassword: e.target.value })}
                          placeholder="Set secret password (e.g. 1234)"
                          className="w-full px-4 py-2.5 pr-11 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono tracking-wider focus:outline-none focus:border-amber-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowWithoutGstPass(!showWithoutGstPass)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                          {showWithoutGstPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Password required to switch from GST to Without-GST mode
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Bill Title */}
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                        Without-GST Bill Title (Printed on Receipt)
                      </label>
                      <input
                        type="text"
                        value={settings.withoutGstBillTitle || 'ESTIMATE / CASH MEMO'}
                        onChange={(e) => setSettings({ ...settings, withoutGstBillTitle: e.target.value })}
                        placeholder="e.g. ESTIMATE / CASH MEMO"
                        className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Replaces "TAX INVOICE" header on receipts
                      </span>
                    </div>

                    {/* Bill Prefix */}
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                        Bill Number Prefix
                      </label>
                      <input
                        type="text"
                        value={settings.withoutGstBillPrefix || 'EST-'}
                        onChange={(e) => setSettings({ ...settings, withoutGstBillPrefix: e.target.value.toUpperCase() })}
                        placeholder="e.g. EST-"
                        className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono uppercase focus:outline-none focus:border-amber-500"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Generates series like EST-0001 instead of INV-0001
                      </span>
                    </div>
                  </div>

                  {/* Hide GSTIN & Tax info */}
                  <label className="flex items-center justify-between p-4 bg-slate-900 rounded-xl border border-slate-700 cursor-pointer">
                    <div>
                      <div className="font-bold text-white text-sm">Hide GSTIN & Tax Breakdown on Receipt</div>
                      <div className="text-xs text-slate-400">
                        Suppresses shop GSTIN number, HSN code, CGST, and SGST tax breakdown on thermal receipts
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(settings.withoutGstHideGstin)}
                      onChange={(e) => setSettings({ ...settings, withoutGstHideGstin: e.target.checked })}
                      className="w-5 h-5 accent-amber-500 rounded"
                    />
                  </label>

                  {/* Instructions Card */}
                  <div className="p-4 bg-slate-900/90 rounded-xl border border-slate-700/80 space-y-2">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <KeyRound className="w-4 h-4 text-amber-400" />
                      How to use on Billing Screen:
                    </div>
                    <ol className="text-xs text-slate-300 list-decimal list-inside space-y-1 pl-1">
                      <li>On the New Bill POS screen, press <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-600 rounded font-mono text-[11px] text-amber-300">Fn+F5</kbd> (or <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-600 rounded font-mono text-[11px] text-amber-300">F5</kbd>).</li>
                      <li>A secure password prompt will immediately pop up on screen.</li>
                      <li>Type your secret password and press <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-600 rounded font-mono text-[11px] text-amber-300">Enter</kbd>.</li>
                      <li>The screen will instantly switch to <span className="text-amber-400 font-bold">Without-GST / Estimate Mode</span> with ₹0 tax calculation and estimate bill serials!</li>
                      <li>Press the hotkey again or click the mode badge to switch back to <span className="text-lime-400 font-bold">GST Tax Invoice</span> at any time.</li>
                    </ol>
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition shadow-lg shadow-amber-500/20 disabled:opacity-50"
                >
                  <Save className="w-5 h-5" />
                  {saving ? 'Saving...' : 'Save Without-GST Settings'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* TAB 2: PRINTER & BILLING CONFIG */}
      {activeTab === 'PRINTER' && (
        <form onSubmit={handleSaveSettings} className="bg-slate-800 p-6 rounded-2xl border border-slate-700 space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-3">Thermal Printer Paper Width</label>
            <div className="grid grid-cols-2 gap-4">
              {[
                { id: '58mm', title: '58mm (2-Inch)', desc: 'Standard small thermal slip printer / portable Bluetooth' },
                { id: '80mm', title: '80mm (3-Inch)', desc: 'Wider POS counter thermal receipt printer' }
              ].map((p) => (
                <div
                  key={p.id}
                  onClick={() => setSettings({ ...settings, printerWidth: p.id })}
                  className={`cursor-pointer p-4 rounded-xl border transition ${
                    settings.printerWidth === p.id
                      ? 'bg-lime-500/10 border-lime-500 ring-1 ring-lime-500'
                      : 'bg-slate-900 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <div className="font-bold text-white text-base">{p.title}</div>
                  <div className="text-xs text-slate-400 mt-1">{p.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4 pt-3 border-t border-slate-700">
            <label className="flex items-center justify-between p-4 bg-slate-900 rounded-xl border border-slate-700 cursor-pointer">
              <div>
                <div className="font-bold text-white text-sm">Round Off Bill Amount</div>
                <div className="text-xs text-slate-400">Automatically round total amount to the nearest ₹1 (e.g. ₹104.50 → ₹105.00)</div>
              </div>
              <input
                type="checkbox"
                checked={settings.roundOff}
                onChange={(e) => setSettings({ ...settings, roundOff: e.target.checked })}
                className="w-5 h-5 accent-lime-500 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-4 bg-slate-900 rounded-xl border border-slate-700 cursor-pointer">
              <div>
                <div className="font-bold text-white text-sm">Allow Negative Stock Billing</div>
                <div className="text-xs text-slate-400">Allow billing even when stock reaches 0 (vital for fast petti shops before inventory entry)</div>
              </div>
              <input
                type="checkbox"
                checked={settings.allowNegativeStock}
                onChange={(e) => setSettings({ ...settings, allowNegativeStock: e.target.checked })}
                className="w-5 h-5 accent-lime-500 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-4 bg-slate-900 rounded-xl border border-slate-700 cursor-pointer">
              <div>
                <div className="font-bold text-white text-sm">Auto-open Print Window After Payment</div>
                <div className="text-xs text-slate-400">Instantly trigger receipt printing dialog when bill is confirmed</div>
              </div>
              <input
                type="checkbox"
                checked={settings.autoPrintReceipt}
                onChange={(e) => setSettings({ ...settings, autoPrintReceipt: e.target.checked })}
                className="w-5 h-5 accent-lime-500 rounded"
              />
            </label>
          </div>

          <div className="pt-3 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-lime-500 hover:bg-lime-400 text-slate-950 font-bold rounded-xl transition shadow-lg shadow-lime-500/20 disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Printer Preferences'}
            </button>
          </div>
        </form>
      )}

      {/* TAB: LANGUAGE & PHONETIC TYPING */}
      {activeTab === 'LANGUAGE' && (
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Languages className="w-5 h-5 text-lime-400" />
              Store Display & Typing Language
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Select your preferred regional language. When phonetic typing is active, typing in English (e.g., <span className="text-lime-300 font-mono">thakkali</span>) automatically converts to regional script (<span className="text-lime-300 font-bold">தக்காளி</span>) upon pressing Space or Enter.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {languageList.map((lang) => {
              const isSelected = currentLang === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => selectLanguage(lang.code)}
                  className={`p-4 rounded-xl border text-left transition flex flex-col justify-between ${
                    isSelected
                      ? 'bg-lime-500/10 border-lime-400 shadow-md shadow-lime-500/10'
                      : 'bg-slate-900 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-white">{lang.native}</span>
                    {isSelected && <Check className="w-5 h-5 text-lime-400" />}
                  </div>
                  <div className="text-xs text-slate-400 mt-2 font-medium">
                    {lang.label} {lang.code !== 'en' && '• Phonetic typing'}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Phonetic typing toggle */}
          <div className="p-4 bg-slate-900 rounded-xl border border-slate-700 flex items-center justify-between">
            <div>
              <div className="font-bold text-white text-sm flex items-center gap-2">
                <span>Enable Phonetic Typing (Tanglish / Hinglish to Script)</span>
                {phoneticEnabled && (
                  <span className="text-[10px] bg-lime-500/20 text-lime-400 px-2 py-0.5 rounded font-bold">
                    ACTIVE
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Automatically transliterate English words into {languageList.find(l => l.code === currentLang)?.native || 'Regional'} when you type a space
              </div>
            </div>
            <input
              type="checkbox"
              checked={phoneticEnabled}
              onChange={(e) => {
                const val = e.target.checked;
                setPhoneticEnabled(val);
                axios.put('/api/settings', { phoneticEnabled: val }).catch(() => {});
              }}
              className="w-5 h-5 accent-lime-500 rounded cursor-pointer"
            />
          </div>

          {/* Interactive Test typing playground */}
          <div className="p-5 bg-slate-900/80 rounded-xl border border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Live Typing Preview & Test Box
              </span>
              <span className="text-xs text-slate-400">
                Selected: <span className="text-lime-400 font-bold">{languageList.find(l => l.code === currentLang)?.label}</span>
              </span>
            </div>
            <TransliterateInput
              value={testTyping}
              onChange={(e) => setTestTyping(e.target.value)}
              placeholder={`Try typing "${currentLang === 'ta' ? 'thakkali venum' : currentLang === 'hi' ? 'tamatar chahiye' : 'product name'}" and hit space...`}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-base focus:outline-none focus:border-lime-500"
            />
            <div className="text-xs text-slate-400 flex items-center justify-between">
              <span>Output result: <span className="text-lime-300 font-semibold">{testTyping || '—'}</span></span>
              {testTyping && (
                <button
                  type="button"
                  onClick={() => setTestTyping('')}
                  className="text-xs text-slate-500 hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: STAFF & PIN */}
      {activeTab === 'STAFF' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-slate-800 p-5 rounded-2xl border border-slate-700">
            <div>
              <h3 className="font-bold text-white text-base">Cashiers & Store Operators</h3>
              <p className="text-xs text-slate-400">Manage 4-digit numeric login PINs for quick counter switching</p>
            </div>
            <button
              onClick={() => setShowAddStaff(true)}
              className="flex items-center gap-2 px-4 py-2 bg-lime-500 hover:bg-lime-400 text-slate-950 font-bold rounded-xl text-sm transition"
            >
              <Plus className="w-4 h-4" />
              Add Operator
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {staffUsers.map((u) => (
              <div key={u._id} className="bg-slate-800 border border-slate-700 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <div className="font-bold text-white">{u.name}</div>
                  <div className="text-xs text-slate-400">{u.role}</div>
                </div>
                <span className="text-xs px-2.5 py-1 bg-lime-500/10 text-lime-400 border border-lime-500/30 font-bold rounded-lg font-mono">
                  PIN Active
                </span>
              </div>
            ))}
          </div>

          {/* Add Staff Modal */}
          {showAddStaff && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
                <h3 className="text-lg font-bold text-white mb-4">Add Store Staff / Cashier</h3>
                <form onSubmit={handleAddStaff} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Staff Name *</label>
                    <input
                      type="text"
                      required
                      value={newStaff.name}
                      onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                      placeholder="e.g. Suresh"
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-lime-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Role</label>
                    <select
                      value={newStaff.role}
                      onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-lime-500"
                    >
                      <option value="CASHIER">Cashier (Billing only)</option>
                      <option value="MANAGER">Manager (Billing, Day Close, Reports)</option>
                      <option value="ADMIN">Admin (Full Control)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">4-Digit Login PIN *</label>
                    <input
                      type="password"
                      maxLength={4}
                      required
                      value={newStaff.pin}
                      onChange={(e) => setNewStaff({ ...newStaff, pin: e.target.value.replace(/\D/g, '') })}
                      placeholder="e.g. 1234"
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono tracking-widest text-center text-xl focus:outline-none focus:border-lime-500"
                    />
                  </div>

                  <div className="pt-3 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowAddStaff(false)}
                      className="flex-1 py-2.5 bg-slate-700 text-white rounded-xl font-bold transition hover:bg-slate-600"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-lime-500 text-slate-950 rounded-xl font-bold transition hover:bg-lime-400"
                    >
                      Create Staff
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Loose Item Barcode Generator & Cheat Sheet Modal */}
      {barcodeModalOpen && (
        <BarcodeCheatSheetModal
          isOpen={barcodeModalOpen}
          onClose={() => setBarcodeModalOpen(false)}
          items={allItemsList}
        />
      )}
    </div>
  );
}
