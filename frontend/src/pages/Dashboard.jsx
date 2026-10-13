import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { 
  PlusCircle, 
  Receipt, 
  Package, 
  Users, 
  ShoppingBag, 
  TrendingDown, 
  BarChart3, 
  SunMoon, 
  AlertTriangle, 
  CreditCard, 
  Wallet, 
  ArrowUpRight,
  TrendingUp,
  RefreshCw,
  Barcode,
  Bell,
  Settings,
  Store,
  ChevronRight,
  Share2,
  FileText,
  UserPlus,
  ArrowRight
} from 'lucide-react';

export default function Dashboard() {
  const { user, shop } = useAuth();
  const navigate = useNavigate();

  // Mobile Tab toggle: 'transactions' vs 'parties'
  const [mobileTab, setMobileTab] = useState('transactions');

  const [metrics, setMetrics] = useState({
    todaySales: 0,
    billsCount: 0,
    cashInHand: 0,
    upiAndCard: 0,
    creditGiven: 0,
    expensesTotal: 0,
    lowStockItems: [],
    pendingCreditCustomers: [],
    recentBills: []
  });
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const [metricsRes, billsRes, customersRes] = await Promise.all([
        axios.get('/api/reports/dashboard'),
        axios.get('/api/bills?limit=10'),
        axios.get('/api/customers?dueOnly=true')
      ]);

      const rawPending = customersRes.data?.customers 
        || (Array.isArray(customersRes.data) ? customersRes.data : null) 
        || metricsRes.data?.pendingCreditCustomers 
        || [];
      const pendingList = Array.isArray(rawPending) ? rawPending : [];
      const totalUdharVal = customersRes.data?.totalPending !== undefined 
        ? Number(customersRes.data.totalPending) 
        : pendingList.reduce((sum, c) => sum + (Number(c.balanceDue || c.currentBalance) || 0), 0);

      setMetrics({
        ...metricsRes.data,
        recentBills: Array.isArray(billsRes.data?.bills) ? billsRes.data.bills : (Array.isArray(billsRes.data) ? billsRes.data : []),
        pendingCreditCustomers: pendingList,
        totalUdhar: totalUdharVal
      });
    } catch (err) {
      console.error('Error fetching dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const storeName = shop?.shopName || 'GOPALAKRISHNAN Arul';

  const sendWhatsAppReminder = (cust) => {
    const phone = cust.phone?.replace(/[^0-9]/g, '');
    const amount = cust.balanceDue || cust.currentBalance || 0;
    const msg = `Dear ${cust.name}, this is a gentle reminder from ${storeName}. Your pending balance is ₹${Number(amount).toFixed(2)}. Please make the payment at your earliest convenience. Thank you! 🙏`;
    const url = phone ? `https://wa.me/91${phone}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const pendingList = Array.isArray(metrics.pendingCreditCustomers) ? metrics.pendingCreditCustomers : [];
  const totalUdhar = metrics.totalUdhar !== undefined
    ? Number(metrics.totalUdhar)
    : pendingList.reduce((sum, c) => sum + (Number(c.balanceDue || c.currentBalance) || 0), 0);

  return (
    <div className="w-full space-y-3 pb-16 md:pb-4 select-none">
      
      {/* 1. TOP HEADER & QUICK ACTION BAR (Compact & Space-Efficient) */}
      <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Store Info */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-brand-50 text-brand-800 flex items-center justify-center font-black border border-brand-200 shrink-0">
            <Store className="w-5 h-5 text-brand-700" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight">
              {storeName}
            </h1>
            <p className="text-[11px] text-slate-500 font-semibold flex items-center gap-1.5 mt-0.5">
              <span>{user?.name || 'Owner'}</span>
              <span>•</span>
              <span className="text-emerald-700 font-bold">POS Ready</span>
            </p>
          </div>
        </div>

        {/* Compact Quick Actions */}
        <div className="flex items-center flex-wrap gap-1.5">
          <button
            onClick={() => navigate('/billing')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-500 hover:bg-brand-400 text-slate-950 font-black rounded-xl text-xs transition shadow-2xs active:scale-95 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ New Bill</span>
          </button>

          <button
            onClick={() => navigate('/stock')}
            className="flex items-center gap-1.5 px-3 py-2 bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 font-bold rounded-xl text-xs transition active:scale-95 cursor-pointer"
          >
            <Barcode className="w-4 h-4 text-sky-700" />
            <span>Stock Inward</span>
          </button>

          <button
            onClick={() => navigate('/items')}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold rounded-xl text-xs transition active:scale-95 cursor-pointer"
          >
            <Package className="w-4 h-4 text-amber-700" />
            <span>Products</span>
          </button>

          <button
            onClick={() => navigate('/customers')}
            className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200 font-bold rounded-xl text-xs transition active:scale-95 cursor-pointer"
          >
            <Users className="w-4 h-4 text-rose-700" />
            <span>Parties</span>
          </button>

          <div className="flex items-center gap-1 ml-auto md:ml-1 border-l border-slate-200 pl-1.5">
            <button
              onClick={() => navigate('/settings')}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              title="Shop Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={fetchMetrics}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. KEY METRICS STRIP (Compact 4-Column Grid) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Today's Sales</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {metrics.billsCount || 0} bills
            </span>
          </div>
          <div className="text-lg sm:text-xl font-black font-mono text-slate-900 mt-1">
            ₹{Number(metrics.todaySales || 0).toFixed(2)}
          </div>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cash Collected</span>
            <Wallet className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-lg sm:text-xl font-black font-mono text-emerald-700 mt-1">
            ₹{Number(metrics.cashInHand || 0).toFixed(2)}
          </div>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">UPI &amp; Online</span>
            <CreditCard className="w-3.5 h-3.5 text-sky-600" />
          </div>
          <div className="text-lg sm:text-xl font-black font-mono text-sky-700 mt-1">
            ₹{Number(metrics.upiAndCard || 0).toFixed(2)}
          </div>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Customer Udhar</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              {metrics.pendingCreditCustomers?.length || 0} pending
            </span>
          </div>
          <div className="text-lg sm:text-xl font-black font-mono text-rose-600 mt-1">
            ₹{totalUdhar > 0 ? totalUdhar.toFixed(2) : Number(metrics.creditGiven || 0).toFixed(2)}
          </div>
        </div>
      </div>

      {/* MOBILE-ONLY TAB TOGGLE (Only on small screens) */}
      <div className="lg:hidden flex items-center gap-1.5 bg-slate-200/70 p-1 rounded-xl">
        <button
          type="button"
          onClick={() => setMobileTab('transactions')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-black transition ${
            mobileTab === 'transactions'
              ? 'bg-white text-slate-950 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Recent Invoices ({metrics.recentBills?.length || 0})
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('parties')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-black transition ${
            mobileTab === 'parties'
              ? 'bg-rose-500 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Customer Udhar ({metrics.pendingCreditCustomers?.length || 0})
        </button>
      </div>

      {/* 3. MAIN DASHBOARD SPLIT: INVOICES (8 Cols) + PARTIES/SHORTCUTS (4 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
        
        {/* LEFT COLUMN: Recent Sales Invoices (lg:col-span-8) */}
        <div className={`lg:col-span-8 space-y-2.5 ${mobileTab === 'parties' ? 'hidden lg:block' : 'block'}`}>
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-brand-600" />
                Recent Sales Invoices
              </h2>
              <button
                onClick={() => navigate('/bills')}
                className="text-xs font-bold text-brand-800 hover:text-brand-900 flex items-center gap-1 cursor-pointer"
              >
                <span>View All Invoices</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1.5">
              {metrics.recentBills?.length === 0 ? (
                <div className="py-10 text-center text-slate-400 space-y-1.5">
                  <Receipt className="w-8 h-8 mx-auto text-slate-300 stroke-1" />
                  <p className="text-xs font-bold text-slate-600">No sales bills created today yet.</p>
                  <p className="text-[11px] text-slate-400">Click "+ New Bill" above to start selling.</p>
                </div>
              ) : (
                metrics.recentBills.map((bill) => (
                  <div
                    key={bill._id}
                    onClick={() => navigate('/bills')}
                    className="p-2.5 sm:p-3 rounded-xl border border-slate-100 hover:border-slate-300 hover:bg-slate-50/70 flex items-center justify-between cursor-pointer transition"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-mono font-black text-xs shrink-0">
                        #{bill.billNo}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-black text-slate-900 truncate">
                          {bill.customer?.name || 'Walk-in Customer'}
                        </h4>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {new Date(bill.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {bill.items?.length || 0} items
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm font-black font-mono text-slate-900">
                        ₹{Number(bill.grandTotal || 0).toFixed(2)}
                      </div>
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase ${
                        bill.payments?.credit > 0
                          ? 'bg-rose-100 text-rose-700'
                          : bill.payments?.upi > 0
                          ? 'bg-sky-100 text-sky-700'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {bill.payments?.credit > 0 ? 'Udhar' : bill.payments?.upi > 0 ? 'UPI' : 'Cash'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Customer Udhar & Fast Navigation (lg:col-span-4) */}
        <div className={`lg:col-span-4 space-y-3 ${mobileTab === 'transactions' ? 'hidden lg:block' : 'block'}`}>
          {/* Customer Udhar Card */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-xs font-black uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-rose-600" />
                Customer Udhar ({metrics.pendingCreditCustomers?.length || 0})
              </h2>
              <button
                onClick={() => navigate('/customers')}
                className="text-xs font-bold text-rose-700 hover:text-rose-900 flex items-center gap-1 cursor-pointer"
              >
                <span>All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1.5">
              {metrics.pendingCreditCustomers?.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <Users className="w-7 h-7 mx-auto mb-1 text-slate-300 stroke-1" />
                  <p className="text-xs font-bold text-slate-600">All balances cleared ✓</p>
                  <p className="text-[11px] text-slate-400">No pending customer credit.</p>
                </div>
              ) : (
                metrics.pendingCreditCustomers.slice(0, 5).map((cust) => (
                  <div
                    key={cust._id}
                    className="p-2.5 rounded-xl border border-slate-100 flex items-center justify-between gap-2 hover:bg-slate-50 transition"
                  >
                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-slate-900 truncate">{cust.name}</h4>
                      <p className="text-[10px] text-slate-400 truncate">{cust.phone || 'No phone'}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <span className="text-xs font-black font-mono text-rose-600 block">
                          ₹{Number(cust.balanceDue || cust.currentBalance || 0).toFixed(2)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => sendWhatsAppReminder(cust)}
                        className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition"
                        title="Send WhatsApp payment reminder"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Management Shortcuts */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block px-1">
              Shortcuts
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => navigate('/day-close')}
                className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold rounded-xl border border-slate-200 flex items-center gap-2 transition text-left cursor-pointer"
              >
                <SunMoon className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Day Close</span>
              </button>

              <button
                onClick={() => navigate('/reports')}
                className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold rounded-xl border border-slate-200 flex items-center gap-2 transition text-left cursor-pointer"
              >
                <BarChart3 className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Reports</span>
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* MOBILE-ONLY FLOATING BUTTON (Hidden on laptops/desktops so it never blocks content) */}
      <div className="md:hidden fixed bottom-16 left-0 right-0 flex justify-center z-30 pointer-events-none">
        <button
          type="button"
          onClick={() => navigate('/billing')}
          className="pointer-events-auto px-5 py-2.5 rounded-full bg-brand-500 hover:bg-brand-400 text-slate-950 font-black text-xs shadow-xl flex items-center gap-2 active:scale-95 transition"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ Create Bill / POS</span>
        </button>
      </div>

    </div>
  );
}
