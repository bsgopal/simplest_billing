import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Users, 
  Plus, 
  Search, 
  Share2, 
  Receipt, 
  Coins, 
  X,
  CreditCard,
  Calendar
} from 'lucide-react';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dueOnly, setDueOnly] = useState(false);
  const [totalPending, setTotalPending] = useState(0);

  // Add/Edit customer modal
  const [customerModal, setCustomerModal] = useState(false);
  const [editingCust, setEditingCust] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    creditLimit: 0,
    openingBalance: 0
  });

  // Ledger modal
  const [ledgerCustomer, setLedgerCustomer] = useState(null);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // Receive payment modal
  const [payModalCustomer, setPayModalCustomer] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('Cash');
  const [payNote, setPayNote] = useState('');

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/customers?search=${search}&dueOnly=${dueOnly}`);
      setCustomers(res.data.customers || []);
      setTotalPending(res.data.totalPending || 0);
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [dueOnly]);

  const handleOpenLedger = async (cust) => {
    setLedgerCustomer(cust);
    setLedgerLoading(true);
    try {
      const res = await axios.get(`/api/customers/${cust._id}/ledger`);
      setLedgerEntries(res.data.ledger || []);
    } catch (err) {
      alert('Error fetching ledger');
    } finally {
      setLedgerLoading(false);
    }
  };

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/customers', {
        id: editingCust?._id,
        ...formData
      });
      setCustomerModal(false);
      fetchCustomers();
    } catch (err) {
      alert('Error saving customer');
    }
  };

  const handleReceivePayment = async (e) => {
    e.preventDefault();
    if (!payAmount || parseFloat(payAmount) <= 0) return;

    try {
      await axios.post(`/api/customers/${payModalCustomer._id}/receive-payment`, {
        amount: parseFloat(payAmount),
        mode: payMode,
        note: payNote
      });
      setPayModalCustomer(null);
      setPayAmount('');
      setPayNote('');
      fetchCustomers();
      if (ledgerCustomer && ledgerCustomer._id === payModalCustomer._id) {
        handleOpenLedger(payModalCustomer);
      }
    } catch (err) {
      alert('Error recording payment');
    }
  };

  const handleWhatsAppReminder = async (cust) => {
    try {
      const res = await axios.get(`/api/customers/${cust._id}/reminder-message`);
      if (res.data.whatsappUrl) {
        window.open(res.data.whatsappUrl, '_blank');
      } else {
        alert(res.data.message);
      }
    } catch (err) {
      alert('Error generating reminder');
    }
  };

  return (
    <div className="space-y-3">
      {/* Top Banner */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-600" />
            Customers &amp; Udhar Credit
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Total Outstanding Balance: <strong className="text-amber-700 text-sm">₹{totalPending.toFixed(2)}</strong>
          </p>
        </div>

        <button
          onClick={() => {
            setEditingCust(null);
            setFormData({ name: '', phone: '', address: '', creditLimit: 0, openingBalance: 0 });
            setCustomerModal(true);
          }}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-slate-950 font-black rounded-xl text-xs transition shadow-xs active:scale-98"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Customer</span>
        </button>
      </div>

      {/* Filter Strip */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center gap-2.5">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search customers by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchCustomers()}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:border-brand-500"
          />
        </div>

        <button
          onClick={() => setDueOnly(!dueOnly)}
          className={`px-3 py-2 rounded-xl text-xs font-bold transition w-full sm:w-auto text-center border ${
            dueOnly
              ? 'bg-amber-100 border-amber-300 text-amber-900'
              : 'bg-slate-50 border-slate-300 text-slate-600 hover:bg-slate-100'
          }`}
        >
          {dueOnly ? 'Showing Due Only ✓' : 'Show All Customers'}
        </button>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3">Customer Name</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3 text-right">Balance Due (Udhar)</th>
                <th className="px-4 py-3 text-right">Credit Limit</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan="5" className="text-center py-10 text-slate-400 font-bold">
                    Loading customer directory...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-12 text-slate-400 font-bold">
                    No customers found
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3 font-bold text-slate-900">{c.name}</td>
                    <td className="px-4 py-3 text-slate-600">{c.phone || '—'}</td>
                    <td className="px-4 py-3 text-right font-black text-sm">
                      <span className={c.balanceDue > 0 ? 'text-amber-700' : 'text-slate-400'}>
                        ₹{(c.balanceDue || 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500 font-bold">
                      {c.creditLimit > 0 ? `₹${c.creditLimit}` : 'No limit'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenLedger(c)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg text-[10px] transition"
                        >
                          Ledger
                        </button>
                        {c.balanceDue > 0 && (
                          <>
                            <button
                              onClick={() => {
                                setPayModalCustomer(c);
                                setPayAmount(c.balanceDue);
                              }}
                              className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold rounded-lg text-[10px] transition"
                            >
                              Pay
                            </button>
                            <button
                              onClick={() => handleWhatsAppReminder(c)}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                              title="Send WhatsApp payment reminder"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>
                          </>
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

      {/* Ledger Modal */}
      {ledgerCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Ledger: {ledgerCustomer.name}</h3>
                <p className="text-xs text-amber-700 font-bold mt-0.5">
                  Current Due: ₹{(ledgerCustomer.balanceDue || 0).toFixed(2)}
                </p>
              </div>
              <button onClick={() => setLedgerCustomer(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-3 max-h-72 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="p-2">Date</th>
                    <th className="p-2">Particulars</th>
                    <th className="p-2 text-right">Debit (+)</th>
                    <th className="p-2 text-right">Credit (−)</th>
                    <th className="p-2 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {ledgerEntries.map((e, idx) => (
                    <tr key={idx}>
                      <td className="p-2 text-[10px] text-slate-500">{new Date(e.date).toLocaleDateString()}</td>
                      <td className="p-2 font-bold text-slate-800">{e.particulars}</td>
                      <td className="p-2 text-right text-red-600 font-bold">{e.debit > 0 ? `₹${e.debit.toFixed(2)}` : '—'}</td>
                      <td className="p-2 text-right text-emerald-600 font-bold">{e.credit > 0 ? `₹${e.credit.toFixed(2)}` : '—'}</td>
                      <td className="p-2 text-right font-black text-slate-900">₹{e.balance.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-between">
              <button
                onClick={() => handleWhatsAppReminder(ledgerCustomer)}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>WhatsApp Statement</span>
              </button>
              <button
                onClick={() => setLedgerCustomer(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receive Payment Modal */}
      {payModalCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleReceivePayment} className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <h3 className="font-extrabold text-slate-900 text-base mb-1">Receive Udhar Payment</h3>
            <p className="text-xs text-slate-500 mb-3">
              Customer: <strong className="text-slate-800">{payModalCustomer.name}</strong> • Due: <strong className="text-amber-700">₹{(payModalCustomer.balanceDue || 0).toFixed(2)}</strong>
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Amount Received (₹) *</label>
                <input
                  type="number"
                  step="1"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3 py-2.5 text-xl font-black bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-hidden focus:border-brand-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Payment Mode</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {['Cash', 'UPI', 'Card'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPayMode(m)}
                      className={`py-2 rounded-xl text-xs font-extrabold transition ${
                        payMode === m ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Note (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. GPay reference..."
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPayModalCustomer(null)}
                className="py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="py-2.5 bg-brand-500 hover:bg-brand-600 text-slate-950 font-black rounded-xl text-xs"
              >
                Save Payment
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add / Edit Customer Modal */}
      {customerModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleSaveCustomer} className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <h3 className="font-extrabold text-slate-900 text-base mb-3">Add Customer Profile</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Customer Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:border-brand-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Mobile Number</label>
                <input
                  type="tel"
                  maxLength="10"
                  placeholder="10-digit number"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Credit Limit (₹)</label>
                <input
                  type="number"
                  placeholder="0 = unlimited"
                  value={formData.creditLimit}
                  onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCustomerModal(false)}
                className="py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="py-2.5 bg-brand-500 text-slate-950 font-black rounded-xl text-xs"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
