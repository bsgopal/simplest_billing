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
  Barcode
} from 'lucide-react';
import BarcodeStockModal from '../components/BarcodeStockModal';

export default function Dashboard() {
  const { user, shop } = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState({
    todaySales: 0,
    billsCount: 0,
    cashInHand: 0,
    upiAndCard: 0,
    creditGiven: 0,
    expensesTotal: 0,
    lowStockItems: [],
    pendingCreditCustomers: []
  });
  const [loading, setLoading] = useState(true);
  const [barcodeStockOpen, setBarcodeStockOpen] = useState(false);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/reports/dashboard');
      setMetrics(res.data);
    } catch (err) {
      console.error('Error fetching dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  return (
    <div className="p-3 sm:p-5 max-w-7xl mx-auto space-y-4 sm:space-y-6 pb-20 md:pb-6">
      {/* Top Greeting & Fast Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">
            Welcome back, {user?.name}! 👋
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            {shop?.shopName} • Quick Store Overview
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchMetrics}
            className="p-2 sm:px-3 sm:py-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            title="Refresh statistics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          
          <button
            onClick={() => setBarcodeStockOpen(true)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 bg-brand-50 hover:bg-brand-100 text-brand-900 border border-brand-300 font-extrabold rounded-xl text-xs sm:text-sm transition shadow-2xs active:scale-98"
            title="Add or update stock using barcode scan"
          >
            <Barcode className="w-4 h-4 text-brand-600" />
            <span className="hidden sm:inline">+ Barcode Stock</span>
            <span className="sm:hidden">Stock</span>
          </button>

          <button
            onClick={() => navigate('/billing')}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 bg-brand-500 hover:bg-brand-600 text-slate-950 font-black rounded-xl text-xs sm:text-sm transition shadow-md active:scale-98"
          >
            <PlusCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>+ NEW BILL</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-2.5 sm:gap-3.5">
        {/* Today's Sales */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Today Sales</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-black text-slate-900">
              ₹{(metrics.todaySales || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
            <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
              {metrics.billsCount || 0} Bills created
            </p>
          </div>
        </div>

        {/* Cash in Hand */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Cash in Hand</span>
            <Wallet className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-black text-emerald-600">
              ₹{(metrics.cashInHand || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
            <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Cash sales drawer</p>
          </div>
        </div>

        {/* UPI & Card */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>UPI / Card</span>
            <CreditCard className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-black text-blue-600">
              ₹{(metrics.upiAndCard || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
            <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Direct digital receipt</p>
          </div>
        </div>

        {/* Credit Given (Udhar) */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Credit (Udhar)</span>
            <Users className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-black text-amber-600">
              ₹{(metrics.creditGiven || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
            <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Pending collection</p>
          </div>
        </div>

        {/* Today Expenses */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Expenses</span>
            <TrendingDown className="w-4 h-4 text-red-500" />
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-black text-red-500">
              ₹{(metrics.expensesTotal || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
            <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Petty store expenses</p>
          </div>
        </div>

        {/* Estimated Day Net */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Net Collected</span>
            <ArrowUpRight className="w-4 h-4 text-brand-600" />
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-black text-slate-900">
              ₹{((metrics.cashInHand + metrics.upiAndCard) - metrics.expensesTotal).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
            <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Collected − Expenses</p>
          </div>
        </div>
      </div>

      {/* Main Action Shortcuts Grid */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3">Quick Navigation</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          {[
            { label: 'New Bill', icon: Receipt, path: '/billing', color: 'bg-brand-50 text-brand-700 hover:bg-brand-100' },
            { label: 'Bills List', icon: Receipt, path: '/bills', color: 'bg-slate-50 text-slate-700 hover:bg-slate-100' },
            { label: 'Items & Stock', icon: Package, path: '/items', color: 'bg-slate-50 text-slate-700 hover:bg-slate-100' },
            { label: 'Udhar Customers', icon: Users, path: '/customers', color: 'bg-amber-50 text-amber-700 hover:bg-amber-100' },
            { label: 'Purchases', icon: ShoppingBag, path: '/purchases', color: 'bg-slate-50 text-slate-700 hover:bg-slate-100' },
            { label: 'Expenses', icon: TrendingDown, path: '/expenses', color: 'bg-red-50 text-red-700 hover:bg-red-100' },
            { label: 'Sales Reports', icon: BarChart3, path: '/reports', color: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
            { label: 'Day Close', icon: SunMoon, path: '/day-close', color: 'bg-purple-50 text-purple-700 hover:bg-purple-100' },
          ].map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                onClick={() => navigate(action.path)}
                className={`p-3 rounded-2xl border border-slate-200/80 flex flex-col items-center justify-center gap-2 font-bold text-xs transition active:scale-95 ${action.color}`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-center">{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Two Column Widgets: Low Stock Alert & Pending Udhar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Low Stock Alert */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Low Stock Alerts
            </h3>
            <button 
              onClick={() => navigate('/items')} 
              className="text-xs font-bold text-brand-700 hover:underline"
            >
              Manage Stock →
            </button>
          </div>

          <div className="space-y-2 flex-1">
            {metrics.lowStockItems.length === 0 ? (
              <p className="text-xs text-slate-400 font-medium py-4 text-center">
                All items have sufficient stock level ✓
              </p>
            ) : (
              metrics.lowStockItems.map((item) => (
                <div key={item._id} className="flex items-center justify-between p-2.5 bg-red-50/50 border border-red-200 rounded-xl text-xs">
                  <div>
                    <span className="font-bold text-slate-900">{item.name}</span>
                    <span className="text-slate-400 ml-1.5 font-medium">({item.category})</span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-red-600">{item.currentStock} {item.unit} left</span>
                    <span className="text-[10px] text-slate-400 block font-semibold">Min: {item.lowStockLevel}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pending Credit (Top Udhar Customers) */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-500" />
              Top Pending Credit (Udhar)
            </h3>
            <button 
              onClick={() => navigate('/customers')} 
              className="text-xs font-bold text-brand-700 hover:underline"
            >
              View All Dues →
            </button>
          </div>

          <div className="space-y-2 flex-1">
            {metrics.pendingCreditCustomers.length === 0 ? (
              <p className="text-xs text-slate-400 font-medium py-4 text-center">
                No outstanding customer credits pending ✓
              </p>
            ) : (
              metrics.pendingCreditCustomers.map((cust) => (
                <div key={cust._id} className="flex items-center justify-between p-2.5 bg-amber-50/50 border border-amber-200 rounded-xl text-xs">
                  <div>
                    <span className="font-bold text-slate-900">{cust.name}</span>
                    <span className="text-slate-400 ml-1.5 font-medium">{cust.phone || 'No phone'}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-amber-700">₹{(cust.balanceDue || 0).toFixed(2)}</span>
                    <span className="text-[10px] text-slate-400 block font-semibold">Balance Due</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Barcode Fast Stock Management Modal */}
      <BarcodeStockModal
        isOpen={barcodeStockOpen}
        onClose={() => setBarcodeStockOpen(false)}
        onItemSaved={fetchMetrics}
      />
    </div>
  );
}
