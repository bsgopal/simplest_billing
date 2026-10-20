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
  ChevronRight,
  Download,
  Lock,
  Unlock,
  KeyRound,
  X,
  Shield
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ThermalReceiptModal from '../components/ThermalReceiptModal';

export default function Reports() {
  const { shop } = useAuth();
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

  const { toast } = useToast();
  // Selected Bill for Thermal Receipt Modal
  const [selectedBill, setSelectedBill] = useState(null);

  // Secret Without-GST / Non-GST Report Security States (Fn+F5 / Fn+F7)
  const [nonGstUnlocked, setNonGstUnlocked] = useState(false);
  const [showWithoutGstPrompt, setShowWithoutGstPrompt] = useState(false);
  const [withoutGstPasswordInput, setWithoutGstPasswordInput] = useState('');
  const [withoutGstError, setWithoutGstError] = useState('');
  const [verifyingPassword, setVerifyingPassword] = useState(false);
  const [nonGstSearch, setNonGstSearch] = useState('');

  // Global Secret Hotkey Interceptor (Fn+F5 / F5 / Fn+F7 / F7)
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      const targetHotkey = String(shop?.withoutGstHotkey || 'F5').toUpperCase();
      const isF5 = e.key === 'F5' || e.code === 'F5';
      const isF7 = e.key === 'F7' || e.code === 'F7';
      const isCtrlF5 = (e.ctrlKey || e.metaKey) && isF5;
      const isAltF5 = e.altKey && isF5;
      const isF9 = e.key === 'F9' || e.code === 'F9';
      const isCtrlB = (e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B');

      const matchesHotkey = 
        (targetHotkey === 'F5' && isF5 && !e.ctrlKey && !e.altKey) ||
        (targetHotkey === 'F7' && isF7 && !e.ctrlKey && !e.altKey) ||
        (targetHotkey === 'BOTH' && (isF5 || isF7) && !e.ctrlKey && !e.altKey) ||
        (targetHotkey === 'CTRL+F5' && isCtrlF5) ||
        (targetHotkey === 'ALT+F5' && isAltF5) ||
        (targetHotkey === 'F9' && isF9) ||
        (targetHotkey === 'CTRL+B' && isCtrlB) ||
        (isF5) ||
        (isF7);

      if (matchesHotkey) {
        e.preventDefault();
        e.stopPropagation();
        if (nonGstUnlocked) {
          setNonGstUnlocked(false);
          setActiveTab(prev => (prev === 'NON_GST' ? 'BILLING' : prev));
          toast.info('Non-GST Billing Report locked and concealed');
        } else {
          setWithoutGstPasswordInput('');
          setWithoutGstError('');
          setShowWithoutGstPrompt(true);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [shop?.withoutGstHotkey, nonGstUnlocked]);

  const handleVerifyWithoutGstPassword = async (e) => {
    e.preventDefault();
    if (!withoutGstPasswordInput.trim()) {
      setWithoutGstError('Please enter secret password');
      return;
    }
    setVerifyingPassword(true);
    try {
      setWithoutGstError('');
      const res = await axios.post('/api/settings/verify-without-gst-password', {
        password: withoutGstPasswordInput.trim()
      });
      if (res.data?.success) {
        setNonGstUnlocked(true);
        setShowWithoutGstPrompt(false);
        setWithoutGstPasswordInput('');
        setActiveTab('NON_GST');
        toast.success('🟡 Non-GST / Estimate Billing Report Unlocked');
      } else {
        setWithoutGstError('Incorrect secret password');
      }
    } catch (err) {
      setWithoutGstError(err.response?.data?.message || 'Incorrect secret password');
    } finally {
      setVerifyingPassword(false);
    }
  };

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

  const isBillNonGst = (b) => {
    return b.billType === 'NON_GST' || b.isGstBill === false || (b.billNo && b.billNo.toUpperCase().startsWith('EST'));
  };

  // Standard GST Bills (Non-GST bills excluded for privacy)
  const standardBills = billsHistory.filter((b) => !isBillNonGst(b));
  const filteredBills = standardBills.filter((b) => {
    const q = billsSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      (b.billNo && b.billNo.toLowerCase().includes(q)) ||
      (b.customer?.name && b.customer.name.toLowerCase().includes(q)) ||
      (b.customer?.phone && b.customer.phone.includes(q))
    );
  });

  // Non-GST / Estimate Bills (Accessible only via Fn+F5 / Fn+F7 secret unlock)
  const nonGstBills = billsHistory.filter((b) => isBillNonGst(b));
  const filteredNonGstBills = nonGstBills.filter((b) => {
    const q = nonGstSearch.toLowerCase().trim();
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

  const addReportHeader = (doc, title, subtitle) => {
    const shopName = shop?.shopName || 'Simple Retail Store';
    const shopPhone = shop?.phone ? `Phone: ${shop.phone}` : '';
    const shopAddress = shop?.address || '';

    // Brand Header Bar
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 210, 22, 'F');

    // Shop Name & Details
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(shopName, 14, 10);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(203, 213, 225);
    const subText = [shopAddress, shopPhone].filter(Boolean).join(' • ');
    if (subText) {
      doc.text(subText, 14, 16);
    }

    // Report Title & Date
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 14, 31);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(subtitle, 14, 36);

    const genDate = `Generated: ${new Date().toLocaleString('en-IN')}`;
    doc.text(genDate, 210 - 14 - doc.getTextWidth(genDate), 36);

    // Divider line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(14, 39, 196, 39);
  };

  const addReportFooter = (doc) => {
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.setDrawColor(226, 232, 240);
      doc.line(14, 285, 196, 285);
      doc.text('Simple Billing System • Confidential Business Audit Report', 14, 290);
      const pageStr = `Page ${i} of ${pageCount}`;
      doc.text(pageStr, 210 - 14 - doc.getTextWidth(pageStr), 290);
    }
  };

  const exportBillingPdf = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const dateStr = `${startDate} to ${endDate}`;

    addReportHeader(doc, 'Billing History & Sales Report', `Period: ${dateStr}`);

    // Summary Cards Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 42, 182, 17, 2, 2, 'FD');

    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL INVOICES', 18, 48);
    doc.text('TOTAL REVENUE', 62, 48);
    doc.text('CASH SALES', 108, 48);
    doc.text('UPI SALES', 148, 48);

    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`${summary.totalBills || filteredBills.length}`, 18, 54);
    doc.setTextColor(22, 101, 52);
    doc.text(`Rs. ${(summary.totalSales || 0).toFixed(2)}`, 62, 54);
    doc.setTextColor(15, 23, 42);
    doc.text(`Rs. ${(summary.cashSales || 0).toFixed(2)}`, 108, 54);
    doc.text(`Rs. ${(summary.upiSales || 0).toFixed(2)}`, 148, 54);

    const rows = filteredBills.map((b, idx) => [
      idx + 1,
      b.billNo || '-',
      new Date(b.date).toLocaleDateString('en-IN') + ' ' + new Date(b.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      b.customer?.name || 'Walk-in',
      b.items?.length || 0,
      b.payments?.credit > 0 ? 'Credit' : b.payments?.upi > 0 ? 'UPI' : b.payments?.card > 0 ? 'Card' : 'Cash',
      `Rs. ${(b.grandTotal || 0).toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: 63,
      head: [['#', 'Bill No', 'Date & Time', 'Customer', 'Items', 'Mode', 'Grand Total']],
      body: rows,
      theme: 'striped',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: [30, 41, 59]
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 26, fontStyle: 'bold' },
        2: { cellWidth: 38 },
        3: { cellWidth: 42 },
        4: { cellWidth: 16, halign: 'center' },
        5: { cellWidth: 20, halign: 'center' },
        6: { cellWidth: 30, halign: 'right', fontStyle: 'bold', textColor: [22, 101, 52] }
      },
      margin: { left: 14, right: 14, bottom: 15 }
    });

    addReportFooter(doc);
    doc.save(`Billing_Report_${startDate}_to_${endDate}.pdf`);
  };

  const exportNonGstPdf = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const dateStr = `${startDate} to ${endDate}`;

    addReportHeader(doc, 'Non-GST / Estimate Billing Report', `Period: ${dateStr} • (Zero Tax / Estimate Serial)`);

    // Summary Cards Box
    doc.setFillColor(254, 243, 199);
    doc.setDrawColor(245, 158, 11);
    doc.roundedRect(14, 42, 182, 17, 2, 2, 'FD');

    doc.setFontSize(7.5);
    doc.setTextColor(146, 64, 14);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL ESTIMATES', 18, 48);
    doc.text('TOTAL REVENUE', 62, 48);
    doc.text('CASH SALES', 108, 48);
    doc.text('UPI SALES', 148, 48);

    const nonGstTotal = filteredNonGstBills.reduce((s, b) => s + (b.grandTotal || 0), 0);
    const nonGstCash = filteredNonGstBills.reduce((s, b) => s + (b.payments?.cash || 0), 0);
    const nonGstUpi = filteredNonGstBills.reduce((s, b) => s + (b.payments?.upi || 0), 0);

    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`${filteredNonGstBills.length}`, 18, 54);
    doc.setTextColor(180, 83, 9);
    doc.text(`Rs. ${nonGstTotal.toFixed(2)}`, 62, 54);
    doc.setTextColor(15, 23, 42);
    doc.text(`Rs. ${nonGstCash.toFixed(2)}`, 108, 54);
    doc.text(`Rs. ${nonGstUpi.toFixed(2)}`, 148, 54);

    const rows = filteredNonGstBills.map((b, idx) => [
      idx + 1,
      b.billNo || '-',
      new Date(b.date).toLocaleDateString('en-IN') + ' ' + new Date(b.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      b.customer?.name || 'Walk-in',
      b.items?.length || 0,
      b.payments?.credit > 0 ? 'Credit' : b.payments?.upi > 0 ? 'UPI' : b.payments?.card > 0 ? 'Card' : 'Cash',
      `Rs. ${(b.grandTotal || 0).toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: 63,
      head: [['#', 'Estimate No', 'Date & Time', 'Customer', 'Items', 'Mode', 'Grand Total']],
      body: rows,
      theme: 'striped',
      headStyles: {
        fillColor: [217, 119, 6],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: [30, 41, 59]
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 26, fontStyle: 'bold' },
        2: { cellWidth: 38 },
        3: { cellWidth: 42 },
        4: { cellWidth: 16, halign: 'center' },
        5: { cellWidth: 20, halign: 'center' },
        6: { cellWidth: 30, halign: 'right', fontStyle: 'bold', textColor: [180, 83, 9] }
      },
      margin: { left: 14, right: 14, bottom: 15 }
    });

    addReportFooter(doc);
    doc.save(`Estimate_NonGST_Report_${startDate}_to_${endDate}.pdf`);
  };

  const exportStockPdf = () => {
    const doc = new jsPDF('p', 'mm', 'a4');

    addReportHeader(doc, 'Stock Valuation & Inventory Audit Report', `Filter: ${stockFilter}`);

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 42, 182, 17, 2, 2, 'FD');

    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL PRODUCTS', 18, 48);
    doc.text('RETAIL VALUATION', 60, 48);
    doc.text('COST VALUATION', 108, 48);
    doc.text('LOW / OUT OF STOCK', 150, 48);

    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`${stockSummary.totalItems || filteredStockItems.length} Products`, 18, 54);
    doc.setTextColor(29, 78, 216);
    doc.text(`Rs. ${(stockSummary.totalRetailValuation || 0).toFixed(2)}`, 60, 54);
    doc.setTextColor(15, 23, 42);
    doc.text(`Rs. ${(stockSummary.totalCostValuation || 0).toFixed(2)}`, 108, 54);
    doc.setTextColor(185, 28, 28);
    doc.text(`${stockSummary.lowStockCount || 0} Low / ${stockSummary.outOfStockCount || 0} Out`, 150, 54);

    const rows = filteredStockItems.map((it, idx) => {
      const isOut = it.currentStock <= 0;
      const isLow = it.currentStock <= (it.lowStockLevel || 5);
      const valuation = Number(it.currentStock || 0) * Number(it.sellingPrice || 0);
      const status = isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'Healthy';

      return [
        idx + 1,
        it.name + (it.code ? ` (#${it.code})` : ''),
        it.category || 'General',
        `${it.currentStock} ${it.unit}`,
        `Rs. ${(it.purchasePrice || 0).toFixed(2)}`,
        `Rs. ${(it.sellingPrice || 0).toFixed(2)}`,
        `Rs. ${valuation.toFixed(2)}`,
        status
      ];
    });

    autoTable(doc, {
      startY: 63,
      head: [['#', 'Product Name', 'Category', 'In Stock', 'Cost Rate', 'Selling Rate', 'Valuation', 'Status']],
      body: rows,
      theme: 'striped',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: [30, 41, 59]
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 44, fontStyle: 'bold' },
        2: { cellWidth: 26 },
        3: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
        4: { cellWidth: 20, halign: 'right' },
        5: { cellWidth: 22, halign: 'right' },
        6: { cellWidth: 24, halign: 'right', fontStyle: 'bold', textColor: [22, 101, 52] },
        7: { cellWidth: 16, halign: 'center' }
      },
      margin: { left: 14, right: 14, bottom: 15 }
    });

    addReportFooter(doc);
    doc.save(`Stock_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportCustomerPdf = () => {
    const doc = new jsPDF('p', 'mm', 'a4');

    addReportHeader(doc, 'Customer Accounts & Outstanding Dues Report', 'Ledger balances directory');

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 42, 182, 17, 2, 2, 'FD');

    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL CUSTOMERS', 18, 48);
    doc.text('TOTAL BALANCE DUE', 70, 48);
    doc.text('CUSTOMERS WITH PENDING DUES', 130, 48);

    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`${customerSummary.totalCustomers || filteredCustomers.length} Accounts`, 18, 54);
    doc.setTextColor(180, 83, 9);
    doc.text(`Rs. ${(customerSummary.totalDue || 0).toFixed(2)}`, 70, 54);
    doc.setTextColor(15, 23, 42);
    doc.text(`${customerSummary.customersWithDue || 0} Accounts`, 130, 54);

    const rows = filteredCustomers.map((c, idx) => [
      idx + 1,
      c.name,
      c.phone || '-',
      `Rs. ${(c.creditLimit || 0).toFixed(2)}`,
      `Rs. ${(c.balanceDue || 0).toFixed(2)}`,
      Number(c.balanceDue || 0) > 0 ? 'Pending Due' : 'All Clear'
    ]);

    autoTable(doc, {
      startY: 63,
      head: [['#', 'Customer Name', 'Phone Number', 'Credit Limit', 'Balance Due', 'Status']],
      body: rows,
      theme: 'striped',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: [30, 41, 59]
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 54, fontStyle: 'bold' },
        2: { cellWidth: 34 },
        3: { cellWidth: 28, halign: 'right' },
        4: { cellWidth: 32, halign: 'right', fontStyle: 'bold', textColor: [180, 83, 9] },
        5: { cellWidth: 24, halign: 'center' }
      },
      margin: { left: 14, right: 14, bottom: 15 }
    });

    addReportFooter(doc);
    doc.save(`Customer_Accounts_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportFinancialOverviewPdf = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const dateStr = `${startDate} to ${endDate}`;

    addReportHeader(doc, 'Executive Sales & GST Financial Report', `Period: ${dateStr}`);

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 42, 182, 22, 2, 2, 'FD');

    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL SALES', 18, 48);
    doc.text('ESTIMATED PROFIT', 62, 48);
    doc.text('TOTAL EXPENSES', 110, 48);
    doc.text('TAX COLLECTED', 152, 48);

    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`Rs. ${(summary.totalSales || 0).toFixed(2)}`, 18, 55);
    doc.setTextColor(22, 101, 52);
    doc.text(`Rs. ${(summary.estimatedProfit || 0).toFixed(2)}`, 62, 55);
    doc.setTextColor(225, 29, 72);
    doc.text(`Rs. ${(summary.totalExpenses || 0).toFixed(2)}`, 110, 55);
    doc.setTextColor(37, 99, 235);
    doc.text(`Rs. ${(summary.totalTax || 0).toFixed(2)}`, 152, 55);

    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Cash: Rs. ${(summary.cashSales || 0).toFixed(2)} • UPI: Rs. ${(summary.upiSales || 0).toFixed(2)} • Card: Rs. ${(summary.cardSales || 0).toFixed(2)} • Credit: Rs. ${(summary.creditSales || 0).toFixed(2)}`, 18, 61);

    let currentY = 69;

    if (summaryData.topItems && summaryData.topItems.length > 0) {
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text('Top Selling Products', 14, currentY);

      const itemRows = summaryData.topItems.map((it, idx) => [
        idx + 1,
        it.name,
        `${it.quantity} ${it.unit}`,
        `Rs. ${(it.totalAmount || 0).toFixed(2)}`
      ]);

      autoTable(doc, {
        startY: currentY + 3,
        head: [['#', 'Product Name', 'Quantity Sold', 'Total Revenue']],
        body: itemRows,
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42], fontSize: 7.5 },
        bodyStyles: { fontSize: 7.5 },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 80, fontStyle: 'bold' },
          2: { cellWidth: 42, halign: 'center' },
          3: { cellWidth: 50, halign: 'right', fontStyle: 'bold', textColor: [22, 101, 52] }
        },
        margin: { left: 14, right: 14 }
      });

      currentY = doc.lastAutoTable.finalY + 8;
    }

    if (summaryData.taxBreakdown && summaryData.taxBreakdown.length > 0) {
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text('GST Tax Slab Summary (For CA / Filing)', 14, currentY);

      const taxRows = summaryData.taxBreakdown.map((row) => [
        row.slab,
        `Rs. ${(row.taxable || 0).toFixed(2)}`,
        `Rs. ${(row.cgst || 0).toFixed(2)}`,
        `Rs. ${(row.sgst || 0).toFixed(2)}`,
        `Rs. ${(row.total || 0).toFixed(2)}`
      ]);

      autoTable(doc, {
        startY: currentY + 3,
        head: [['GST Slab', 'Taxable Amount', 'CGST', 'SGST', 'Total GST Tax']],
        body: taxRows,
        theme: 'striped',
        headStyles: { fillColor: [30, 41, 59], fontSize: 7.5 },
        bodyStyles: { fontSize: 7.5 },
        columnStyles: {
          0: { cellWidth: 26, fontStyle: 'bold' },
          1: { cellWidth: 40, halign: 'right' },
          2: { cellWidth: 38, halign: 'right' },
          3: { cellWidth: 38, halign: 'right' },
          4: { cellWidth: 40, halign: 'right', fontStyle: 'bold', textColor: [29, 78, 216] }
        },
        margin: { left: 14, right: 14 }
      });
    }

    addReportFooter(doc);
    doc.save(`Sales_Financial_Report_${startDate}_to_${endDate}.pdf`);
  };

  const handleExportCurrentTabPdf = () => {
    if (activeTab === 'BILLING') {
      exportBillingPdf();
    } else if (activeTab === 'NON_GST') {
      exportNonGstPdf();
    } else if (activeTab === 'STOCK') {
      exportStockPdf();
    } else if (activeTab === 'CUSTOMERS') {
      exportCustomerPdf();
    } else {
      exportFinancialOverviewPdf();
    }
  };

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
            onClick={handleExportCurrentTabPdf}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-brand-500 hover:bg-brand-600 text-slate-950 font-black rounded-xl text-xs transition shadow-xs active:scale-98"
            title="Download active report as PDF file"
          >
            <Download className="w-4 h-4" />
            <span>Export PDF</span>
          </button>

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
      <div className="flex items-center justify-between gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 no-scrollbar">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'BILLING', label: '🧾 Billing History', count: standardBills.length },
            ...(nonGstUnlocked ? [{ id: 'NON_GST', label: '🟡 Non-GST / Estimate Bills', count: nonGstBills.length, isSecret: true }] : []),
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
                  ? t.isSecret
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'bg-brand-500 text-slate-950 shadow-xs'
                  : t.isSecret
                    ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200'
                    : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              <span>{t.label}</span>
              {t.count !== undefined && (
                <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black border ${
                  t.isSecret
                    ? 'bg-white/80 text-amber-950 border-amber-300'
                    : 'bg-white/70 text-slate-900 border-slate-200/50'
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {nonGstUnlocked && (
          <button
            onClick={() => {
              setNonGstUnlocked(false);
              setActiveTab(prev => (prev === 'NON_GST' ? 'BILLING' : prev));
              toast.info('Non-GST Billing Report locked and concealed');
            }}
            className="shrink-0 flex items-center gap-1 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold rounded-xl border border-amber-300 transition"
            title="Lock and conceal Non-GST bills"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Lock Non-GST</span>
          </button>
        )}
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
      {/* TAB: NON-GST / ESTIMATE BILLING REPORT (SECRET UNLOCK) */}
      {/* ========================================================================= */}
      {activeTab === 'NON_GST' && nonGstUnlocked && (
        <div className="bg-white rounded-2xl border-2 border-amber-300 shadow-xs overflow-hidden space-y-4 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-50/70 p-3.5 rounded-xl border border-amber-200">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                <h3 className="font-black text-amber-950 text-base flex items-center gap-2">
                  <Shield className="w-5 h-5 text-amber-600" />
                  Non-GST / Estimate Billing History
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-black tracking-wide uppercase">
                  Confidential
                </span>
              </div>
              <p className="text-xs text-amber-800 font-medium mt-0.5">
                Audit record of all zero-tax estimate bills created in this period
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-amber-600 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search estimate # or customer..."
                  value={nonGstSearch}
                  onChange={(e) => setNonGstSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-amber-300 rounded-xl text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <button
                onClick={exportNonGstPdf}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition shadow-xs shrink-0"
              >
                <Download className="w-4 h-4" />
                <span>Export PDF</span>
              </button>
            </div>
          </div>

          {/* Metrics summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-200">
              <span className="text-[10px] font-bold uppercase text-amber-700 tracking-wider">Total Estimates</span>
              <div className="text-lg font-black text-amber-950 mt-0.5">{filteredNonGstBills.length}</div>
            </div>
            <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-200">
              <span className="text-[10px] font-bold uppercase text-amber-700 tracking-wider">Total Revenue</span>
              <div className="text-lg font-black text-amber-800 mt-0.5">
                ₹{filteredNonGstBills.reduce((s, b) => s + (b.grandTotal || 0), 0).toFixed(2)}
              </div>
            </div>
            <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-200">
              <span className="text-[10px] font-bold uppercase text-amber-700 tracking-wider">Cash Revenue</span>
              <div className="text-lg font-black text-emerald-700 mt-0.5">
                ₹{filteredNonGstBills.reduce((s, b) => s + (b.payments?.cash || 0), 0).toFixed(2)}
              </div>
            </div>
            <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-200">
              <span className="text-[10px] font-bold uppercase text-amber-700 tracking-wider">UPI / Card</span>
              <div className="text-lg font-black text-blue-700 mt-0.5">
                ₹{filteredNonGstBills.reduce((s, b) => s + (b.payments?.upi || 0) + (b.payments?.card || 0), 0).toFixed(2)}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left min-w-[700px]">
              <thead className="bg-amber-100/60 border-b border-amber-200 text-amber-950 font-extrabold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Estimate No</th>
                  <th className="px-4 py-3">Date &amp; Time</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3 text-center">Items</th>
                  <th className="px-4 py-3 text-center">Payment Mode</th>
                  <th className="px-4 py-3 text-right">Grand Total</th>
                  <th className="px-4 py-3 text-center">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredNonGstBills.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-10 text-slate-400 font-medium">
                      No Non-GST / Estimate bills found for the selected period
                    </td>
                  </tr>
                ) : (
                  filteredNonGstBills.map((b) => (
                    <tr key={b._id} className="hover:bg-amber-50/40 transition">
                      <td className="px-4 py-3 font-mono font-black text-amber-900">
                        {b.billNo}
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-medium">
                        {new Date(b.date).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })} • {new Date(b.date).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {b.customer?.name || 'Walk-in Customer'}
                        {b.customer?.phone && (
                          <span className="block text-[10px] text-slate-400 font-mono">
                            {b.customer.phone}
                          </span>
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
                      <td className="px-4 py-3 text-right font-black text-amber-900 text-sm">
                        ₹{(b.grandTotal || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setSelectedBill(b)}
                          className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold rounded-lg text-[11px] border border-amber-300 transition flex items-center gap-1 mx-auto"
                        >
                          <Eye className="w-3.5 h-3.5 text-amber-700" />
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

      {/* Secret Password Modal for Unlocking Non-GST Bills */}
      {showWithoutGstPrompt && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => {
                setShowWithoutGstPrompt(false);
                setWithoutGstPasswordInput('');
                setWithoutGstError('');
              }}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Unlock Non-GST Reports</h3>
                <p className="text-xs text-slate-500 font-medium">Enter secret password to view estimate records</p>
              </div>
            </div>

            <form onSubmit={handleVerifyWithoutGstPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Secret Access Password
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    autoFocus
                    value={withoutGstPasswordInput}
                    onChange={(e) => setWithoutGstPasswordInput(e.target.value)}
                    placeholder="Enter password..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-hidden focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
                {withoutGstError && (
                  <p className="text-xs text-rose-600 font-bold mt-1.5">{withoutGstError}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowWithoutGstPrompt(false);
                    setWithoutGstPasswordInput('');
                    setWithoutGstError('');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={verifyingPassword}
                  className="px-4 py-2 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-600 text-slate-950 transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>{verifyingPassword ? 'Verifying...' : 'Unlock Non-GST'}</span>
                </button>
              </div>
            </form>
          </div>
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
