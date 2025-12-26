import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

const ToastContext = createContext(null);

// Provider untuk state toast notifications
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const show = useCallback((message, options = {}) => {
    const id = Date.now() + Math.random().toString(36).slice(2, 9);
    const toast = { id, message, type: options.type || "info", duration: options.duration || 4000 };
    setToasts(t => [...t, toast]);
    if (toast.duration > 0) {
      setTimeout(() => {
        setToasts(t => t.filter(x => x.id !== id));
      }, toast.duration);
    }
    return id;
  }, []);

  const hide = useCallback((id) => {
    setToasts(t => t.filter(x => x.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ show, hide }}>
      {children}

      {/* CENTERED TOAST LAYER: toasts appear centered (vertical+horizontal) */}
      <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, pointerEvents: 'none' }}>
        <div style={{ pointerEvents: 'auto', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', padding: 8 }}>
          {toasts.map(t => (
            <Toast key={t.id} {...t} onClose={() => hide(t.id)} />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

// Hook untuk menggunakan toast
export function useToast() {
  return useContext(ToastContext);
}

// Komponen untuk menampilkan toast individual
function Toast({ id, message, type = 'info', onClose }) {
  const isSuccess = type === 'success';
  const isError = type === 'error';
  // Use white card for both success and error popups (icon indicates state)
  const bg = '#ffffff';
  const color = isSuccess ? '#064e3b' : isError ? '#7f1d1d' : '#111827';
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    // entrance animation
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => {
      cancelAnimationFrame(raf);
    };
  }, []);

  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    width: 300,
    height: 300,
    maxWidth: '92vw',
    padding: '18px 20px',
    borderRadius: 16,
    background: bg,
    color,
    boxShadow: '0 18px 50px rgba(2,6,23,0.12)',
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    textAlign: 'center',
    transform: visible ? 'translateY(0)' : 'translateY(-6px)',
    opacity: visible ? 1 : 0,
    transition: 'transform 220ms cubic-bezier(.2,.9,.3,1), opacity 220ms ease',
    position: 'relative'
  };

  const closeStyle = { position: 'absolute', top: 12, right: 12, cursor: 'pointer', opacity: 0.8, padding: '6px', borderRadius: 6, background: 'rgba(0,0,0,0.06)', color: isSuccess ? '#064e3b' : (isError ? '#7f1d1d' : '#444'), display: 'flex', alignItems: 'center', justifyContent: 'center' };

  const topIcon = isSuccess ? (
    <div style={{ width: 96, height: 96, borderRadius: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 64, height: 64, borderRadius: 9999, background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <path d="M20 6L9 17L4 12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  ) : (
    <div style={{ width: 96, height: 96, borderRadius: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 64, height: 64, borderRadius: 9999, background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 28 }}>✕</div>
    </div>
  );

  const titleStyle = { fontSize: 20, marginTop: 4, marginBottom: 6 };
  const msgStyle = { fontSize: 14, color: isSuccess ? '#064e3b' : (type === 'error' ? '#fff' : '#fff') };

  return (
    <div style={containerStyle} role="status" aria-live="polite">
      <div style={closeStyle} onClick={onClose} aria-label="tutup">✕</div>
      {topIcon}
      <div style={titleStyle}>{isSuccess ? 'Sukses' : isError ? 'Gagal' : ''}</div>
      <div style={msgStyle}>{message}</div>
    </div>
  );
}
