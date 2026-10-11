import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import ThermalReceiptModal from '../components/ThermalReceiptModal';
import { 
  Search, 
  Printer, 
  XCircle, 
  Calendar, 
  Receipt, 
  RotateCcw, 
  AlertTriangle,
  Eye,
  Filter
} from 'lucide-react';

export default function BillsList() {
  const { user } = useAuth();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [selectedBill, setSelectedBill] = useState(null);
  const [cancelModalBill, setCancelModalBill] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const fetchBills = async () => {
    setLoading(true);
    try {
      const params = { status, search, startDate, endDate };
      const res = await axios.get('/api/bills', { params });
      setBills(res.data.bills || []);
    } catch (err) {
      console.error('Error fetching bills:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, [status, startDate, endDate]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchBills();
  };

  const handleCancelBill = async () => {
    if (!cancelReason.trim()) {
      alert('Cancel reason is mandatory');
      return;
    }

    setCancelling(true);
    try {
      await axios.post(`/api/bills/${cancelModalBill._id}/cancel`, {
        reason: cancelReason.trim()
      });
      setCancelModalBill(null);
      setCancelReason('');
      fetchBills();
    } catch (err) {
      alert(err.response?.data?.message || 'Error cancelling bill');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Title & Filter Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Receipt className="w-5 h-5 text-brand-600" />
              Bills &amp; Sales History
            </h2>
            <p className="text-xs text-slate-500 font-medium">Search, reprint receipts, cancel or audit previous transactions</p>
          </div>
        </div>

        {/* Filter Controls */}
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-2">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search bill no, phone, name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-brand-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:border-brand-500"
          >
            <option value="All">All Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Credit">Credit (Udhar)</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          {/* Date Range */}
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:border-brand-500"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:border-brand-500"
          />
        </form>
      </div>

      {/* Bills Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3">Bill No</th>
                <th className="px-4 py-3">Date &amp; Time</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Payment Mode</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-10 text-slate-400 font-bold">
                    Loading bills...
                  </td>
                </tr>
              ) : bills.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-slate-400">
                    <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold">No bills found for the selected period</p>
                  </td>
                </tr>
              ) : (
                bills.map((b) => (
                  <tr key={b._id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3 font-mono font-black text-slate-900">
                      #{b.billNo}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(b.date).toLocaleDateString()} {new Date(b.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-slate-900">{b.customer?.name || 'Walk-in'}</span>
                      {b.customer?.phone && <span className="text-slate-400 block text-[10px]">{b.customer.phone}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {b.payments?.cash > 0 && <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded text-[10px]">Cash</span>}
                        {b.payments?.upi > 0 && <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 font-bold rounded text-[10px]">UPI</span>}
                        {b.payments?.card > 0 && <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 font-bold rounded text-[10px]">Card</span>}
                        {b.payments?.credit > 0 && <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 font-bold rounded text-[10px]">Credit</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-black text-slate-900 text-sm">
                      ₹{b.grandTotal.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        b.status === 'Paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : b.status === 'Credit'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedBill(b)}
                          className="p-1.5 bg-slate-100 hover:bg-brand-100 text-slate-700 hover:text-brand-900 rounded-lg transition"
                          title="View / Print receipt"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {user?.role === 'owner' && b.status !== 'Cancelled' && (
                          <button
                            onClick={() => {
                              setCancelModalBill(b);
                              setCancelReason('');
                            }}
                            className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition"
                            title="Cancel bill"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bill Receipt Preview Modal */}
      {selectedBill && (
        <ThermalReceiptModal
          bill={selectedBill}
          onClose={() => setSelectedBill(null)}
        />
      )}

      {/* Cancel Bill Modal (Owner only) */}
      {cancelModalBill && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-2 text-red-600 font-extrabold text-base mb-1">
              <AlertTriangle className="w-5 h-5" />
              <span>Cancel Bill #{cancelModalBill.billNo}?</span>
            </div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Cancelling will reverse stock units and remove any credit due added to the customer. This action is irreversible.
            </p>

            <div className="mt-3">
              <label className="text-xs font-bold text-slate-700 block mb-1">Cancellation Reason *</label>
              <textarea
                required
                rows="2"
                placeholder="e.g. Customer returned goods, entered wrong items..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:border-red-500"
                autoFocus
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCancelModalBill(null)}
                className="py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs"
              >
                Keep Bill
              </button>
              <button
                type="button"
                onClick={handleCancelBill}
                disabled={cancelling || !cancelReason.trim()}
                className="py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-black rounded-xl text-xs"
              >
                {cancelling ? 'Cancelling...' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
