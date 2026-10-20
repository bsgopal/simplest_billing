import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  X, 
  Trash2, 
  HelpCircle 
} from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const confirmResolveRef = useRef(null);

  // Normal Toast notifications
  const addToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 7);
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (msg, duration) => addToast(msg, 'success', duration),
    error: (msg, duration) => addToast(msg, 'error', duration || 4500),
    warning: (msg, duration) => addToast(msg, 'warning', duration),
    info: (msg, duration) => addToast(msg, 'info', duration),
    remove: removeToast
  };

  const snackbar = {
    ...toast,
    show: (msg, type = 'info', duration = 3500) => addToast(msg, type, duration)
  };

  // Safe window.alert interception so native blocking browser dialogs NEVER interrupt the user
  React.useEffect(() => {
    const originalAlert = window.alert;
    window.alert = (msg) => {
      const text = typeof msg === 'object' ? JSON.stringify(msg) : String(msg ?? '');
      const lower = text.toLowerCase();
      if (lower.includes('success') || lower.includes('saved') || lower.includes('updated') || lower.includes('created')) {
        toast.success(text);
      } else if (lower.includes('required') || lower.includes('please') || lower.includes('warning') || lower.includes('mandatory')) {
        toast.warning(text);
      } else {
        toast.error(text);
      }
    };
    return () => {
      window.alert = originalAlert;
    };
  }, [addToast]);

  // Modern In-App Snackbar / Confirmation Dialog
  const confirm = useCallback(({
    title = 'Are you sure?',
    message = '',
    description = '',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'danger' // 'danger', 'warning', 'info'
  }) => {
    return new Promise((resolve) => {
      confirmResolveRef.current = resolve;
      setConfirmDialog({
        title,
        message,
        description,
        confirmText,
        cancelText,
        type,
        isPrompt: false
      });
    });
  }, []);

  // Modern In-App Prompt Dialog (replaces window.prompt)
  const prompt = useCallback(({
    title = 'Input Required',
    message = '',
    placeholder = '',
    defaultValue = '',
    confirmText = 'Submit',
    cancelText = 'Cancel',
    type = 'info'
  }) => {
    return new Promise((resolve) => {
      confirmResolveRef.current = resolve;
      setConfirmDialog({
        title,
        message,
        placeholder,
        inputValue: defaultValue || '',
        confirmText,
        cancelText,
        type,
        isPrompt: true
      });
    });
  }, []);

  const handleConfirmAction = (result) => {
    if (confirmResolveRef.current) {
      if (confirmDialog?.isPrompt) {
        confirmResolveRef.current(result ? (confirmDialog.inputValue || '') : null);
      } else {
        confirmResolveRef.current(result);
      }
      confirmResolveRef.current = null;
    }
    setConfirmDialog(null);
  };

  return (
    <ToastContext.Provider value={{ toast, snackbar, showToast: addToast, showSnackbar: addToast, confirm, prompt }}>
      {children}

      {/* Floating Modern Toast / Snackbar Stack (Top-Right Fixed) */}
      <div className="fixed top-4 right-4 z-[99999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-3 sm:px-0">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl shadow-2xl border text-sm font-bold backdrop-blur-md transition-all duration-200 animate-in slide-in-from-top-3 fade-in ${
              t.type === 'success'
                ? 'bg-slate-900/95 text-white border-emerald-500 shadow-emerald-500/20'
                : t.type === 'error'
                ? 'bg-slate-900/95 text-white border-red-500 shadow-red-500/20'
                : t.type === 'warning'
                ? 'bg-slate-900/95 text-white border-amber-500 shadow-amber-500/20'
                : 'bg-slate-900/95 text-white border-slate-700 shadow-slate-950/20'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              {t.type === 'error' && <AlertCircle className="w-5 h-5 text-red-400" />}
              {t.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400" />}
              {t.type === 'info' && <Info className="w-5 h-5 text-brand-400" />}
            </div>
            <div className="flex-1 leading-snug break-words">
              {t.message}
            </div>
            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="shrink-0 text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Confirmation Snackbar / Modal Overlay */}
      {confirmDialog && (
        <div 
          className="fixed inset-0 z-[9999] bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 sm:p-4 pb-20 sm:pb-4 animate-in fade-in duration-200"
          onClick={() => handleConfirmAction(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-150 p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start gap-3.5">
              <div className={`p-2.5 rounded-xl shrink-0 ${
                confirmDialog.type === 'danger'
                  ? 'bg-red-100 text-red-600 border border-red-200'
                  : confirmDialog.type === 'warning'
                  ? 'bg-amber-100 text-amber-600 border border-amber-200'
                  : 'bg-brand-100 text-brand-600 border border-brand-200'
              }`}>
                {confirmDialog.type === 'danger' && <Trash2 className="w-5 h-5" />}
                {confirmDialog.type === 'warning' && <AlertTriangle className="w-5 h-5" />}
                {confirmDialog.type === 'info' && <HelpCircle className="w-5 h-5" />}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-base font-black text-slate-900 leading-tight">
                  {confirmDialog.title}
                </h3>
                {confirmDialog.message && (
                  <p className="text-sm font-semibold text-slate-700 mt-1 leading-relaxed">
                    {confirmDialog.message}
                  </p>
                )}
                {confirmDialog.description && (
                  <p className="text-xs text-slate-500 mt-1 leading-normal">
                    {confirmDialog.description}
                  </p>
                )}
              </div>
            </div>

            {confirmDialog.isPrompt && (
              <div className="pt-1">
                <input
                  type="text"
                  autoFocus
                  value={confirmDialog.inputValue || ''}
                  onChange={(e) => setConfirmDialog((prev) => ({ ...prev, inputValue: e.target.value }))}
                  placeholder={confirmDialog.placeholder || ''}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleConfirmAction(true);
                    if (e.key === 'Escape') handleConfirmAction(false);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm font-semibold focus:outline-none focus:border-brand-500"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleConfirmAction(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                autoFocus={!confirmDialog.isPrompt}
              >
                {confirmDialog.cancelText || 'Cancel'}
              </button>

              <button
                type="button"
                onClick={() => handleConfirmAction(true)}
                className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition-colors cursor-pointer ${
                  confirmDialog.type === 'danger'
                    ? 'bg-red-600 hover:bg-red-700 shadow-red-600/30'
                    : confirmDialog.type === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/30'
                    : 'bg-brand-600 hover:bg-brand-700 shadow-brand-600/30'
                }`}
              >
                {confirmDialog.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export const useSnackbar = useToast;
