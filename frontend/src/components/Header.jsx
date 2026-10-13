import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBilling } from '../context/BillingContext';
import logoImg from '../assets/logo.png';
import { useLanguage } from '../context/LanguageContext';
import { 
  Store, 
  LogOut, 
  PauseCircle, 
  PlusCircle, 
  Calendar,
  UserCheck,
  Maximize2,
  Minimize2,
  Globe,
  Check,
  ChevronDown
} from 'lucide-react';

export default function Header() {
  const { user, shop, logout } = useAuth();
  const { heldBills, resumeHeldBill } = useBilling();
  const { currentLang, selectLanguage, languageList, getLanguageInfo } = useLanguage();
  const [showHeldModal, setShowHeldModal] = useState(false);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentDate, setCurrentDate] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const activeLangInfo = getLanguageInfo();

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentDate(now.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <>
      <header className="bg-white text-slate-900 border-b border-slate-200 sticky top-0 z-40 px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between shadow-xs">
        {/* Left: Brand & Shop Info */}
        <div className="flex items-center gap-2 sm:gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <img 
            src={logoImg} 
            alt="Logo" 
            className="h-8 sm:h-10 w-auto object-contain rounded"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-slate-900 flex items-center gap-1">
                {shop?.shopName || 'Simple Retail'}
              </h1>
              <span className="hidden sm:inline-block px-1.5 py-0.2 text-[10px] font-bold rounded uppercase bg-brand-100 text-brand-800 border border-brand-300">
                {shop?.shopType || 'Retail'}
              </span>
            </div>
            <p className="hidden sm:flex text-[10px] sm:text-xs text-slate-500 items-center gap-1.5 font-medium">
              <Calendar className="w-3 h-3 text-brand-600 shrink-0" />
              <span>{currentDate}</span>
              <span className="text-slate-300">•</span>
              <UserCheck className="w-3 h-3 text-brand-600 shrink-0" />
              <span className="capitalize">{user?.name} ({user?.role})</span>
            </p>
          </div>
        </div>

        {/* Center/Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Held Bills Tray */}
          {heldBills.length > 0 && (
            <button
              onClick={() => setShowHeldModal(true)}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-300 rounded-xl text-xs font-bold transition animate-pulse"
              title="Resume held bills"
            >
              <PauseCircle className="w-4 h-4 text-amber-600" />
              <span>Held ({heldBills.length})</span>
            </button>
          )}

          {/* Quick New Bill Button */}
          {location.pathname !== '/billing' && (
            <button
              onClick={() => navigate('/billing')}
              className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-slate-950 font-black rounded-xl text-xs transition shadow-xs"
            >
              <PlusCircle className="w-4 h-4" />
              <span>New Bill</span>
            </button>
          )}

          {/* Quick Language Selector */}
          <div className="relative">
            <button
              onClick={() => setShowLangDropdown(!showLangDropdown)}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-black transition border border-slate-200 select-none shadow-2xs"
              title="Store Language & Script"
            >
              <Globe className="w-3.5 h-3.5 text-brand-600 shrink-0" />
              <span className="max-w-[48px] sm:max-w-none truncate">{activeLangInfo?.native || 'தமிழ்'}</span>
              <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
            </button>

            {showLangDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowLangDropdown(false)} 
                />
                <div className="absolute right-0 mt-1.5 w-44 bg-white rounded-xl shadow-xl border border-slate-200 p-1 z-50 animate-in fade-in zoom-in-95 duration-100 text-xs">
                  <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Store Language
                  </div>
                  {languageList.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        selectLanguage(lang.code);
                        setShowLangDropdown(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left font-bold transition ${
                        currentLang === lang.code
                          ? 'bg-brand-50 text-brand-900 font-black'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>{lang.native} ({lang.label})</span>
                      {currentLang === lang.code && <Check className="w-3.5 h-3.5 text-brand-600" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="hidden sm:block p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Logout Button */}
          <button
            onClick={logout}
            className="flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1.5 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-xl text-xs font-bold transition shrink-0"
            title="Lock screen / Logout"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Lock</span>
          </button>
        </div>
      </header>

      {/* Held Bills Modal */}
      {showHeldModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 flex items-center gap-2">
                <PauseCircle className="w-5 h-5 text-amber-500" />
                Held Bills ({heldBills.length})
              </h3>
              <button 
                onClick={() => setShowHeldModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg p-1"
              >
                ✕
              </button>
            </div>

            <div className="mt-3 space-y-2 max-h-72 overflow-y-auto">
              {heldBills.map((b) => (
                <div 
                  key={b._id}
                  className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-brand-500/50 rounded-xl flex items-center justify-between transition cursor-pointer"
                  onClick={() => {
                    resumeHeldBill(b);
                    setShowHeldModal(false);
                    navigate('/billing');
                  }}
                >
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{b.customerName || 'Walk-in'}</p>
                    <p className="text-xs text-slate-500">
                      {b.items?.length || 0} items • {new Date(b.heldAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-brand-700 text-sm">₹{(b.subTotal || 0).toFixed(2)}</p>
                    <span className="text-[10px] font-bold text-blue-600 underline">Resume</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowHeldModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
