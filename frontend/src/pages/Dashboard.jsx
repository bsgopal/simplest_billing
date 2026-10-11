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

  // Active Tab: 'parties' (Party Details) or 'transactions' (Transaction Details)
  const [activeTab, setActiveTab] = useState('transactions');

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

      setMetrics({
        ...metricsRes.data,
        recentBills: billsRes.data?.bills || [],
        pendingCreditCustomers: customersRes.data || metricsRes.data?.pendingCreditCustomers || []
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
    const amount = cust.currentBalance || 0;
    const msg = `Dear ${cust.name}, this is a gentle reminder from ${storeName}. Your pending balance is ₹${amount.toFixed(2)}. Please make the payment at your earliest convenience. Thank you! 🙏`;
    const url = phone ? `https://wa.me/91${phone}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-28 md:pb-8 select-none">
      
      {/* 1. TOP STORE HEADER (Vyapar / Retail Mobile Format) */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-black border border-sky-200 shadow-2xs">
            <Store className="w-5 h-5" />
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

        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate('/settings')}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
            title="Shop Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button
            onClick={fetchMetrics}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. DUAL PILL TAB SWITCHER ([ Transaction Details ] vs [ Party Details ]) */}
      <div className="flex items-center gap-2 bg-slate-200/70 p-1.5 rounded-2xl border border-slate-300/60">
        <button
          type="button"
          onClick={() => setActiveTab('transactions')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all text-center ${
            activeTab === 'transactions'
              ? 'bg-white text-slate-950 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Transaction Details
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('parties')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all text-center ${
            activeTab === 'parties'
              ? 'bg-rose-500 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Party Details
        </button>
      </div>

      {/* 3. QUICK LINKS CARD (Four Round Icon Tiles) */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2.5 px-1">
          Quick Actions
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          <button
            onClick={() => navigate('/billing')}
            className="p-2.5 rounded-xl hover:bg-slate-50 transition flex flex-col items-center gap-1.5 group"
          >
            <div className="w-11 h-11 rounded-2xl bg-brand-500 text-slate-950 flex items-center justify-center font-bold shadow-xs group-hover:scale-105 transition">
              <Receipt className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-slate-800 leading-tight">New Bill</span>
          </button>

          <button
            onClick={() => navigate('/stock')}
            className="p-2.5 rounded-xl hover:bg-slate-50 transition flex flex-col items-center gap-1.5 group"
          >
            <div className="w-11 h-11 rounded-2xl bg-sky-100 text-sky-800 flex items-center justify-center font-bold border border-sky-200 group-hover:scale-105 transition">
              <Barcode className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-slate-800 leading-tight">Stock Inward</span>
          </button>

          <button
            onClick={() => navigate('/items')}
            className="p-2.5 rounded-xl hover:bg-slate-50 transition flex flex-col items-center gap-1.5 group"
          >
            <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold border border-amber-200 group-hover:scale-105 transition">
              <Package className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-slate-800 leading-tight">Products</span>
          </button>

          <button
            onClick={() => navigate('/customers')}
            className="p-2.5 rounded-xl hover:bg-slate-50 transition flex flex-col items-center gap-1.5 group"
          >
            <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-800 flex items-center justify-center font-bold border border-rose-200 group-hover:scale-105 transition">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-slate-800 leading-tight">Parties (Udhar)</span>
          </button>
        </div>
      </div>

      {/* 4. TAB CONTENT: PARTY DETAILS FEED */}
      {activeTab === 'parties' && (
        <div className="space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-black uppercase tracking-wider text-slate-600">
              Customer Udhar &amp; Balances ({metrics.pendingCreditCustomers?.length || 0})
            </span>
            <button
              onClick={() => navigate('/customers')}
              className="text-xs font-bold text-brand-800 hover:text-brand-900 flex items-center gap-1"
            >
              <span>View All Parties</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {metrics.pendingCreditCustomers?.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400">
                <Users className="w-8 h-8 mx-auto mb-1 text-slate-300" />
                <p className="text-xs font-bold">No outstanding customer credit pending ✓</p>
              </div>
            ) : (
              metrics.pendingCreditCustomers.map((cust) => (
                <div
                  key={cust._id}
                  className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between hover:border-slate-300 transition"
                >
                  <div>
                    <h3 className="text-sm font-black text-slate-900">{cust.name}</h3>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                      {cust.phone || 'No phone'} • {new Date(cust.updatedAt || Date.now()).toLocaleDateString([], { day: 'numeric', month: 'short' })}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm font-black text-emerald-700">
                        ₹ {Number(cust.currentBalance || 0).toFixed(2)}
                      </div>
                      <div className="text-[10px] font-bold text-emerald-600 uppercase">
                        You'll Get
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => sendWhatsAppReminder(cust)}
                      className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition flex items-center gap-1"
                      title="Send WhatsApp payment reminder"
                    >
                      <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="hidden sm:inline">WhatsApp</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 5. TAB CONTENT: TRANSACTION DETAILS FEED */}
      {activeTab === 'transactions' && (
        <div className="space-y-3 animate-in fade-in duration-150">
          {/* Today KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Today Sales</span>
              <div className="text-lg font-black text-slate-900 mt-0.5">₹{Number(metrics.todaySales || 0).toFixed(2)}</div>
            </div>
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Bills Created</span>
              <div className="text-lg font-black text-slate-900 mt-0.5">{metrics.billsCount || 0}</div>
            </div>
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Cash Collected</span>
              <div className="text-lg font-black text-emerald-700 mt-0.5">₹{Number(metrics.cashInHand || 0).toFixed(2)}</div>
            </div>
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase">UPI &amp; Online</span>
              <div className="text-lg font-black text-sky-700 mt-0.5">₹{Number(metrics.upiAndCard || 0).toFixed(2)}</div>
            </div>
          </div>

          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-black uppercase tracking-wider text-slate-600">
              Recent Sales Invoices
            </span>
            <button
              onClick={() => navigate('/bills')}
              className="text-xs font-bold text-brand-800 hover:text-brand-900 flex items-center gap-1"
            >
              <span>View All Bills</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {metrics.recentBills?.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400">
                <Receipt className="w-8 h-8 mx-auto mb-1 text-slate-300" />
                <p className="text-xs font-bold">No sales bills created yet today.</p>
              </div>
            ) : (
              metrics.recentBills.map((bill) => (
                <div
                  key={bill._id}
                  onClick={() => navigate('/bills')}
                  className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between hover:border-slate-300 cursor-pointer transition"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-black text-slate-900">#{bill.billNo}</span>
                      <span className="text-xs font-semibold text-slate-700">{bill.customer?.name || 'Walk-in'}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                      {new Date(bill.date).toLocaleDateString([], { day: 'numeric', month: 'short' })} • {new Date(bill.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {bill.items?.length || 0} items
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-black text-slate-900">
                      ₹ {Number(bill.grandTotal || 0).toFixed(2)}
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      {bill.payments?.credit > 0 ? 'Udhar' : bill.payments?.upi > 0 ? 'UPI' : 'Cash'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 6. FLOATING ACTION PILL BUTTON (Matching Vyapar User Screenshot) */}
      <div className="fixed bottom-16 sm:bottom-6 left-0 right-0 flex justify-center z-30 pointer-events-none">
        {activeTab === 'parties' ? (
          <button
            type="button"
            onClick={() => navigate('/customers')}
            className="pointer-events-auto px-6 py-3 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-black text-xs sm:text-sm shadow-xl flex items-center gap-2 active:scale-95 transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Add New Party</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => navigate('/billing')}
            className="pointer-events-auto px-6 py-3 rounded-full bg-brand-500 hover:bg-brand-600 text-slate-950 font-black text-xs sm:text-sm shadow-xl flex items-center gap-2 active:scale-95 transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Create Bill / POS</span>
          </button>
        )}
      </div>

    </div>
  );
}
