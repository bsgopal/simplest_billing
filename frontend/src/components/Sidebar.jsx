import React, { useState, useEffect } from 'react';
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
  Settings,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen
} from 'lucide-react';

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  // Menu structure organized in hierarchical tree format
  const menuGroups = [
    {
      id: 'main',
      isSingle: true,
      label: 'Dashboard',
      icon: LayoutDashboard,
      path: '/'
    },
    {
      id: 'inventory',
      label: 'Products & Inventory',
      icon: Package,
      badge: 'Catalog',
      children: [
        { label: 'Products Master', icon: Package, path: '/items', isBranch: true },
        { label: 'Categories & Units', icon: Layers, path: '/categories', isBranch: true },
        { label: 'Stock Inward (Scan)', icon: Barcode, path: '/stock', badge: 'Live', isLast: true }
      ]
    },
    {
      id: 'billing',
      label: 'Sales & Invoices',
      icon: Receipt,
      badge: 'POS',
      children: [
        { label: 'New Bill (Easy POS)', icon: Receipt, path: '/billing', badge: 'Fast', isBranch: true },
        { label: 'Bills History', icon: History, path: '/bills', isBranch: true },
        { label: 'Day Close Tally', icon: SunMoon, path: '/day-close', isLast: true }
      ]
    },
    {
      id: 'parties',
      label: 'Parties & Ledger',
      icon: Users,
      children: [
        { label: 'Customers & Udhar', icon: Users, path: '/customers', isBranch: true },
        { label: 'Suppliers & Vendors', icon: Truck, path: '/suppliers', isBranch: true },
        { label: 'Purchases Inward', icon: ShoppingBag, path: '/purchases', isLast: true }
      ]
    },
    {
      id: 'reports',
      label: 'Accounts & Reports',
      icon: BarChart3,
      children: [
        { label: 'Sales & Tax Reports', icon: BarChart3, path: '/reports', isBranch: true },
        { label: 'Daily Expenses', icon: TrendingDown, path: '/expenses', isLast: true }
      ]
    },
    {
      id: 'settings',
      isSingle: true,
      label: 'Settings & Language',
      icon: Settings,
      path: '/settings'
    }
  ];

  // Default open state based on active path
  const [openGroups, setOpenGroups] = useState(() => {
    const initial = { inventory: true, billing: true };
    return initial;
  });

  // Auto-expand group if child path is active
  useEffect(() => {
    menuGroups.forEach(group => {
      if (group.children && group.children.some(c => c.path === location.pathname)) {
        setOpenGroups(prev => ({ ...prev, [group.id]: true }));
      }
    });
  }, [location.pathname]);

  const toggleGroup = (groupId) => {
    setOpenGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  return (
    <aside className="hidden md:flex flex-col w-60 lg:w-68 bg-white border-r border-slate-200/90 h-[calc(100vh-53px)] sticky top-[53px] p-3 shadow-xs select-none">
      <div className="space-y-1.5 flex-1 overflow-y-auto pr-1">
        {menuGroups.map((group) => {
          if (group.isSingle) {
            const Icon = group.icon;
            const isActive = location.pathname === group.path;
            return (
              <button
                key={group.path}
                onClick={() => navigate(group.path)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-brand-500 text-slate-950 shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                  <span>{group.label}</span>
                </div>
              </button>
            );
          }

          const isOpen = openGroups[group.id];
          const hasActiveChild = group.children.some(c => c.path === location.pathname);
          const GroupIcon = group.icon;

          return (
            <div key={group.id} className="rounded-xl overflow-hidden border border-slate-100 bg-slate-50/50 mb-1">
              {/* Collapsible Folder Header (JSON Tree Root) */}
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-black transition-all ${
                  hasActiveChild
                    ? 'bg-brand-50 text-brand-950 border-b border-brand-200/60'
                    : 'text-slate-700 hover:bg-slate-100/90'
                }`}
              >
                <div className="flex items-center gap-2">
                  <GroupIcon className={`w-4 h-4 ${hasActiveChild ? 'text-brand-600' : 'text-slate-400'}`} />
                  <span>{group.label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {group.badge && (
                    <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-md font-bold bg-slate-200 text-slate-700">
                      {group.badge}
                    </span>
                  )}
                  {isOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>
              </button>

              {/* Tree Branch Children */}
              {isOpen && (
                <div className="py-1 px-1 bg-white space-y-0.5">
                  {group.children.map((child) => {
                    const ChildIcon = child.icon;
                    const isChildActive = location.pathname === child.path;

                    return (
                      <button
                        key={child.path}
                        onClick={() => navigate(child.path)}
                        className={`w-full flex items-center justify-between pl-4 pr-2.5 py-2 rounded-lg text-xs transition-all relative ${
                          isChildActive
                            ? 'bg-brand-500 text-slate-950 font-black shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {/* Tree branch connector symbol */}
                          <span className={`font-mono text-[11px] select-none ${isChildActive ? 'text-slate-950 opacity-60' : 'text-slate-300'}`}>
                            {child.isLast ? '└──' : '├──'}
                          </span>
                          <ChildIcon className={`w-3.5 h-3.5 ${isChildActive ? 'text-slate-950' : 'text-slate-400'}`} />
                          <span className="truncate">{child.label}</span>
                        </div>

                        {child.badge && (
                          <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                            isChildActive ? 'bg-slate-950 text-brand-400' : 'bg-brand-100 text-brand-800'
                          }`}>
                            {child.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="pt-2.5 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between px-2">
        <span>Simple Billing</span>
        <span className="text-emerald-600 font-bold flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Online
        </span>
      </div>
    </aside>
  );
}
