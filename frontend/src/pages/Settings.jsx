import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Settings as SettingsIcon, Store, Printer, Shield, Save, Users, Plus, Check, RefreshCw, Languages, Globe } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import TransliterateInput from '../components/TransliterateInput';

export default function Settings() {
  const { user, client } = useAuth();
  const [activeTab, setActiveTab] = useState('SHOP');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Shop & Billing Settings
  const [settings, setSettings] = useState({
    shopName: '',
    phone: '',
    address: '',
    gstin: '',
    upiId: '',
    footerNote: 'Thank you! Visit again.',
    printerWidth: '58mm',
    roundOff: true,
    allowNegativeStock: true,
    lowStockThreshold: 5,
    autoPrintReceipt: true
  });

  // Staff users
  const [staffUsers, setStaffUsers] = useState([]);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: '', role: 'CASHIER', pin: '' });

  // Language & Phonetic Settings
  const { currentLang, setCurrentLang, phoneticEnabled, setPhoneticEnabled, languageList } = useLanguage();
  const [testTyping, setTestTyping] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const [setRes, usersRes] = await Promise.all([
        axios.get('/api/settings'),
        axios.get('/api/auth/users')
      ]);
      if (setRes.data) {
        setSettings(prev => ({ ...prev, ...setRes.data }));
      }
      if (usersRes.data?.users) {
        setStaffUsers(usersRes.data.users);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await axios.put('/api/settings', settings);
      alert('Settings updated successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    if (!newStaff.name || !newStaff.pin) {
      alert('Please provide name and 4-digit PIN');
      return;
    }
    try {
      await axios.post('/api/auth/users', newStaff);
      setShowAddStaff(false);
      setNewStaff({ name: '', role: 'CASHIER', pin: '' });
      const res = await axios.get('/api/auth/users');
      setStaffUsers(res.data.users || []);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add staff');
    }
  };

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
            Configure receipt header, UPI QR payments, thermal printer and staff PINs
          </p>
        </div>
        <div className="text-xs bg-slate-900 border border-slate-700 px-3.5 py-2 rounded-xl text-slate-400">
          Tenant: <span className="text-lime-400 font-bold font-mono">{client?.shopCode || 'MAIN'}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-700 gap-6">
        {[
          { id: 'SHOP', label: 'Shop & Receipt', icon: Store },
          { id: 'PRINTER', label: 'Thermal Printer & Billing', icon: Printer },
          { id: 'LANGUAGE', label: 'Language & Phonetic Typing', icon: Languages },
          { id: 'STAFF', label: 'Staff PINs & Roles', icon: Users }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 pb-3 text-sm font-bold border-b-2 transition ${
                activeTab === tab.id
                  ? 'border-lime-400 text-lime-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">GSTIN Number (Optional)</label>
              <input
                type="text"
                value={settings.gstin}
                onChange={(e) => setSettings({ ...settings, gstin: e.target.value.toUpperCase() })}
                placeholder="33AAAAA0000A1Z5"
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-lime-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">UPI ID (For Dynamic QR Code)</label>
              <input
                type="text"
                value={settings.upiId}
                onChange={(e) => setSettings({ ...settings, upiId: e.target.value })}
                placeholder="e.g. 9842512143@upi or shop@okaxis"
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-lime-500"
              />
            </div>
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
                  onClick={() => setCurrentLang(lang.code)}
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
              onChange={(e) => setPhoneticEnabled(e.target.checked)}
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
    </div>
  );
}
