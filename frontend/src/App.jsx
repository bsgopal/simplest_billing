import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BillingProvider } from './context/BillingContext';

// Components
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NewBill from './pages/NewBill';
import BillsList from './pages/BillsList';
import Items from './pages/Items';
import Categories from './pages/Categories';
import StockInward from './pages/StockInward';
import Customers from './pages/Customers';
import Suppliers from './pages/Suppliers';
import PurchaseEntry from './pages/PurchaseEntry';
import Expenses from './pages/Expenses';
import DayClose from './pages/DayClose';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

function ProtectedLayout() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-brand-700 font-bold">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <span>Loading Simple Billing...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-3 sm:p-5 lg:p-6 pb-20 md:pb-6 overflow-y-auto max-w-7xl mx-auto w-full">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/billing" element={<NewBill />} />
            <Route path="/bills" element={<BillsList />} />
            <Route path="/items" element={<Items />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/stock" element={<StockInward />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/suppliers" element={<Suppliers />} />
            <Route path="/purchases" element={<PurchaseEntry />} />
            <Route path="/purchases/new" element={<PurchaseEntry />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/day-close" element={<DayClose />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BillingProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/*" element={<ProtectedLayout />} />
          </Routes>
        </BillingProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
