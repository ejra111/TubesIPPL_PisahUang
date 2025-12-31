import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, API_URL } from "../state/auth.jsx";
import logoutIcon from "../assets/logout_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg";

export default function History() {
  const { token, username, logout } = useAuth();
  const nav = useNavigate();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/bills/historyFull`, { headers });
        const data = await res.json();
        if (res.ok) setBills(data.bills || []);
      } catch { }
      setLoading(false);
    };
    load();
  }, []);

  const deleteBill = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    console.log(`[UI] Delete button clicked for bill ${id}`);

    // Confirm dialog removed as requested
    // if (!window.confirm("Apakah Anda yakin ingin menghapus bill ini secara permanen?")) {
    //   console.log(`[UI] Deletion cancelled by user`);
    //   return;
    // }

    try {
      console.log(`[UI] Sending DELETE request for ${id}...`);
      const res = await fetch(`${API_URL}/bills/${id}`, { method: "DELETE", headers });
      const data = await res.json();

      console.log(`[UI] Response: ${res.status}`, data);

      if (res.ok) {
        setBills(prev => prev.filter(b => b.id !== id));
        alert("Bill berhasil dihapus!");
      } else {
        alert(`Gagal: ${res.status} - ${data.message || "Gagal menghapus bill"}`);
      }
    } catch (err) {
      console.error("[UI] Exception:", err);
      alert(`Error network/client: ${err.message}`);
    }
  };

  const idr = v => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(v || 0));

  return (
    <div className="layout">
      <div className="topbar">
        <div className="brand" style={{ marginTop: 0 }}>
          <div className="logo">🍌</div>
          <div>
            <div className="title">History Bills</div>
            <div className="subtitle">Lihat dan buka kembali bill Anda</div>
          </div>
        </div>
        <div className="actions">
          <div className="user-section">
            <div className="user-greeting">Halo,</div>
            <div className="user-display">
              <svg className="user-avatar" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="8" r="4" />
                <path d="M 12 14 C 8 14 5 16 5 20 L 19 20 C 19 16 16 14 12 14 Z" />
              </svg>
              <span className="user-name">{username || 'User'}</span>
            </div>
          </div>
          <button className="btn btn-outline" onClick={() => nav('/')} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Kembali</span>
          </button>
          <button className="btn btn-outline" onClick={logout} aria-label="Logout" title="Logout" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <img src={logoutIcon} alt="Logout" style={{ width: 18, height: 18, display: 'block' }} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>Logout</span>
          </button>
        </div>
      </div>
      <div className="container" style={{ marginTop: 12 }}>
        {loading ? (
          <div className="muted">Memuat...</div>
        ) : bills.length === 0 ? (
          <div className="muted">Belum ada bill tersimpan</div>
        ) : (
          <div className="grid-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
            {bills.map(b => (
              <div key={b.id} className="card" style={{ borderRadius: 18 }}>
                <div className="group-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{b.title || `Bill #${b.id}`}</span>
                  {/* Penomoran dihapus */}
                </div>
                <div className="muted" style={{ marginBottom: 8 }}>{new Date(b.created_at).toLocaleString('id-ID')}</div>
                <div className="summary-item"><span className="summary-label">Peserta</span><span>{b.participants_count}</span></div>
                <div className="summary-item"><span className="summary-label">Items</span><span>{b.items_count}</span></div>
                <div className="summary-item"><span className="summary-label">Subtotal</span><span>{idr(b.subtotal)}</span></div>
                <div className="summary-item"><span className="summary-label">Diskon</span><span>{idr(b.discount)}</span></div>
                <div className="summary-item"><span className="summary-label">Tip</span><span>{idr(b.tip)}</span></div>
                <div className="summary-item"><span className="summary-label">Tax</span><span>{idr(b.tax)}</span></div>
                <div className="summary-total">{idr(b.total)}</div>
                <div className="actions" style={{ marginTop: 8 }}>
                  <button className="btn btn-primary" onClick={() => nav(`/split/${b.id}`)}>Buka</button>
                  <button className="btn btn-danger" onClick={(e) => deleteBill(e, b.id)}>Hapus</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
