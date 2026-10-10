import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Receipt, 
  History, 
  Package, 
  Barcode,
  Layers,
  Users, 
  Truck, 
  ShoppingBag,
  TrendingDown, 
  BarChart3, 
  SunMoon, 
  Settings
} from 'lucide-react';

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const links = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { label: 'New Bill (POS)', icon: Receipt, path: '/billing', badge: 'Fast' },
    { label: 'Bills History', icon: History, path: '/bills' },
    { label: 'Items Master', icon: Package, path: '/items' },
    { label: 'Stock Inward (Scan)', icon: Barcode, path: '/stock', badge: 'Live' },
    { label: 'Categories', icon: Layers, path: '/categories' },
    { label: 'Customers (Udhar)', icon: Users, path: '/customers' },
    { label: 'Suppliers', icon: Truck, path: '/suppliers' },
    { label: 'Purchases Inward', icon: ShoppingBag, path: '/purchases' },
    { label: 'Daily Expenses', icon: TrendingDown, path: '/expenses' },
    { label: 'Sales Reports', icon: BarChart3, path: '/reports' },
    { label: 'Day Close Tally', icon: SunMoon, path: '/day-close' },
    { label: 'Shop Settings', icon: Settings, path: '/settings' }
  ];

  return (
    <aside className="hidden md:flex flex-col w-56 lg:w-64 bg-white border-r border-slate-200/90 h-[calc(100vh-53px)] sticky top-[53px] p-3 shadow-xs select-none">
      <div className="space-y-1 flex-1 overflow-y-auto pr-1">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.path;

          return (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-brand-500 text-slate-950 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                <span>{link.label}</span>
              </div>
              {link.badge && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                  isActive ? 'bg-slate-950 text-brand-400' : 'bg-brand-100 text-brand-800 border border-brand-300'
                }`}>
                  {link.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between px-2">
        <span>Simple Billing v1.0</span>
        <span className="text-emerald-600 font-bold flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          POS Online
        </span>
      </div>
    </aside>
  );
}
