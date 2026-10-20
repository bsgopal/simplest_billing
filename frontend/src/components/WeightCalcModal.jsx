import React, { useState, useEffect } from 'react';
import { Scale, IndianRupee, X } from 'lucide-react';

export default function WeightCalcModal({ item, onAdd, onClose }) {
  const [entryMode, setEntryMode] = useState('weight'); // 'weight' or 'amount'
  const [weightValue, setWeightValue] = useState(1);
  const [amountValue, setAmountValue] = useState(item?.sellingPrice || 0);

  const rate = item?.sellingPrice || 0;

  useEffect(() => {
    if (entryMode === 'weight') {
      setAmountValue(Math.round((weightValue * rate) * 100) / 100);
    }
  }, [weightValue, rate, entryMode]);

  useEffect(() => {
    if (entryMode === 'amount' && rate > 0) {
      setWeightValue(Math.round((amountValue / rate) * 1000) / 1000);
    }
  }, [amountValue, rate, entryMode]);

  const handleConfirm = () => {
    const finalQty = parseFloat(weightValue) || 1;
    onAdd(item, finalQty, rate);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base">{item?.name}</h3>
            <p className="text-xs text-brand-600 font-bold">
              Rate: ₹{rate.toFixed(2)} / {item?.unit || 'kg'}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toggle Mode: Weight vs Amount */}
        <div className="grid grid-cols-2 gap-2 mt-4 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setEntryMode('weight')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-extrabold transition ${
              entryMode === 'weight'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Scale className="w-4 h-4 text-brand-600" />
            <span>By Weight ({item?.unit || 'kg'})</span>
          </button>
          <button
            onClick={() => setEntryMode('amount')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-extrabold transition ${
              entryMode === 'amount'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <IndianRupee className="w-4 h-4 text-brand-600" />
            <span>By Amount (₹)</span>
          </button>
        </div>

        {/* Main Input Display */}
        <div className="mt-4">
          {entryMode === 'weight' ? (
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">
                Quantity in {item?.unit || 'kg'}:
              </label>
              <input
                type="number"
                step="0.05"
                min="0.001"
                value={weightValue}
                onChange={(e) => setWeightValue(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2.5 text-2xl font-black text-center text-slate-900 bg-slate-50 border-2 border-brand-500 rounded-xl focus:outline-hidden"
                autoFocus
              />
              <p className="text-xs text-center text-slate-500 font-bold mt-1.5">
                Calculated Price: <span className="text-brand-700 font-black">₹{amountValue.toFixed(2)}</span>
              </p>

              {/* Quick Weight Preset Chips */}
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 mt-3">
                {[0.05, 0.1, 0.25, 0.5, 1, 2, 5].map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setWeightValue(w)}
                    className={`py-1.5 rounded-lg text-xs font-black transition border ${
                      weightValue === w
                        ? 'bg-brand-500 text-slate-950 border-brand-600 shadow-2xs'
                        : 'bg-slate-100 hover:bg-brand-50 text-slate-800 border-slate-200'
                    }`}
                  >
                    {w < 1 ? `${Math.round(w * 1000)}g` : `${w} kg`}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">
                Amount to spend (₹):
              </label>
              <input
                type="number"
                step="1"
                min="1"
                value={amountValue}
                onChange={(e) => setAmountValue(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2.5 text-2xl font-black text-center text-slate-900 bg-slate-50 border-2 border-brand-500 rounded-xl focus:outline-hidden"
                autoFocus
              />
              <p className="text-xs text-center text-slate-500 font-bold mt-1.5">
                Calculated Qty: <span className="text-brand-700 font-black">{weightValue.toFixed(3)} {item?.unit || 'kg'}</span>
              </p>

              {/* Quick Amount Chips */}
              <div className="grid grid-cols-4 gap-1.5 mt-3">
                {[10, 20, 50, 100].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAmountValue(amt)}
                    className="py-1.5 bg-slate-100 hover:bg-brand-100 text-slate-800 hover:text-brand-900 rounded-lg text-xs font-bold transition"
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            onClick={onClose}
            className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="py-2.5 bg-brand-500 hover:bg-brand-600 text-slate-950 font-black rounded-xl text-xs transition shadow-sm"
          >
            Add to Bill
          </button>
        </div>
      </div>
    </div>
  );
}
