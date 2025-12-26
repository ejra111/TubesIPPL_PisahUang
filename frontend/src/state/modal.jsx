import React, { createContext, useContext, useState, useCallback } from "react";

const ModalContext = createContext(null);

// Provider untuk state modal dialogs
export function ModalProvider({ children }) {
  const [modal, setModal] = useState(null);

  const show = useCallback(({ title, message, type = 'info', okText = 'Selesai', onOk } = {}) => {
    setModal({ title, message, type, okText, onOk });
  }, []);

  const hide = useCallback(() => setModal(null), []);

  return (
    <ModalContext.Provider value={{ show, hide }}>
      {children}
      {modal ? (
        <Modal {...modal} onClose={hide} />
      ) : null}
    </ModalContext.Provider>
  );
}

// Hook untuk menggunakan modal
export function useModal() {
  return useContext(ModalContext);
}

// Komponen untuk menampilkan modal dialog
function Modal({ title, message, type, okText, onOk, onClose }) {
  const overlayStyle = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    padding: 20
  };

  const isSuccess = type === 'success';

  const cardStyle = isSuccess ? {
    width: 360,
    maxWidth: '96%',
    background: '#ffffff',
    borderRadius: 24,
    padding: '42px 28px',
    boxShadow: '0 30px 80px rgba(2,6,23,0.18)',
    textAlign: 'center',
    fontFamily: 'Inter, Arial, sans-serif'
  } : {
    width: 360,
    maxWidth: '90%',
    background: '#fff',
    borderRadius: 20,
    padding: '32px 24px',
    boxShadow: '0 18px 40px rgba(0,0,0,0.12)',
    textAlign: 'center',
    fontFamily: 'Inter, Arial, sans-serif',
    position: 'relative'
  };

  const iconWrap = {
    width: 110,
    height: 110,
    borderRadius: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 18px',
    background: 'transparent'
  };

  const outerRing = (color) => ({
    width: 96,
    height: 96,
    borderRadius: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 24px rgba(2,6,23,0.08)',
    border: `6px solid ${color}`,
    background: '#fff'
  });

  const innerCircle = (bg) => ({
    width: 64,
    height: 64,
    borderRadius: 9999,
    background: bg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: 32,
    boxShadow: '0 6px 18px rgba(0,0,0,0.06)'
  });
  const titleStyle = isSuccess ? { fontSize: 28, marginBottom: 8, color: '#0f172a', fontWeight: 700 } : { fontSize: 20, marginBottom: 8, color: type === 'error' ? '#c53030' : '#1e7e34' };
  const subtitleStyle = { fontSize: 14, color: '#475569', marginBottom: 22 };

  const btnStyle = isSuccess ? {
    display: 'inline-block',
    padding: '12px 34px',
    borderRadius: 28,
    background: 'linear-gradient(180deg,#38a3ff,#2b8cff)',
    color: '#fff',
    cursor: 'pointer',
    border: 'none',
    fontWeight: 700,
    boxShadow: '0 12px 36px rgba(59,130,246,0.26)'
  } : {
    display: 'inline-block',
    padding: '10px 26px',
    borderRadius: 20,
    background: type === 'error' ? '#ef4444' : '#10b981',
    color: '#fff',
    cursor: 'pointer',
    border: 'none',
    fontWeight: 600
  };

  const handleOk = () => {
    try { if (onOk) onOk(); } catch (e) { }
    onClose();
  };

  // helper: infer localized title if none provided
  const inferSuccessTitle = () => {
    const txt = (title || message || '').toLowerCase();
    if (txt.includes('login') || txt.includes('masuk')) return 'Login Berhasil';
    if (txt.includes('sign up') || txt.includes('signup') || txt.includes('register') || txt.includes('daftar')) return 'Sign Up Berhasil';
    if (txt.includes('simpan') || txt.includes('save') || txt.includes('disimpan')) return 'Simpan Berhasil';
    return 'Sukses';
  };

  const displayOk = okText || 'Selesai';
  const displayTitle = isSuccess ? (title || inferSuccessTitle()) : (title || (type === 'error' ? 'Gagal' : 'Berhasil'));

  return (
    <div style={overlayStyle} role="dialog" aria-modal="true">
      <div style={cardStyle}>
        {/* small close button top-right */}
        <button onClick={onClose} aria-label="Tutup" style={{ position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: 8, background: '#fff', border: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" stroke="#9ca3af" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {isSuccess ? (
          <>
            <div style={iconWrap} aria-hidden>
                <div style={outerRing('#60a5fa')}>
                  <div style={innerCircle('#10b981')}>
                    {/* SVG check mark (file 020038) */}
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                      <path d="M20 6L9 17L4 12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
            </div>
            <div style={titleStyle}>{displayTitle === 'Success' ? 'Sukses' : displayTitle}</div>
            {message ? <div style={subtitleStyle}>{message}</div> : null}
            <div style={{ marginTop: 8 }}>
              <button style={btnStyle} onClick={handleOk}>{displayOk}</button>
            </div>
          </>
        ) : (
          <>
            {/* Error / non-success large card with red cross */}
            <div style={iconWrap} aria-hidden>
              <div style={outerRing('#f87171')}>
                <div style={innerCircle('#ef4444')}>
                  {/* SVG cross mark */}
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                    <path d="M18 6L6 18M6 6l12 12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </div>
            <div style={titleStyle}>{displayTitle}</div>
            {message ? <div style={{ fontSize: 14, color: '#b91c1c', marginBottom: 18 }}>{message}</div> : null}
            <div style={{ marginTop: 8 }}>
              <button style={btnStyle} onClick={handleOk}>{displayOk}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
