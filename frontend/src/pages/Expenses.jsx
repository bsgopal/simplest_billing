import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { TrendingDown, Plus, Trash2, Calendar, IndianRupee } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export default function Expenses() {
  const { toast, confirm } = useToast();
  const [expenses, setExpenses] = useState([]);
  const [totalToday, setTotalToday] = useState(0);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  // New expense form
  const [categoriesList, setCategoriesList] = useState([]);
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('Cash');

  const fetchCategories = async () => {
    try {
      const res = await axios.get('/api/expenses/categories');
      const cats = res.data || [];
      setCategoriesList(cats);
      if (cats.length > 0 && !category) {
        setCategory(cats[0]);
      }
    } catch (err) {
      // fallback
    }
  };

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/expenses?date=${selectedDate}`);
      setExpenses(res.data.expenses || []);
      setTotalToday(res.data.totalToday || 0);
    } catch (err) {
      console.error('Error fetching expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
    fetchCategories();
  }, [selectedDate]);

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;
    const finalCategory = customCategory.trim() || category.trim() || 'General';

    try {
      await axios.post('/api/expenses', {
        category: finalCategory,
        description,
        amount: parseFloat(amount),
        mode,
        date: selectedDate
      });
      setDescription('');
      setAmount('');
      setCustomCategory('');
      fetchExpenses();
      fetchCategories();
      toast.success('Expense added successfully');
    } catch (err) {
      toast.error('Error adding expense');
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Delete Expense',
      message: 'Are you sure you want to delete this expense entry?',
      confirmText: 'Delete',
      type: 'danger'
    });
    if (!ok) return;

    try {
      await axios.delete(`/api/expenses/${id}`);
      fetchExpenses();
      toast.success('Expense deleted');
    } catch (err) {
      toast.error('Error deleting expense');
    }
  };

  return (
    <div className="space-y-3">
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-red-500" />
            Daily Store Expenses
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Total on {selectedDate}: <strong className="text-red-600 font-black">₹{totalToday.toFixed(2)}</strong>
          </p>
        </div>

        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:border-brand-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Add Expense Form (5 cols) */}
        <form onSubmit={handleAddExpense} className="md:col-span-5 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <h3 className="font-extrabold text-slate-900 text-sm pb-2 border-b border-slate-100">+ Add Expense</h3>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Expense Category *</label>
            <input
              type="text"
              required
              list="expense-categories-list"
              value={customCategory || category}
              onChange={(e) => {
                setCustomCategory(e.target.value);
                setCategory(e.target.value);
              }}
              placeholder="e.g. Refreshments, Electricity, Delivery, Rent..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:border-brand-500"
            />
            <datalist id="expense-categories-list">
              {categoriesList.map((cat, idx) => (
                <option key={idx} value={cat} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Amount (₹) *</label>
            <input
              type="number"
              step="1"
              required
              placeholder="e.g. 50, 200..."
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 text-lg font-black bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-hidden focus:border-red-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Payment Mode</label>
            <div className="grid grid-cols-3 gap-1.5">
              {['Cash', 'UPI', 'Bank'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`py-1.5 rounded-lg text-xs font-bold transition ${
                    mode === m ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Description</label>
            <input
              type="text"
              placeholder="e.g. Vegetable load carriage, morning tea..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl text-xs transition shadow-xs"
          >
            Save Expense
          </button>
        </form>

        {/* Expenses List (7 cols) */}
        <div className="md:col-span-7 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <h3 className="font-extrabold text-slate-900 text-sm pb-2 border-b border-slate-100 mb-3">
            Recorded Expenses ({expenses.length})
          </h3>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {expenses.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center font-medium">No expenses logged for this date</p>
            ) : (
              expenses.map((exp) => (
                <div key={exp._id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900">{exp.category}</span>
                    {exp.description && <p className="text-[11px] text-slate-500 mt-0.5">{exp.description}</p>}
                    <span className="text-[10px] text-slate-400 block mt-0.5 font-semibold">Mode: {exp.mode}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-red-600 text-sm">₹{exp.amount.toFixed(2)}</span>
                    <button
                      onClick={() => handleDelete(exp._id)}
                      className="p-1 text-slate-400 hover:text-red-500 rounded transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
