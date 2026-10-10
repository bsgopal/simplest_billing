import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Truck, Plus, Phone, Building2, Search, DollarSign, X, Check, ArrowDownLeft } from 'lucide-react';

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    companyName: '',
    gstin: '',
    address: '',
    openingBalance: 0
  });

  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('CASH');
  const [payNotes, setPayNotes] = useState('');

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/suppliers');
      setSuppliers(res.data.suppliers || res.data || []);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleSaveSupplier = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/suppliers', formData);
      setShowAddModal(false);
      setFormData({ name: '', phone: '', companyName: '', gstin: '', address: '', openingBalance: 0 });
      fetchSuppliers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save supplier');
    }
  };

  const handlePaySupplier = async (e) => {
    e.preventDefault();
    if (!payAmount || Number(payAmount) <= 0) return;
    try {
      await axios.post(`/api/suppliers/${selectedSupplier._id}/payment`, {
        amount: Number(payAmount),
        paymentMode: payMode,
        notes: payNotes
      });
      setShowPayModal(false);
      setPayAmount('');
      setPayNotes('');
      setSelectedSupplier(null);
      fetchSuppliers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to record payment');
    }
  };

  const filtered = suppliers.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.companyName?.toLowerCase().includes(search.toLowerCase()) ||
    s.phone?.includes(search)
  );

  const totalPayable = suppliers.reduce((acc, s) => acc + (s.currentBalance || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner & KPI */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <Truck className="w-7 h-7 text-brand-600" />
            Suppliers &amp; Vendors
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage wholesale distributors, stock purchases and supplier payables
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right mr-3 hidden sm:block">
            <div className="text-xs text-slate-400 uppercase tracking-wider font-bold">Total Payable</div>
            <div className="text-xl font-black text-rose-600">₹{totalPayable.toFixed(2)}</div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-slate-950 font-black transition shadow-xs active:scale-98"
          >
            <Plus className="w-5 h-5" />
            Add Supplier
          </button>
        </div>
      </div>

      {/* Mobile KPI */}
      <div className="sm:hidden bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center shadow-xs">
        <span className="text-sm text-slate-600 font-bold">Total Pending Payable:</span>
        <span className="text-lg font-black text-rose-600">₹{totalPayable.toFixed(2)}</span>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by supplier name, company or phone..."
          className="w-full pl-12 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold placeholder:text-slate-400 focus:outline-none focus:border-brand-500 shadow-2xs"
        />
      </div>

      {/* Suppliers Grid / List */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 font-bold">Loading suppliers...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300 text-slate-400">
          <Truck className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="text-lg font-bold text-slate-700">No suppliers found</p>
          <p className="text-sm text-slate-500 mt-1">Add your wholesale vendors to keep track of purchase ledger</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s) => (
            <div
              key={s._id}
              className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-slate-300 hover:shadow-xs transition flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-extrabold text-slate-900 text-lg">{s.name}</h3>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                      (s.currentBalance || 0) > 0
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    }`}
                  >
                    {(s.currentBalance || 0) > 0 ? `Payable: ₹${s.currentBalance}` : 'All Clear'}
                  </span>
                </div>

                {s.companyName && (
                  <div className="flex items-center gap-2 text-sm text-slate-600 mb-1.5 font-medium">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <span>{s.companyName}</span>
                  </div>
                )}

                {s.phone && (
                  <div className="flex items-center gap-2 text-sm text-slate-500 mb-1.5 font-mono">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span>{s.phone}</span>
                  </div>
                )}

                {s.gstin && (
                  <div className="text-xs text-slate-400 font-mono mt-1">
                    GSTIN: <span className="text-slate-700 font-bold">{s.gstin}</span>
                  </div>
                )}
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex gap-2">
                <button
                  onClick={() => {
                    setSelectedSupplier(s);
                    setShowPayModal(true);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-xl text-sm font-bold transition"
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  Pay Supplier
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Supplier Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Truck className="w-5 h-5 text-brand-600" />
                Add New Supplier
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Supplier / Contact Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Ramesh Trading Co. / Ramesh"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g. 9842512143"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Company / Firm Name</label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="e.g. Balaji Agencies"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">GSTIN (Optional)</label>
                  <input
                    type="text"
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                    placeholder="33AAAAA0000A1Z5"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 font-mono focus:outline-none focus:border-brand-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Opening Payable (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.openingBalance}
                    onChange={(e) => setFormData({ ...formData, openingBalance: Number(e.target.value) })}
                    placeholder="0.00"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:bg-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Address / City</label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Market road, wholesale market..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:bg-white"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-brand-500 hover:bg-brand-600 text-slate-950 rounded-xl font-black transition shadow-xs"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Supplier Modal */}
      {showPayModal && selectedSupplier && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="text-xl font-black text-slate-900">Record Supplier Payment</h3>
                <p className="text-sm text-slate-500">{selectedSupplier.name}</p>
              </div>
              <button onClick={() => setShowPayModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">
                ✕
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 mb-5 flex justify-between items-center">
              <span className="text-sm text-slate-600 font-medium">Current Outstanding:</span>
              <span className="text-lg font-black text-rose-600">₹{(selectedSupplier.currentBalance || 0).toFixed(2)}</span>
            </div>

            <form onSubmit={handlePaySupplier} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Payment Amount (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0.01"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="Enter amount paid"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-xl font-black text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Payment Mode</label>
                <div className="grid grid-cols-3 gap-2">
                  {['CASH', 'UPI', 'BANK_TRANSFER'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPayMode(m)}
                      className={`py-2 rounded-xl text-xs font-bold transition border ${
                        payMode === m
                          ? 'bg-brand-500 text-slate-950 border-brand-500 font-black'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {m.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Notes / Ref Number</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="e.g. GPay ref / cheque number"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:border-brand-500 focus:bg-white"
                />
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black transition shadow-xs"
                >
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
