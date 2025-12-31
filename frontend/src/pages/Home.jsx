import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, API_URL } from "../state/auth.jsx";
import logoutIcon from "../assets/logout_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg";
import { useToast } from "../state/toast.jsx";
import { useModal } from "../state/modal.jsx";

export default function Home() {
  const { token, username, logout } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const modal = useModal();
  const [title, setTitle] = useState("");

  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const handleCreate = async () => {
    const t = title.trim();
    if (!t) {
      toast.show("Nama split bill harus diisi", { type: 'error' });
      return;
    }
    try {
      const res = await fetch(`${API_URL}/bills`, { method: "POST", headers, body: JSON.stringify({ title: t }) });
      const data = await res.json();
      if (res.ok && data.id) {
        toast.show("Bill berhasil dibuat", { type: 'success' });
        nav(`/split/${data.id}`);
      } else {
        modal.show({ type: 'error', message: data.message || 'Gagal membuat bill' });
      }
    } catch (e) {
      console.error(e);
      modal.show({ type: 'error', message: 'Terjadi kesalahan saat membuat bill' });
    }
  };

  const handleViewHistory = async () => {
    try {
      const res = await fetch(`${API_URL}/bills/history`, { headers });
      const data = await res.json();
      if (!res.ok) {
        modal.show({ type: 'error', message: data.message || 'Gagal memuat history' });
        return;
      }
      const text = (data.bills || []).map(b => {
        const d = new Date(b.created_at);
        const ds = isNaN(d.getTime()) ? String(b.created_at) : d.toLocaleString('id-ID');
        return `#${b.id} · ${b.title} · ${ds}`;
      }).join('\n');
      modal.show({ title: 'History Bills', message: text || 'Belum ada riwayat' });
    } catch (e) {
      console.error(e);
      modal.show({ type: 'error', message: 'Terjadi kesalahan saat memuat history' });
    }
  };

  return (
    <div className="layout">
      <div className="topbar">
        <div className="brand" style={{ marginTop: 0 }}>
          <div className="logo">🍌</div>
          <div>
            <div className="title">Pisang</div>
            <div className="subtitle">Pisah Uang</div>
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
          <button className="btn btn-outline" onClick={logout} aria-label="Logout" title="Logout" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <img src={logoutIcon} alt="Logout" style={{ width: 18, height: 18, display: 'block' }} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>Logout</span>
          </button>
        </div>
      </div>
      <div className="container" style={{ marginTop: 22 }}>
        <div style={{ textAlign: 'center', marginBottom: 10 }}>
          <div className="title" style={{ fontSize: 28 }}>Halo {username || 'User'}</div>
          <div className="subtitle">Mari mulai dengan memilih salah satu</div>
        </div>
        <div className="hero-choice">
          <div className="hero-card left">
            <div className="hero-title">Lihat History</div>
            <div className="hero-sub">Daftar bill yang pernah Anda buat</div>
            <button className="btn btn-primary hero-btn" onClick={() => nav('/history')}>Buka History</button>
          </div>
          <div className="hero-card right">
            <div className="hero-title">Buat Bill Baru</div>
            <div className="hero-sub">Masukkan nama bill lalu mulai</div>
            <form onSubmit={e => { e.preventDefault(); handleCreate(); }} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <input className="input" placeholder="Nama split bill" value={title} onChange={e => setTitle(e.target.value)} />
              <button type="submit" className="btn btn-green hero-btn">Mulai</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
