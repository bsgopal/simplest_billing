import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Receipt, 
  History, 
  Package, 
  Users, 
  Menu, 
  X,
  Truck,
  TrendingDown,
  BarChart3,
  SunMoon,
  Settings
} from 'lucide-react';

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const navItems = [
    { label: 'Home', icon: LayoutDashboard, path: '/' },
    { label: 'New Bill', icon: Receipt, path: '/billing', primary: true },
    { label: 'Bills', icon: History, path: '/bills' },
    { label: 'Items', icon: Package, path: '/items' },
    { label: 'Udhar', icon: Users, path: '/customers' }
  ];

  const moreItems = [
    { label: 'Suppliers & Vendors', icon: Truck, path: '/suppliers' },
    { label: 'Purchases Inward', icon: Package, path: '/purchases' },
    { label: 'Daily Expenses', icon: TrendingDown, path: '/expenses' },
    { label: 'Sales & Tax Reports', icon: BarChart3, path: '/reports' },
    { label: 'Day Close Settlement', icon: SunMoon, path: '/day-close' },
    { label: 'Shop Settings', icon: Settings, path: '/settings' }
  ];

  return (
    <>
      {/* Mobile Bottom Navigation Bar (md:hidden) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 z-40 px-2 py-1.5 flex items-center justify-around shadow-lg">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          if (item.primary) {
            return (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className="flex flex-col items-center justify-center -mt-6 bg-brand-500 hover:bg-brand-600 text-slate-950 p-3.5 rounded-full shadow-lg shadow-brand-500/25 border-4 border-white transition active:scale-95"
              >
                <Icon className="w-5 h-5 font-black" />
                <span className="text-[10px] font-black">{item.label}</span>
              </button>
            );
          }

          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition ${
                isActive ? 'text-brand-700 font-extrabold' : 'text-slate-500 hover:text-slate-900 font-medium'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] mt-0.5">{item.label}</span>
            </button>
          );
        })}

        {/* More Menu Toggle */}
        <button
          onClick={() => setDrawerOpen(true)}
          className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition ${
            drawerOpen ? 'text-brand-700 font-bold' : 'text-slate-500 hover:text-slate-900 font-medium'
          }`}
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">More</span>
        </button>
      </nav>

      {/* More Options Drawer Modal */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end">
          <div className="bg-white border-t border-slate-200 rounded-t-3xl p-5 shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-extrabold text-slate-900 text-sm">More Shop Modules</h3>
              <button 
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {moreItems.map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.label}
                    onClick={() => {
                      navigate(m.path);
                      setDrawerOpen(false);
                    }}
                    className="flex items-center gap-2.5 p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-xl text-left transition"
                  >
                    <div className="p-2 bg-brand-100 rounded-lg text-brand-800">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-800">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
