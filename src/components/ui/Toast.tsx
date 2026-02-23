import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';

type ToastType = 'info' | 'success' | 'error' | 'warning';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number; // ms
}

interface ToastContextValue {
  push: (toast: Omit<ToastMessage, 'id'>) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

export const ToastProvider: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const push = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const msg: ToastMessage = { id, ...toast };
    setToasts((s) => [msg, ...s]);
    return id;
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((s) => s.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ push, dismiss }}>
      {children}
      {createPortal(<ToastContainer toasts={toasts} onDismiss={dismiss} />, document.body)}
    </ToastContext.Provider>
  );
};

const ToastContainer: React.FC<{ toasts: ToastMessage[]; onDismiss: (id: string) => void }> = ({ toasts, onDismiss }) => {
  useEffect(() => {
    // cleanup on unmount handled by React
  }, []);

  return (
    <div style={{ position: 'fixed', right: 20, top: 20, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onClose={() => onDismiss(t.id)} />
      ))}
    </div>
  );
};

const typeColors: Record<ToastType, { bg: string; color: string }> = {
  info: { bg: 'linear-gradient(145deg, #e6f0ff, #dbe9ff)', color: '#1e3a8a' },
  success: { bg: 'linear-gradient(145deg, #d1fae5, #a7f3d0)', color: '#065f46' },
  error: { bg: 'linear-gradient(145deg, #fee2e2, #fecaca)', color: '#831843' },
  warning: { bg: 'linear-gradient(145deg, #fff7ed, #ffedd5)', color: '#92400e' }
};

const Toast: React.FC<{ toast: ToastMessage; onClose: () => void }> = ({ toast, onClose }) => {
  useEffect(() => {
    if (toast.duration !== 0) {
      const timeout = setTimeout(() => onClose(), toast.duration || 5000);
      return () => clearTimeout(timeout);
    }
  }, [toast, onClose]);

  const style = typeColors[toast.type] || typeColors.info;

  return (
    <div style={{ minWidth: 260, boxShadow: '0 8px 20px rgba(2,6,23,0.08)', borderRadius: 10, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start', background: style.bg }}>
      <div style={{ flex: 1 }}>
        {toast.title && <div style={{ fontWeight: 700, color: style.color, marginBottom: 4 }}>{toast.title}</div>}
        <div style={{ color: '#0f172a', opacity: 0.9 }}>{toast.message}</div>
      </div>
      <button aria-label="Dismiss toast" onClick={onClose} style={{ background: 'transparent', border: 0, color: style.color, cursor: 'pointer' }}>✕</button>
    </div>
  );
};

export default ToastProvider;
