import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_URL } from "../state/auth.jsx";
import { useToast } from "../state/toast.jsx";

// Komponen halaman registrasi
export default function Register() {
  const nav = useNavigate();
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const toast = useToast();
  const onSubmit = async e => {
    e.preventDefault();
    setMsg("");
    setErr("");
    
    // Validasi lokal
    if (!form.username || !form.email || !form.password) {
      setErr("Semua field harus diisi");
      toast.show('Semua field harus diisi', { type: 'error', duration: 3500 });
      return;
    }
    
    // Validasi format email sederhana
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      setErr("Format email tidak valid");
      toast.show('Format email tidak valid', { type: 'error', duration: 3500 });
      return;
    }
    
    if (form.password.length < 6) {
      setErr("Password minimal 6 karakter");
      toast.show('Password minimal 6 karakter', { type: 'error', duration: 3500 });
      return;
    }
    
    if (form.password !== confirmPassword) {
      setErr("Password tidak cocok");
      toast.show('Password tidak cocok', { type: 'error', duration: 3500 });
      return;
    }
    
  try {
      const res = await fetch(`${API_URL}/auth/register`, { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(form) 
      });
      const data = await res.json();
      
      if (res.ok) {
        toast.show('Akun berhasil dibuat. Silakan login', { type: 'success', duration: 2000 });
        setTimeout(() => nav('/login'), 1100);
      } else {
        const errorMessage = data.message || "Pendaftaran gagal";
        setErr(errorMessage);
        toast.show(errorMessage, { type: 'error', duration: 3500 });
      }
    } catch (error) {
      setErr("Terjadi kesalahan jaringan");
      toast.show('Terjadi kesalahan jaringan', { type: 'error', duration: 3500 });
    }
  };
  return (
    <div className="auth-page">
      <div className="brand">
        <div className="logo">🍌</div>
        <div>
          <div className="title">Selamat Datang di Pisang</div>
          <div className="subtitle">Pisah Uang - Patungan jadi mudah</div>
        </div>
      </div>
      <div className="auth-wrap">
        <div className="card">
          <div className="group-title">Buat Akun Baru</div>
          <div className="muted" style={{ marginBottom: 10 }}>Daftar untuk mulai menggunakan Pisang!</div>
          <div className="tabs">
            <Link className="tab" to="/login">Login</Link>
            <Link className="tab active" to="/register">Sign Up</Link>
          </div>
          <form onSubmit={onSubmit}>
            <div className="muted" style={{ fontSize: 13, marginBottom: 4 }}>Nama</div>
            <input className="input" placeholder="Nama lengkap" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
            <div className="muted" style={{ fontSize: 13, marginBottom: 4 }}>Email</div>
            <input className="input" placeholder="nama@email.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <div className="muted" style={{ fontSize: 13, marginBottom: 4 }}>Password</div>
            <input className="input" placeholder="Minimal 6 karakter" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            <div className="muted" style={{ fontSize: 13, marginBottom: 4 }}>Konfirmasi Password</div>
            <input className="input" placeholder="Ulangi password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
            {msg ? <div className="muted" style={{ marginBottom: 8, color: "#059669" }}>{msg}</div> : null}
            {err ? <div className="muted" style={{ color: "#b91c1c", marginBottom: 8 }}>{err}</div> : null}
            <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>Buat Akun</button>
          </form>
        </div>
      </div>
    </div>
  );
}
