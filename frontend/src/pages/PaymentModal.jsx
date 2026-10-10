import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useBilling } from '../context/BillingContext';
import { 
  CreditCard, 
  IndianRupee, 
  QrCode, 
  Coins, 
  Users, 
  Printer, 
  Save, 
  X,
  AlertCircle
} from 'lucide-react';

export default function PaymentModal({ onClose, onSuccess }) {
  const { cartItems, customer, billDiscount, notes, calculations } = useBilling();

  const grandTotal = calculations.grandTotal;

  // Payment Mode inputs
  const [cashAmount, setCashAmount] = useState(grandTotal);
  const [upiAmount, setUpiAmount] = useState(0);
  const [cardAmount, setCardAmount] = useState(0);
  const [creditAmount, setCreditAmount] = useState(0);

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Quick cash buttons helper
  const handleQuickCash = (amt) => {
    setCashAmount(amt);
    setUpiAmount(0);
    setCardAmount(0);
    setCreditAmount(0);
  };

  const totalPaid = (parseFloat(cashAmount) || 0) + (parseFloat(upiAmount) || 0) + (parseFloat(cardAmount) || 0) + (parseFloat(creditAmount) || 0);
  const changeToReturn = Math.max(0, ((parseFloat(cashAmount) || 0) + (parseFloat(upiAmount) || 0) + (parseFloat(cardAmount) || 0)) - (grandTotal - (parseFloat(creditAmount) || 0)));

  const handleFullCredit = () => {
    if (!customer?.customerId && (!customer?.name || customer.name === 'Walk-in Customer')) {
      setError('Please select or add a named customer to record Credit (Udhar).');
      return;
    }
    setCreditAmount(grandTotal);
    setCashAmount(0);
    setUpiAmount(0);
    setCardAmount(0);
    setError('');
  };

  const handleSubmit = async (shouldPrint = true) => {
    setError('');

    if (totalPaid < grandTotal - 0.5) {
      setError(`Payment received (₹${totalPaid.toFixed(2)}) is less than Grand Total (₹${grandTotal.toFixed(2)})`);
      return;
    }

    if (creditAmount > 0) {
      if (!customer?.customerId && (!customer?.name || customer.name === 'Walk-in Customer')) {
        setError('Credit (Udhar) sale requires a named customer (not Walk-in).');
        return;
      }
    }

    setSaving(true);
    try {
      const res = await axios.post('/api/bills', {
        items: cartItems,
        customer,
        billDiscount,
        payments: {
          cash: parseFloat(cashAmount) || 0,
          upi: parseFloat(upiAmount) || 0,
          card: parseFloat(cardAmount) || 0,
          credit: parseFloat(creditAmount) || 0
        },
        notes
      });

      onSuccess(res.data.bill);
    } catch (err) {
      setError(err.response?.data?.message || 'Error completing payment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-brand-600" />
              Complete Sale &amp; Payment
            </h3>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              Customer: <strong className="text-slate-800">{customer?.name || 'Walk-in'}</strong>
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Big Grand Total Display */}
        <div className="my-3 p-3.5 bg-slate-900 text-white rounded-2xl flex items-center justify-between">
          <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Total Due:</span>
          <span className="text-2xl sm:text-3xl font-black text-brand-400">
            ₹{grandTotal.toFixed(2)}
          </span>
        </div>

        {error && (
          <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-600 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Payment Modes Inputs Grid */}
        <div className="space-y-2.5">
          {/* Cash Input */}
          <div className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center gap-2 text-xs font-extrabold text-slate-800">
              <Coins className="w-4 h-4 text-emerald-600" />
              <span>Cash:</span>
            </div>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
              <input
                type="number"
                min="0"
                step="1"
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                className="w-28 pl-6 pr-2 py-1.5 text-right font-black text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:border-brand-500"
              />
            </div>
          </div>

          {/* UPI Input */}
          <div className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center gap-2 text-xs font-extrabold text-slate-800">
              <QrCode className="w-4 h-4 text-blue-600" />
              <span>UPI / QR:</span>
            </div>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
              <input
                type="number"
                min="0"
                step="1"
                value={upiAmount}
                onChange={(e) => setUpiAmount(e.target.value)}
                className="w-28 pl-6 pr-2 py-1.5 text-right font-black text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:border-brand-500"
              />
            </div>
          </div>

          {/* Card Input */}
          <div className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center gap-2 text-xs font-extrabold text-slate-800">
              <CreditCard className="w-4 h-4 text-purple-600" />
              <span>Card / POS:</span>
            </div>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
              <input
                type="number"
                min="0"
                step="1"
                value={cardAmount}
                onChange={(e) => setCardAmount(e.target.value)}
                className="w-28 pl-6 pr-2 py-1.5 text-right font-black text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:border-brand-500"
              />
            </div>
          </div>

          {/* Credit (Udhar) Input */}
          <div className="flex items-center justify-between p-2 bg-amber-50/60 border border-amber-200 rounded-xl">
            <div className="flex items-center gap-2 text-xs font-extrabold text-amber-900">
              <Users className="w-4 h-4 text-amber-700" />
              <span>Credit (Udhar):</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleFullCredit}
                className="px-2 py-1 text-[10px] font-black uppercase tracking-wider bg-amber-200 hover:bg-amber-300 text-amber-900 rounded-md transition"
              >
                Full Due
              </button>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                  className="w-24 pl-6 pr-2 py-1.5 text-right font-black text-sm text-amber-950 bg-white border border-amber-300 rounded-lg focus:outline-hidden"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Cash Buttons */}
        <div className="mt-3 pt-2 border-t border-slate-100">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">
            Quick Cash Received:
          </span>
          <div className="grid grid-cols-5 gap-1.5">
            {[grandTotal, 50, 100, 200, 500].map((amt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleQuickCash(amt)}
                className="py-1.5 bg-slate-100 hover:bg-brand-100 active:scale-95 text-slate-900 rounded-lg text-xs font-bold transition border border-slate-200"
              >
                {idx === 0 ? 'Exact' : `₹${amt}`}
              </button>
            ))}
          </div>
        </div>

        {/* Summary Indicators */}
        <div className="mt-3 p-3 bg-slate-50 rounded-xl space-y-1 text-xs">
          <div className="flex justify-between font-bold text-slate-600">
            <span>Total Received:</span>
            <span>₹{totalPaid.toFixed(2)}</span>
          </div>
          {changeToReturn > 0 && (
            <div className="flex justify-between font-black text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
              <span>Change to Return:</span>
              <span>₹{changeToReturn.toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={saving}
            className="py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
          >
            <Save className="w-4 h-4" />
            <span>Save Bill</span>
          </button>

          <button
            type="button"
            onClick={() => handleSubmit(true)}
            disabled={saving}
            className="py-3 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-sm active:scale-98"
          >
            <Printer className="w-4 h-4" />
            <span>Save &amp; Print</span>
          </button>
        </div>
      </div>
    </div>
  );
}
