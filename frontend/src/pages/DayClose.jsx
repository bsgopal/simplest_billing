import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { SunMoon, Printer, CheckCircle, AlertCircle, History, Wallet } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export default function DayClose() {
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [actualCash, setActualCash] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState([]);
  const [completedClose, setCompletedClose] = useState(null);

  const fetchDayCloseData = async () => {
    setLoading(true);
    try {
      const [curRes, histRes] = await Promise.all([
        axios.get('/api/dayclose/current'),
        axios.get('/api/dayclose/history')
      ]);
      setData(curRes.data);
      setHistory(histRes.data || []);
      setActualCash(curRes.data.expectedCash || '');
    } catch (err) {
      console.error('Error fetching day close data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDayCloseData();
  }, []);

  const expected = data?.expectedCash || 0;
  const actual = parseFloat(actualCash) || 0;
  const difference = actual - expected;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isNaN(actual)) {
      toast.warning('Please enter actual cash counted');
      return;
    }

    setSubmitting(true);
    try {
      const res = await axios.post('/api/dayclose', {
        actualCashCounted: actual,
        note
      });
      setCompletedClose(res.data.dayClose);
      toast.success('Day tally closed successfully!');
      fetchDayCloseData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error closing day');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <SunMoon className="w-5 h-5 text-purple-600" />
          Day Close &amp; Cash Drawer Reconciliation
        </h2>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Match the physical cash in drawer with system transactions at closing time
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Main Reconciliation Card (7 cols) */}
        <div className="md:col-span-7 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-3">
            Today's Drawer Cash Formula
          </h3>

          <div className="space-y-2 text-xs font-semibold text-slate-700 divide-y divide-slate-100">
            <div className="flex justify-between py-1.5">
              <span>Opening Cash (from yesterday)</span>
              <span className="font-bold text-slate-900">₹{(data?.openingCash || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-1.5 text-emerald-700">
              <span>+ Cash Sales ({data?.totalBills || 0} bills)</span>
              <span className="font-bold">+₹{(data?.cashSales || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-1.5 text-emerald-700">
              <span>+ Credit Udhar Received in Cash</span>
              <span className="font-bold">+₹{(data?.creditCashReceived || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-1.5 text-red-600">
              <span>− Cash Expenses Paid</span>
              <span className="font-bold">−₹{(data?.cashExpenses || 0).toFixed(2)}</span>
            </div>

            {/* Expected Result */}
            <div className="flex justify-between py-2 text-sm font-black text-slate-900 bg-slate-50 px-3 rounded-xl border border-slate-200">
              <span>EXPECTED CASH IN DRAWER:</span>
              <span className="text-brand-700 text-base">₹{expected.toFixed(2)}</span>
            </div>
          </div>

          {/* Actual Cash Count Form */}
          <form onSubmit={handleSubmit} className="mt-5 space-y-3 pt-3 border-t border-slate-200">
            <div>
              <label className="text-xs font-black text-slate-900 block mb-1">
                Actual Physical Cash Counted (₹) *
              </label>
              <input
                type="number"
                step="1"
                required
                value={actualCash}
                onChange={(e) => setActualCash(e.target.value)}
                className="w-full px-3.5 py-2.5 text-2xl font-black bg-slate-50 border-2 border-brand-500 rounded-xl text-slate-900 focus:outline-hidden"
              />
            </div>

            {/* Difference Calculation */}
            <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-black ${
              difference === 0
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : difference < 0
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}>
              <span>Difference:</span>
              <span>
                {difference === 0 ? 'Exact Match (₹0.00)' : difference > 0 ? `+₹${difference.toFixed(2)} (Excess)` : `-₹${Math.abs(difference).toFixed(2)} (Short)`}
              </span>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Note / Reason for Difference</label>
              <input
                type="text"
                placeholder="e.g. Rounding difference, cash tally ok..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-purple-700 hover:bg-purple-800 text-white font-black rounded-xl text-xs transition shadow-md flex items-center justify-center gap-2"
            >
              <SunMoon className="w-4 h-4" />
              <span>{submitting ? 'Closing...' : 'Close Day & Lock Tally'}</span>
            </button>
          </form>
        </div>

        {/* Other Collections Side Panel (5 cols) */}
        <div className="md:col-span-5 space-y-4">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-2">
              Non-Cash Collections Today
            </h3>
            <div className="space-y-2 text-xs font-bold">
              <div className="flex justify-between p-2.5 bg-blue-50/60 border border-blue-200 rounded-xl text-blue-900">
                <span>UPI Collections:</span>
                <span>₹{(data?.upiSales || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between p-2.5 bg-purple-50/60 border border-purple-200 rounded-xl text-purple-900">
                <span>Card Collections:</span>
                <span>₹{(data?.cardSales || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between p-2.5 bg-amber-50/60 border border-amber-200 rounded-xl text-amber-900">
                <span>Credit Given (Udhar):</span>
                <span>₹{(data?.creditSales || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Past Day Close History */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-2 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" />
              Recent Closings
            </h3>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 text-xs">
              {history.length === 0 ? (
                <p className="text-[11px] text-slate-400 py-3 text-center">No past day close records yet</p>
              ) : (
                history.map((h) => (
                  <div key={h._id} className="p-2 bg-slate-50 border border-slate-200 rounded-lg flex justify-between items-center text-[11px]">
                    <div>
                      <span className="font-bold text-slate-800">{new Date(h.date).toLocaleDateString()}</span>
                      <span className="text-slate-400 block">{h.totalBills} bills • by {h.closedBy}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-900">₹{h.actualCashCounted.toFixed(2)}</span>
                      <span className={`block font-semibold ${h.difference === 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        Diff: ₹{h.difference.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
