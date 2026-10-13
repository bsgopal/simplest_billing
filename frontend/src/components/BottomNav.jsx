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
  ShoppingBag,
  TrendingDown, 
  BarChart3, 
  SunMoon, 
  Settings,
  Layers,
  Barcode,
  ChevronRight
} from 'lucide-react';

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Clean flat bottom bar navigation matching modern mobile standards
  const navItems = [
    { label: 'Home', icon: LayoutDashboard, path: '/' },
    { label: 'Bills', icon: History, path: '/bills' },
    { label: 'New Bill', icon: Receipt, path: '/billing', isHighlight: true },
    { label: 'Products', icon: Package, path: '/items' },
    { label: 'Udhar', icon: Users, path: '/customers' }
  ];

  // Mobile drawer categories matching JSON tree format
  const drawerGroups = [
    {
      title: 'Products & Inventory',
      icon: Package,
      items: [
        { label: 'Products Master', path: '/items', icon: Package },
        { label: 'Categories & Units', path: '/categories', icon: Layers },
        { label: 'Stock Inward (Scan)', path: '/stock', icon: Barcode, badge: 'Live' }
      ]
    },
    {
      title: 'Sales & Billing',
      icon: Receipt,
      items: [
        { label: 'New Bill (Easy POS)', path: '/billing', icon: Receipt, badge: 'Fast' },
        { label: 'Bills History', path: '/bills', icon: History },
        { label: 'Day Close Tally', path: '/day-close', icon: SunMoon }
      ]
    },
    {
      title: 'Parties & Ledger',
      icon: Users,
      items: [
        { label: 'Customers & Udhar', path: '/customers', icon: Users },
        { label: 'Suppliers & Vendors', path: '/suppliers', icon: Truck },
        { label: 'Purchases Inward', path: '/purchases', icon: ShoppingBag }
      ]
    },
    {
      title: 'Accounts & Reports',
      icon: BarChart3,
      items: [
        { label: 'Sales & Tax Reports', path: '/reports', icon: BarChart3 },
        { label: 'Daily Expenses', path: '/expenses', icon: TrendingDown }
      ]
    },
    {
      title: 'System & Preferences',
      icon: Settings,
      items: [
        { label: 'Settings & Language', path: '/settings', icon: Settings }
      ]
    }
  ];

  const handleNavClick = (path) => {
    navigate(path);
    setDrawerOpen(false);
  };

  return (
    <>
      {/* Mobile Bottom Navigation Bar (md:hidden) - Flat, Non-overlapping, Clean */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 z-40 px-1 py-1 flex items-center justify-between gap-0.5 shadow-md safe-area-pb">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          if (item.isHighlight) {
            return (
              <button
                key={item.label}
                onClick={() => handleNavClick(item.path)}
                className="flex-1 min-w-0 flex flex-col items-center justify-center py-1 px-1 rounded-xl bg-brand-500 hover:bg-brand-600 text-slate-950 font-black shadow-xs transition active:scale-95"
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="text-[9px] sm:text-[10px] font-black leading-none mt-1 truncate max-w-full">{item.label}</span>
              </button>
            );
          }

          return (
            <button
              key={item.label}
              onClick={() => handleNavClick(item.path)}
              className={`flex-1 min-w-0 flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition ${
                isActive ? 'text-brand-700 font-extrabold' : 'text-slate-500 hover:text-slate-900 font-medium'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="text-[9px] sm:text-[10px] leading-none mt-1 truncate max-w-full">{item.label}</span>
            </button>
          );
        })}

        {/* More Menu Toggle */}
        <button
          onClick={() => setDrawerOpen(true)}
          className={`flex-1 min-w-0 flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition ${
            drawerOpen ? 'text-brand-700 font-bold' : 'text-slate-500 hover:text-slate-900 font-medium'
          }`}
        >
          <Menu className="w-4 h-4 shrink-0" />
          <span className="text-[9px] sm:text-[10px] leading-none mt-1 truncate max-w-full">Menu</span>
        </button>
      </nav>

      {/* Mobile Tree Menu Drawer */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex flex-col justify-end">
          <div className="bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto p-4 space-y-4 shadow-2xl animate-in slide-in-from-bottom duration-200 pb-16">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Menu className="w-4 h-4 text-brand-600" />
                Navigation Tree
              </span>
              <button 
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tree Sections */}
            <div className="space-y-3">
              {drawerGroups.map((grp) => {
                const GrpIcon = grp.icon;
                return (
                  <div key={grp.title} className="bg-slate-50 rounded-2xl p-2.5 border border-slate-200/80">
                    <div className="text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1.5 flex items-center gap-1.5 px-1">
                      <GrpIcon className="w-3.5 h-3.5 text-brand-600" />
                      <span>{grp.title}</span>
                    </div>

                    <div className="space-y-1">
                      {grp.items.map((item, idx) => {
                        const ItemIcon = item.icon;
                        const isLast = idx === grp.items.length - 1;
                        const isActive = location.pathname === item.path;

                        return (
                          <button
                            key={item.path}
                            onClick={() => handleNavClick(item.path)}
                            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition ${
                              isActive
                                ? 'bg-brand-500 text-slate-950 font-black shadow-2xs'
                                : 'text-slate-700 hover:bg-white bg-white/60 font-semibold'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] text-slate-400">
                                {isLast ? '└──' : '├──'}
                              </span>
                              <ItemIcon className="w-3.5 h-3.5" />
                              <span>{item.label}</span>
                            </div>

                            <div className="flex items-center gap-1">
                              {item.badge && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-brand-100 text-brand-900">
                                  {item.badge}
                                </span>
                              )}
                              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
