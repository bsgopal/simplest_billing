import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShoppingBag, Plus, Trash2, Check, Search, Calendar, Truck, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PurchaseEntry() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [supplierId, setSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  
  // Purchase items
  const [purchaseItems, setPurchaseItems] = useState([
    { itemId: '', itemName: '', quantity: 1, unit: 'PCS', costPrice: 0, sellPrice: 0, gstRate: 0, total: 0 }
  ]);

  // Payment State
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('CASH');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [suppRes, itemsRes] = await Promise.all([
        axios.get('/api/suppliers'),
        axios.get('/api/items')
      ]);
      setSuppliers(suppRes.data.suppliers || suppRes.data || []);
      setItems(itemsRes.data.items || itemsRes.data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleItemSelect = (index, selectedItemId) => {
    const item = items.find(i => i._id === selectedItemId);
    const updated = [...purchaseItems];
    if (item) {
      updated[index] = {
        ...updated[index],
        itemId: item._id,
        itemName: item.name,
        unit: item.unit || 'PCS',
        costPrice: item.costPrice || 0,
        sellPrice: item.sellPrice || 0,
        gstRate: item.gstRate || 0,
        total: (updated[index].quantity || 1) * (item.costPrice || 0)
      };
    } else {
      updated[index] = {
        ...updated[index],
        itemId: '',
        itemName: '',
        costPrice: 0,
        sellPrice: 0,
        total: 0
      };
    }
    setPurchaseItems(updated);
  };

  const handleRowChange = (index, field, value) => {
    const updated = [...purchaseItems];
    updated[index][field] = value;
    if (field === 'quantity' || field === 'costPrice') {
      const qty = field === 'quantity' ? Number(value) : Number(updated[index].quantity);
      const cost = field === 'costPrice' ? Number(value) : Number(updated[index].costPrice);
      updated[index].total = Number((qty * cost).toFixed(2));
    }
    setPurchaseItems(updated);
  };

  const addRow = () => {
    setPurchaseItems([
      ...purchaseItems,
      { itemId: '', itemName: '', quantity: 1, unit: 'PCS', costPrice: 0, sellPrice: 0, gstRate: 0, total: 0 }
    ]);
  };

  const removeRow = (index) => {
    if (purchaseItems.length === 1) return;
    setPurchaseItems(purchaseItems.filter((_, i) => i !== index));
  };

  const subtotal = purchaseItems.reduce((acc, row) => acc + (row.total || 0), 0);
  const totalAmount = subtotal; // can add taxes/freight if needed
  const balanceDue = Math.max(0, totalAmount - (Number(paidAmount) || 0));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!supplierId) {
      alert('Please select a supplier');
      return;
    }
    const validItems = purchaseItems.filter(i => i.itemId && i.quantity > 0);
    if (validItems.length === 0) {
      alert('Please select at least one item with quantity greater than 0');
      return;
    }

    try {
      setSubmitting(true);
      await axios.post('/api/purchases', {
        supplierId,
        invoiceNumber,
        purchaseDate,
        items: validItems,
        totalAmount,
        paidAmount: Number(paidAmount) || 0,
        paymentMode,
        balanceDue,
        notes
      });
      alert('Purchase entry saved successfully! Stock updated.');
      navigate('/items');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save purchase entry');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <ShoppingBag className="w-6 h-6 text-brand-600" />
              New Purchase Entry
            </h1>
            <p className="text-sm text-slate-500">Record stock received from suppliers to update inventory &amp; prices</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Top Info Grid */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Select Supplier *</label>
            <div className="relative">
              <select
                required
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold focus:outline-none focus:border-brand-500 focus:bg-white appearance-none"
              >
                <option value="">-- Choose Supplier --</option>
                {suppliers.map(s => (
                  <option key={s._id} value={s._id}>
                    {s.name} {s.companyName ? `(${s.companyName})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Supplier Invoice / Bill No.</label>
            <input
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="e.g. INV-9812"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Purchase Date</label>
            <input
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-brand-500 focus:bg-white"
            />
          </div>
        </div>

        {/* Purchase Items Table */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-black text-slate-900">Stock Items</h2>
            <button
              type="button"
              onClick={addRow}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-800 border border-brand-300 rounded-xl text-sm font-bold transition"
            >
              <Plus className="w-4 h-4" />
              Add Item Row
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-xs uppercase font-extrabold bg-slate-50/70">
                  <th className="py-3 px-3">Item</th>
                  <th className="py-3 px-3 w-28">Quantity</th>
                  <th className="py-3 px-3 w-32">Cost Price (₹)</th>
                  <th className="py-3 px-3 w-32">New Sell (₹)</th>
                  <th className="py-3 px-3 w-32 text-right">Row Total</th>
                  <th className="py-3 px-3 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchaseItems.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-3">
                      <select
                        required
                        value={row.itemId}
                        onChange={(e) => handleItemSelect(idx, e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:border-brand-500 focus:bg-white font-medium"
                      >
                        <option value="">-- Select Item --</option>
                        {items.map(it => (
                          <option key={it._id} value={it._id}>
                            {it.name} ({it.unit}) - Curr: ₹{it.sellPrice}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="number"
                        min="0.01"
                        step="any"
                        value={row.quantity}
                        onChange={(e) => handleRowChange(idx, 'quantity', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono text-center focus:outline-none focus:border-brand-500 focus:bg-white font-bold"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.costPrice}
                        onChange={(e) => handleRowChange(idx, 'costPrice', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono text-center focus:outline-none focus:border-brand-500 focus:bg-white"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.sellPrice}
                        onChange={(e) => handleRowChange(idx, 'sellPrice', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono text-center focus:outline-none focus:border-brand-500 focus:bg-white font-bold text-brand-700"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      ₹{row.total.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => removeRow(idx)}
                        disabled={purchaseItems.length === 1}
                        className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals & Payment Summary */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Remarks / Notes</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Delivery via tempo, driver Mohan..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:bg-white"
            />
          </div>

          <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center text-slate-700 font-bold">
              <span>Invoice Total:</span>
              <span className="text-xl font-black text-slate-900">₹{totalAmount.toFixed(2)}</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs uppercase text-slate-500 font-bold whitespace-nowrap">Amount Paid:</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono text-right focus:outline-none focus:border-brand-500 font-bold"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs uppercase text-slate-500 font-bold">Mode:</span>
              <div className="flex gap-2 flex-1">
                {['CASH', 'UPI', 'CREDIT'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPaymentMode(m)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition border ${
                      paymentMode === m
                        ? 'bg-brand-500 text-slate-950 border-brand-500 font-black'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
              <span className="text-sm font-bold text-slate-500">Balance Added to Payable:</span>
              <span className={`text-base font-bold ${balanceDue > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                ₹{balanceDue.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-8 py-3 bg-brand-500 hover:bg-brand-600 text-slate-950 rounded-xl font-black transition shadow-xs active:scale-98 disabled:opacity-50"
          >
            <Check className="w-5 h-5" />
            {submitting ? 'Saving...' : 'Confirm & Receive Stock'}
          </button>
        </div>
      </form>
    </div>
  );
}
