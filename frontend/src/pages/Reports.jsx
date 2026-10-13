import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  BarChart3, 
  Calendar, 
  Printer, 
  Receipt, 
  Package, 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  Search, 
  Eye, 
  Share2, 
  IndianRupee, 
  Sparkles,
  ArrowUpRight,
  Filter,
  CheckCircle2,
  Clock,
  Layers,
  Percent,
  ChevronRight
} from 'lucide-react';
import ThermalReceiptModal from '../components/ThermalReceiptModal';

export default function Reports() {
  const [activeTab, setActiveTab] = useState('BILLING'); // BILLING, STOCK, CUSTOMERS, OVERVIEW, GST
  const [dateRange, setDateRange] = useState('THIS_MONTH');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  // Data states
  const [summaryData, setSummaryData] = useState({
    summary: {},
    topItems: [],
    taxBreakdown: [],
    expenseCategories: []
  });
  const [billsHistory, setBillsHistory] = useState([]);
  const [billsSearch, setBillsSearch] = useState('');
  const [stockReport, setStockReport] = useState({ summary: {}, items: [], recentMovements: [] });
  const [stockSearch, setStockSearch] = useState('');
  const [stockFilter, setStockFilter] = useState('ALL'); // ALL, LOW, OUT
  const [customerReport, setCustomerReport] = useState({ summary: {}, customers: [], recentLedger: [] });
  const [customerSearch, setCustomerSearch] = useState('');

  // Selected Bill for Thermal Receipt Modal
  const [selectedBill, setSelectedBill] = useState(null);

  const handleDatePreset = (preset) => {
    setDateRange(preset);
    const today = new Date();
    let start = new Date();
    let end = new Date();

    if (preset === 'TODAY') {
      // today
    } else if (preset === 'YESTERDAY') {
      start.setDate(today.getDate() - 1);
      end.setDate(today.getDate() - 1);
    } else if (preset === 'THIS_WEEK') {
      const day = today.getDay();
      start.setDate(today.getDate() - day);
    } else if (preset === 'THIS_MONTH') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
    }

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  // Fetch report data
  const fetchAllReports = async () => {
    setLoading(true);
    try {
      const [sumRes, billsRes, stockRes, custRes] = await Promise.all([
        axios.get('/api/reports/summary', { params: { startDate, endDate } }),
        axios.get('/api/reports/sales', { params: { startDate, endDate } }),
        axios.get('/api/reports/stock'),
        axios.get('/api/reports/customers')
      ]);

      setSummaryData(sumRes.data || {});
      setBillsHistory(billsRes.data?.bills || []);
      setStockReport(stockRes.data || { summary: {}, items: [], recentMovements: [] });
      setCustomerReport(custRes.data || { summary: {}, customers: [], recentLedger: [] });
    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllReports();
  }, [startDate, endDate]);

  const summary = summaryData.summary || {};
  const stockSummary = stockReport.summary || {};
  const customerSummary = customerReport.summary || {};

  // Filtered lists
  const filteredBills = billsHistory.filter((b) => {
    const q = billsSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      (b.billNo && b.billNo.toLowerCase().includes(q)) ||
      (b.customer?.name && b.customer.name.toLowerCase().includes(q)) ||
      (b.customer?.phone && b.customer.phone.includes(q))
    );
  });

  const filteredStockItems = (stockReport.items || []).filter((it) => {
    const matchesSearch = !stockSearch.trim() || 
      (it.name && it.name.toLowerCase().includes(stockSearch.toLowerCase())) ||
      (it.code && it.code.toLowerCase().includes(stockSearch.toLowerCase())) ||
      (it.category && it.category.toLowerCase().includes(stockSearch.toLowerCase()));

    if (!matchesSearch) return false;
    if (stockFilter === 'OUT') return it.currentStock <= 0;
    if (stockFilter === 'LOW') return it.currentStock > 0 && it.currentStock <= (it.lowStockLevel || 5);
    return true;
  });

  const filteredCustomers = (customerReport.customers || []).filter((c) => {
    const q = customerSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q))
    );
  });

  return (
    <div className="space-y-4 pb-12 print:p-0">
      {/* Top Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-brand-600" />
            Store Reports &amp; History
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Complete audit records for Billing, Inventory Stock movements, and Customer Accounts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition border border-slate-300 active:scale-98"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Date Range Preset & Filter Bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'TODAY', label: 'Today' },
            { id: 'YESTERDAY', label: 'Yesterday' },
            { id: 'THIS_WEEK', label: 'This Week' },
            { id: 'THIS_MONTH', label: 'This Month' },
            { id: 'CUSTOM', label: 'Custom' }
          ].map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleDatePreset(preset.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${
                dateRange === preset.id
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
          <Calendar className="w-4 h-4 text-brand-600 shrink-0" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setDateRange('CUSTOM');
            }}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:border-brand-500"
          />
          <span className="text-slate-400 font-semibold">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setDateRange('CUSTOM');
            }}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:border-brand-500"
          />
        </div>
      </div>

      {/* High-Level KPI Summary Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Sales</span>
            <Receipt className="w-4 h-4 text-brand-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">
            ₹{(summary.totalSales || 0).toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-0.5">
            {summary.totalBills || 0} Bills Generated
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Cash Collection</span>
            <IndianRupee className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-700">
            ₹{(summary.cashSales || 0).toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-0.5">
            UPI: ₹{(summary.upiSales || 0).toFixed(2)}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Stock Valuation</span>
            <Package className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-blue-700">
            ₹{(stockSummary.totalRetailValuation || 0).toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-0.5">
            Cost: ₹{(stockSummary.totalCostValuation || 0).toFixed(2)} ({stockSummary.totalItems || 0} items)
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Customer Dues</span>
            <Users className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-700">
            ₹{(customerSummary.totalDue || 0).toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-0.5">
            {customerSummary.customersWithDue || 0} Customers Pending
          </div>
        </div>
      </div>

      {/* Main Report Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 no-scrollbar">
        {[
          { id: 'BILLING', label: '🧾 Billing History', count: billsHistory.length },
          { id: 'STOCK', label: '📦 Stock History', count: stockReport.items?.length },
          { id: 'CUSTOMERS', label: '👥 Customer History', count: customerReport.customers?.length },
          { id: 'OVERVIEW', label: '📊 Sales & Financials' },
          { id: 'GST', label: '📑 GST Tax Breakdown' }
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
              activeTab === t.id
                ? 'bg-brand-500 text-slate-950 shadow-xs'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            <span>{t.label}</span>
            {t.count !== undefined && (
              <span className="px-1.5 py-0.2 bg-white/70 rounded-md text-[10px] font-black text-slate-900 border border-slate-200/50">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: BILLING HISTORY REPORT */}
      {/* ========================================================================= */}
      {activeTab === 'BILLING' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-3 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <Receipt className="w-5 h-5 text-brand-600" />
                Billing History Log
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Detailed record of all invoices generated in the selected period
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search bill # or customer..."
                value={billsSearch}
                onChange={(e) => setBillsSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:border-brand-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left min-w-[700px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Bill No</th>
                  <th className="px-4 py-3">Date &amp; Time</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3 text-center">Items</th>
                  <th className="px-4 py-3 text-center">Payment Mode</th>
                  <th className="px-4 py-3 text-right">Grand Total</th>
                  <th className="px-4 py-3 text-center">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredBills.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-12 text-slate-400 font-bold">
                      No bills found for the selected period
                    </td>
                  </tr>
                ) : (
                  filteredBills.map((b) => (
                    <tr key={b._id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3 font-black text-slate-900 font-mono">
                        {b.billNo}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(b.date).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })} • {new Date(b.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-800">
                        {b.customer?.name || 'Walk-in Customer'}
                        {b.customer?.phone && (
                          <span className="block text-[10px] text-slate-400 font-normal">{b.customer.phone}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-slate-600">
                        {b.items?.length || 0}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold ${
                          b.payments?.credit > 0
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : b.payments?.upi > 0
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}>
                          {b.payments?.credit > 0
                            ? 'Credit'
                            : b.payments?.upi > 0
                            ? 'UPI'
                            : b.payments?.card > 0
                            ? 'Card'
                            : 'Cash'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-black text-slate-900 text-sm">
                        ₹{(b.grandTotal || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setSelectedBill(b)}
                          className="px-2.5 py-1 bg-brand-50 hover:bg-brand-100 text-brand-900 font-bold rounded-lg text-[11px] border border-brand-200 transition flex items-center gap-1 mx-auto"
                        >
                          <Eye className="w-3.5 h-3.5 text-brand-600" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: STOCK HISTORY REPORT */}
      {/* ========================================================================= */}
      {activeTab === 'STOCK' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                  <Package className="w-5 h-5 text-brand-600" />
                  Live Stock Valuation &amp; Audit
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Current stock levels, re-order alerts, cost vs selling valuation
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                {/* Stock filter pills */}
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                  <button
                    onClick={() => setStockFilter('ALL')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                      stockFilter === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    All ({stockReport.items?.length || 0})
                  </button>
                  <button
                    onClick={() => setStockFilter('LOW')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                      stockFilter === 'LOW' ? 'bg-amber-500 text-slate-950 font-black shadow-2xs' : 'text-amber-700'
                    }`}
                  >
                    Low Stock ({stockSummary.lowStockCount || 0})
                  </button>
                  <button
                    onClick={() => setStockFilter('OUT')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                      stockFilter === 'OUT' ? 'bg-red-500 text-white font-black shadow-2xs' : 'text-red-700'
                    }`}
                  >
                    Out ({stockSummary.outOfStockCount || 0})
                  </button>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search product..."
                    value={stockSearch}
                    onChange={(e) => setStockSearch(e.target.value)}
                    className="w-full sm:w-52 pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left min-w-[700px]">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Product Name</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3 text-center">Unit</th>
                    <th className="px-4 py-3 text-center">Stock Level</th>
                    <th className="px-4 py-3 text-right">Cost Price</th>
                    <th className="px-4 py-3 text-right">Selling Price</th>
                    <th className="px-4 py-3 text-right">Total Valuation</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredStockItems.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-12 text-slate-400 font-bold">
                        No matching stock items found
                      </td>
                    </tr>
                  ) : (
                    filteredStockItems.map((it) => {
                      const isOut = it.currentStock <= 0;
                      const isLow = it.currentStock <= (it.lowStockLevel || 5);
                      const valuation = Number(it.currentStock || 0) * Number(it.sellingPrice || 0);

                      return (
                        <tr key={it._id} className="hover:bg-slate-50/70 transition">
                          <td className="px-4 py-3 font-bold text-slate-900">
                            {it.name}
                            <span className="block text-[10px] text-slate-400 font-normal">
                              {it.code ? `Code: #${it.code}` : ''}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600 font-semibold">{it.category}</td>
                          <td className="px-4 py-3 text-center text-slate-500 uppercase font-bold text-[10px]">{it.unit}</td>
                          <td className="px-4 py-3 text-center font-black text-slate-900 text-sm">
                            {it.currentStock} {it.unit}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-500 font-semibold">
                            ₹{(it.purchasePrice || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-slate-900">
                            ₹{(it.sellingPrice || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right font-black text-brand-700 text-sm">
                            ₹{valuation.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full font-black text-[10px] ${
                              isOut
                                ? 'bg-red-100 text-red-700'
                                : isLow
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'Healthy'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Stock Movement Logs */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-3">
            <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-600" />
              Recent Inventory Audit &amp; Movement Logs
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left min-w-[600px]">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-2.5">Timestamp</th>
                    <th className="px-4 py-2.5">Action</th>
                    <th className="px-4 py-2.5">Details</th>
                    <th className="px-4 py-2.5">Performed By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stockReport.recentMovements?.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="text-center py-6 text-slate-400 font-medium">
                        No recent movement logs recorded
                      </td>
                    </tr>
                  ) : (
                    stockReport.recentMovements?.map((log) => (
                      <tr key={log._id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-2 text-slate-500 font-mono text-[11px]">
                          {new Date(log.createdAt || log.timestamp).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-2 font-black text-slate-800">{log.action}</td>
                        <td className="px-4 py-2 text-slate-600">
                          {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                        </td>
                        <td className="px-4 py-2 text-slate-500">{log.performedBy || 'System'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CUSTOMER HISTORY REPORT */}
      {/* ========================================================================= */}
      {activeTab === 'CUSTOMERS' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                  <Users className="w-5 h-5 text-brand-600" />
                  Customer Accounts &amp; Outstanding Dues
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Credit accounts, balances due, and ledger transactions
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search customer name or phone..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left min-w-[650px]">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Customer Name</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3 text-right">Credit Limit</th>
                    <th className="px-4 py-3 text-right">Balance Due</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">WhatsApp Reminder</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-12 text-slate-400 font-bold">
                        No customer accounts found
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((c) => {
                      const hasDue = Number(c.balanceDue || 0) > 0;
                      const cleanPhone = c.phone?.replace(/[^0-9]/g, '');
                      const reminderMsg = `Dear ${c.name}, greeting from store! Your outstanding bill balance is ₹${Number(c.balanceDue || 0).toFixed(2)}. Kindly clear at your earliest convenience. Thank you!`;
                      const waUrl = cleanPhone 
                        ? `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(reminderMsg)}`
                        : null;

                      return (
                        <tr key={c._id} className="hover:bg-slate-50/70 transition">
                          <td className="px-4 py-3 font-bold text-slate-900">
                            {c.name}
                          </td>
                          <td className="px-4 py-3 text-slate-600 font-mono">
                            {c.phone || '-'}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-500 font-semibold">
                            ₹{(c.creditLimit || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right font-black text-sm">
                            <span className={hasDue ? 'text-amber-700' : 'text-emerald-700'}>
                              ₹{(c.balanceDue || 0).toFixed(2)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full font-black text-[10px] ${
                              hasDue ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {hasDue ? 'Pending Due' : 'All Clear'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {hasDue && waUrl ? (
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-[11px] font-bold border border-emerald-200 transition"
                              >
                                <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Remind</span>
                              </a>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Customer Ledger Transactions */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-3">
            <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-600" />
              Recent Customer Ledger Transactions
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left min-w-[650px]">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-2.5">Date</th>
                    <th className="px-4 py-2.5">Customer</th>
                    <th className="px-4 py-2.5">Particulars</th>
                    <th className="px-4 py-2.5 text-right">Debit (+)</th>
                    <th className="px-4 py-2.5 text-right">Credit (-)</th>
                    <th className="px-4 py-2.5 text-right">Running Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {customerReport.recentLedger?.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-6 text-slate-400 font-medium">
                        No customer ledger entries found
                      </td>
                    </tr>
                  ) : (
                    customerReport.recentLedger?.map((entry) => (
                      <tr key={entry._id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-2 text-slate-500 font-mono text-[11px]">
                          {new Date(entry.date).toLocaleDateString('en-IN')}
                        </td>
                        <td className="px-4 py-2 font-bold text-slate-900">
                          {entry.customerId?.name || 'Customer'}
                        </td>
                        <td className="px-4 py-2 text-slate-600">{entry.particulars}</td>
                        <td className="px-4 py-2 text-right font-black text-amber-700">
                          {entry.debit > 0 ? `₹${entry.debit.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-4 py-2 text-right font-black text-emerald-700">
                          {entry.credit > 0 ? `₹${entry.credit.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-4 py-2 text-right font-black text-slate-900 font-mono">
                          ₹{(entry.balance || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SALES & FINANCIAL OVERVIEW */}
      {/* ========================================================================= */}
      {activeTab === 'OVERVIEW' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-black text-slate-900 text-sm">Collections By Mode</h3>
            
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-slate-600">Cash Collection</span>
                  <span className="font-mono text-slate-900">₹{(summary.cashSales || 0).toFixed(2)}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all"
                    style={{ width: `${summary.totalSales ? ((summary.cashSales || 0) / summary.totalSales) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-slate-600">UPI / QR Code</span>
                  <span className="font-mono text-slate-900">₹{(summary.upiSales || 0).toFixed(2)}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${summary.totalSales ? ((summary.upiSales || 0) / summary.totalSales) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-slate-600">Card Payment</span>
                  <span className="font-mono text-slate-900">₹{(summary.cardSales || 0).toFixed(2)}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-purple-500 h-2 rounded-full transition-all"
                    style={{ width: `${summary.totalSales ? ((summary.cardSales || 0) / summary.totalSales) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-slate-600">Credit / Udhar</span>
                  <span className="font-mono text-slate-900">₹{(summary.creditSales || 0).toFixed(2)}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-amber-500 h-2 rounded-full transition-all"
                    style={{ width: `${summary.totalSales ? ((summary.creditSales || 0) / summary.totalSales) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-black text-slate-900 text-sm">Financial Summary</h3>
            <div className="space-y-3 divide-y divide-slate-100">
              <div className="flex justify-between items-center pt-2">
                <span className="text-xs text-slate-500 font-bold">Estimated Profit</span>
                <span className="text-sm font-black text-emerald-700 font-mono">₹{(summary.estimatedProfit || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-xs text-slate-500 font-bold">Total Shop Expenses</span>
                <span className="text-sm font-black text-rose-600 font-mono">₹{(summary.totalExpenses || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-xs text-slate-500 font-bold">Total Discounts Given</span>
                <span className="text-sm font-black text-amber-600 font-mono">₹{(summary.totalDiscounts || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-xs text-slate-500 font-bold">Total Tax Collected</span>
                <span className="text-sm font-black text-blue-600 font-mono">₹{(summary.totalTax || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-xs text-slate-500 font-bold">Average Bill Value</span>
                <span className="text-sm font-black text-slate-900 font-mono">
                  ₹{summary.totalBills ? ((summary.totalSales || 0) / summary.totalBills).toFixed(2) : '0.00'}
                </span>
              </div>
            </div>
          </div>

          {/* Top Selling Products */}
          <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-sm">Top Selling Products in Selected Period</h3>
            </div>
            {summaryData.topItems && summaryData.topItems.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-extrabold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-4">#</th>
                      <th className="py-2.5 px-4">Item Name</th>
                      <th className="py-2.5 px-4 text-center">Quantity Sold</th>
                      <th className="py-2.5 px-4 text-right">Revenue (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {summaryData.topItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 text-slate-400 font-bold">{idx + 1}</td>
                        <td className="py-2.5 px-4 font-bold text-slate-900">{item.name}</td>
                        <td className="py-2.5 px-4 text-center font-mono text-slate-700">{item.quantity} {item.unit}</td>
                        <td className="py-2.5 px-4 text-right font-black text-brand-700">₹{item.totalAmount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 text-xs font-bold">No product sales in this period</div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: GST TAX BREAKDOWN */}
      {/* ========================================================================= */}
      {activeTab === 'GST' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-black text-slate-900 text-base">GST Tax Slab Summary (For CA / Filing)</h3>
            <p className="text-xs text-slate-500 font-medium">Slab-wise breakdown of taxable values and tax collected</p>
          </div>
          {summaryData.taxBreakdown && summaryData.taxBreakdown.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[600px]">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Slab (%)</th>
                    <th className="py-3 px-4 text-right">Taxable Value (₹)</th>
                    <th className="py-3 px-4 text-right">CGST (₹)</th>
                    <th className="py-3 px-4 text-right">SGST (₹)</th>
                    <th className="py-3 px-4 text-right">Total Tax (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {summaryData.taxBreakdown.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-900">{row.slab}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700">₹{(row.taxable || 0).toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-500">₹{(row.cgst || 0).toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-500">₹{(row.sgst || 0).toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-mono font-black text-brand-700">₹{(row.total || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 text-xs font-bold">No GST transactions recorded for this period</div>
          )}
        </div>
      )}

      {/* Thermal Receipt Modal for View / Print */}
      {selectedBill && (
        <ThermalReceiptModal
          bill={selectedBill}
          onClose={() => setSelectedBill(null)}
        />
      )}
    </div>
  );
}
