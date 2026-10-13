import React, { useState, useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { 
  Printer, 
  X, 
  Search, 
  Barcode, 
  CheckSquare, 
  Square
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function BarcodeCheatSheetModal({
  isOpen,
  onClose,
  items = [],
  categories = []
}) {
  const { currentLang } = useLanguage();
  const [selectedCat, setSelectedCat] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const printRef = useRef(null);

  const getItemDisplayName = (it, lang = currentLang) => {
    if (!it) return '';
    if (lang !== 'en' && it.translations && it.translations[lang]) {
      return it.translations[lang];
    }
    return it.name;
  };

  // Filter items: loose / decimal items or items without branded barcodes
  const candidateItems = items.filter(it => {
    const matchesCat = selectedCat === 'All' || it.category === selectedCat;
    const q = search.toLowerCase().trim();
    if (!q) return matchesCat;
    const matchName = it.name.toLowerCase().includes(q);
    const matchTrans = it.translations && Object.values(it.translations).some(
      t => t && t.toLowerCase().includes(q)
    );
    const matchCode = it.code && it.code.toLowerCase().includes(q);
    return matchesCat && (matchName || matchTrans || matchCode);
  });

  // Default select all loose / candidate items
  useEffect(() => {
    if (isOpen && items.length > 0) {
      const defaultSet = new Set(
        items
          .filter(i => i.allowDecimals || ['kg', 'gram', 'litre', 'ml'].includes(i.unit?.toLowerCase()) || !i.barcode)
          .map(i => i._id)
      );
      setSelectedIds(defaultSet.size > 0 ? defaultSet : new Set(items.map(i => i._id)));
    }
  }, [isOpen, items]);

  const toggleSelectAll = () => {
    if (selectedIds.size === candidateItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(candidateItems.map(i => i._id)));
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedList = items.filter(i => selectedIds.has(i._id));

  // Render SVG barcodes with JsBarcode
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      selectedList.forEach(item => {
        const svgEl = document.getElementById(`cheat-barcode-${item._id}`);
        if (svgEl) {
          try {
            const codeToEncode = (item.barcode || item.code || String(item._id).slice(-8)).toUpperCase();
            JsBarcode(svgEl, codeToEncode, {
              format: 'CODE128',
              lineColor: '#000000',
              width: 1.6,
              height: 38,
              displayValue: true,
              fontSize: 11,
              font: 'monospace',
              fontOptions: 'bold',
              margin: 4
            });
          } catch (e) {
            console.error('JsBarcode render error for', item.name, e);
          }
        }
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [isOpen, selectedIds, selectedCat, search]);

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] print:max-h-none print:m-0 print:p-0 print:border-none print:shadow-none print:w-full">
        
        {/* Modal Header (Hidden on print) */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-brand-100 rounded-2xl text-brand-800">
              <Barcode className="w-5 h-5 text-brand-700" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base sm:text-lg flex items-center gap-2">
                Barcode Cheat Sheet Generator
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-100 text-brand-900 border border-brand-300">
                  D-MART / CASHIER STYLE
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Print a scannable menu card for Dal, Spices, Grains, and loose items to stick at the billing desk.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={selectedList.length === 0}
              className="px-4 py-2 bg-brand-500 hover:bg-brand-400 text-slate-950 font-black rounded-xl text-xs sm:text-sm shadow-xs flex items-center gap-1.5 active:scale-95 transition disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>Print Cheat Sheet ({selectedList.length})</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter controls (Hidden on print) */}
        <div className="py-3 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar flex-1">
            <button
              type="button"
              onClick={() => setSelectedCat('All')}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                selectedCat === 'All'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({items.length})
            </button>
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setSelectedCat(c)}
                className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  selectedCat === c
                    ? 'bg-brand-500 text-slate-950 shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="relative w-48">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-brand-500"
              />
            </div>

            <button
              type="button"
              onClick={toggleSelectAll}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1 transition"
            >
              {selectedIds.size === candidateItems.length ? <CheckSquare className="w-3.5 h-3.5 text-brand-600" /> : <Square className="w-3.5 h-3.5" />}
              <span>Select All</span>
            </button>
          </div>
        </div>

        {/* Printable Grid Container */}
        <div 
          ref={printRef}
          className="flex-1 overflow-y-auto py-4 print:overflow-visible print:p-0"
        >
          {selectedList.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Barcode className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="font-bold text-slate-700 text-sm">No items selected</p>
              <p className="text-xs text-slate-400 mt-0.5">Please check one or more items above to generate scannable barcodes</p>
            </div>
          ) : (
            <div>
              {/* Print Sheet Header Banner */}
              <div className="hidden print:block text-center pb-3 mb-4 border-b-2 border-black">
                <h2 className="text-xl font-black uppercase tracking-wider">
                  Loose Items Barcode Menu Card (Cheat Sheet)
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Scan any barcode with the barcode gun to instantly bill loose products
                </p>
              </div>

              {/* 3-Column Barcode Cards Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 print:grid-cols-3 print:gap-2.5">
                {candidateItems.map((item) => {
                  const isChecked = selectedIds.has(item._id);
                  if (!isChecked) return null;

                  return (
                    <div
                      key={item._id}
                      onClick={() => toggleSelectOne(item._id)}
                      className="p-3 bg-white border-2 border-slate-200 rounded-2xl flex flex-col items-center justify-between text-center relative group hover:border-brand-500 transition cursor-pointer print:border-black print:rounded-lg print:p-2"
                    >
                      {/* Checkbox indicator (Hidden on print) */}
                      <div className="absolute top-2 left-2 print:hidden">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-brand-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300" />
                        )}
                      </div>

                      {/* Product Name & Short Code */}
                      <div className="w-full pt-1">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <h4 className="font-black text-xs sm:text-sm text-slate-900 leading-tight">
                            {getItemDisplayName(item)}
                          </h4>
                          {item.code && (
                            <span className="px-1.5 py-0.5 bg-slate-100 font-mono text-[10px] font-black rounded border border-slate-300">
                              #{item.code}
                            </span>
                          )}
                        </div>
                        {currentLang !== 'en' && item.translations?.[currentLang] && (
                          <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                            {item.name}
                          </p>
                        )}
                      </div>

                      {/* Barcode SVG Generated */}
                      <div className="w-full flex items-center justify-center my-1.5">
                        <svg id={`cheat-barcode-${item._id}`} className="max-w-full"></svg>
                      </div>

                      {/* Price and Unit Pill */}
                      <div className="w-full pt-1 border-t border-slate-100 print:border-black flex items-center justify-between text-xs font-bold text-slate-700">
                        <span className="font-mono text-slate-500 text-[11px] uppercase">
                          Unit: {item.unit}
                        </span>
                        <span className="font-black font-mono text-slate-950 text-xs sm:text-sm">
                          ₹{item.sellingPrice.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer (Hidden on print) */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 shrink-0 print:hidden">
          <span>
            Tip: Print on A4 paper and stick next to your keyboard or monitor.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
