import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart3, Calendar, Download, Printer, TrendingUp, IndianRupee, PieChart, ShoppingBag, Receipt, ArrowUpRight } from 'lucide-react';

export default function Reports() {
  const [dateRange, setDateRange] = useState('TODAY');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState('SALES');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState({
    summary: {
      totalSales: 0,
      totalBills: 0,
      cashSales: 0,
      upiSales: 0,
      cardSales: 0,
      creditSales: 0,
      totalExpenses: 0,
      estimatedProfit: 0,
      totalDiscounts: 0,
      totalTax: 0
    },
    topItems: [],
    taxBreakdown: [],
    expenseCategories: []
  });

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

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/reports/summary', {
        params: { startDate, endDate }
      });
      setReportData(res.data || {});
    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [startDate, endDate]);

  const summary = reportData.summary || {};

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800 p-6 rounded-2xl border border-slate-700">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <BarChart3 className="w-7 h-7 text-lime-400" />
            Reports & Insights
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time business analytics, sales overview, profits and tax summary
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-semibold transition"
          >
            <Printer className="w-4 h-4" />
            Print Report
          </button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
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
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                dateRange === preset.id
                  ? 'bg-lime-500 text-slate-950 font-black'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-750'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-300">
          <Calendar className="w-4 h-4 text-slate-400" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setDateRange('CUSTOM');
            }}
            className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-lime-500"
          />
          <span className="text-slate-500">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setDateRange('CUSTOM');
            }}
            className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-lime-500"
          />
        </div>
      </div>

      {/* Main KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-800 border border-slate-700 p-5 rounded-2xl">
          <div className="text-xs uppercase font-bold text-slate-400 mb-1">Total Sales</div>
          <div className="text-2xl font-black text-white">₹{(summary.totalSales || 0).toFixed(2)}</div>
          <div className="text-xs text-slate-500 mt-1">{summary.totalBills || 0} Bills Generated</div>
        </div>

        <div className="bg-slate-800 border border-slate-700 p-5 rounded-2xl">
          <div className="text-xs uppercase font-bold text-slate-400 mb-1">Estimated Profit</div>
          <div className="text-2xl font-black text-lime-400">₹{(summary.estimatedProfit || 0).toFixed(2)}</div>
          <div className="text-xs text-lime-500/80 mt-1">After cost & expenses</div>
        </div>

        <div className="bg-slate-800 border border-slate-700 p-5 rounded-2xl">
          <div className="text-xs uppercase font-bold text-slate-400 mb-1">Cash Collection</div>
          <div className="text-2xl font-black text-emerald-400">₹{(summary.cashSales || 0).toFixed(2)}</div>
          <div className="text-xs text-slate-500 mt-1">In counter drawer</div>
        </div>

        <div className="bg-slate-800 border border-slate-700 p-5 rounded-2xl">
          <div className="text-xs uppercase font-bold text-slate-400 mb-1">Pending Udhar Given</div>
          <div className="text-2xl font-black text-amber-400">₹{(summary.creditSales || 0).toFixed(2)}</div>
          <div className="text-xs text-amber-500/80 mt-1">To be collected</div>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-slate-700 gap-4">
        {[
          { id: 'SALES', label: 'Payment Modes' },
          { id: 'ITEMS', label: 'Top Items' },
          { id: 'GST', label: 'GST Tax Breakdown' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`pb-3 text-sm font-bold border-b-2 transition ${
              activeTab === t.id
                ? 'border-lime-400 text-lime-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Payment Breakdown */}
      {activeTab === 'SALES' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 space-y-4">
            <h3 className="font-bold text-white text-base">Collections By Mode</h3>
            
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-300 font-medium">Cash</span>
                  <span className="font-bold text-white font-mono">₹{(summary.cashSales || 0).toFixed(2)}</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-2">
                  <div
                    className="bg-emerald-500 h-2 rounded-full"
                    style={{ width: `${summary.totalSales ? ((summary.cashSales || 0) / summary.totalSales) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-300 font-medium">UPI / QR Code</span>
                  <span className="font-bold text-white font-mono">₹{(summary.upiSales || 0).toFixed(2)}</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${summary.totalSales ? ((summary.upiSales || 0) / summary.totalSales) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-300 font-medium">Debit / Credit Card</span>
                  <span className="font-bold text-white font-mono">₹{(summary.cardSales || 0).toFixed(2)}</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-2">
                  <div
                    className="bg-purple-500 h-2 rounded-full"
                    style={{ width: `${summary.totalSales ? ((summary.cardSales || 0) / summary.totalSales) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-300 font-medium">Credit / Udhar (Pending)</span>
                  <span className="font-bold text-white font-mono">₹{(summary.creditSales || 0).toFixed(2)}</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-2">
                  <div
                    className="bg-amber-500 h-2 rounded-full"
                    style={{ width: `${summary.totalSales ? ((summary.creditSales || 0) / summary.totalSales) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 space-y-4">
            <h3 className="font-bold text-white text-base">Financial Metrics</h3>
            <div className="space-y-3 divide-y divide-slate-700/50">
              <div className="flex justify-between items-center pt-2">
                <span className="text-sm text-slate-400">Total Shop Expenses</span>
                <span className="text-sm font-bold text-rose-400 font-mono">₹{(summary.totalExpenses || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-sm text-slate-400">Discounts Conceded</span>
                <span className="text-sm font-bold text-amber-400 font-mono">₹{(summary.totalDiscounts || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-sm text-slate-400">Total Tax Collected</span>
                <span className="text-sm font-bold text-blue-400 font-mono">₹{(summary.totalTax || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-sm text-slate-400">Average Bill Value</span>
                <span className="text-sm font-bold text-white font-mono">
                  ₹{summary.totalBills ? ((summary.totalSales || 0) / summary.totalBills).toFixed(2) : '0.00'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Top Selling Items */}
      {activeTab === 'ITEMS' && (
        <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-700">
            <h3 className="font-bold text-white text-base">Top Selling Products in Selected Period</h3>
          </div>
          {reportData.topItems && reportData.topItems.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase bg-slate-900/50">
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Item Name</th>
                    <th className="py-3 px-4 text-center">Quantity Sold</th>
                    <th className="py-3 px-4 text-right">Revenue (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {reportData.topItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-750">
                      <td className="py-3 px-4 text-slate-500 font-bold">{idx + 1}</td>
                      <td className="py-3 px-4 font-bold text-white">{item.name}</td>
                      <td className="py-3 px-4 text-center font-mono text-slate-300">{item.quantity} {item.unit}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-lime-400">₹{item.totalAmount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400">No item sales records found for this period</div>
          )}
        </div>
      )}

      {/* Tab 3: GST Breakdown */}
      {activeTab === 'GST' && (
        <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-700">
            <h3 className="font-bold text-white text-base">GST Tax Slab Summary (For CA / Filing)</h3>
          </div>
          {reportData.taxBreakdown && reportData.taxBreakdown.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase bg-slate-900/50">
                    <th className="py-3 px-4">Slab (%)</th>
                    <th className="py-3 px-4 text-right">Taxable Value (₹)</th>
                    <th className="py-3 px-4 text-right">CGST (₹)</th>
                    <th className="py-3 px-4 text-right">SGST (₹)</th>
                    <th className="py-3 px-4 text-right">Total Tax (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {reportData.taxBreakdown.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-750">
                      <td className="py-3 px-4 font-bold text-white">{row.slab}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-300">₹{(row.taxable || 0).toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-400">₹{(row.cgst || 0).toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-400">₹{(row.sgst || 0).toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-lime-400">₹{(row.total || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400">No GST transactions recorded for this period</div>
          )}
        </div>
      )}
    </div>
  );
}
