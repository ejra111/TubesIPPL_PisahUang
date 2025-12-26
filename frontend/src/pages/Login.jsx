import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../state/auth.jsx";
import { API_URL } from "../state/auth.jsx";
import { useToast } from "../state/toast.jsx";

// Komponen halaman login
export default function Login() {
  const { setToken, setUsername } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [err, setErr] = useState("");
  const toast = useToast();
  const onSubmit = async e => {
    e.preventDefault();
    setErr("");

    if (!form.email || !form.password) {
      setErr("Email dan password harus diisi");
      toast.show("Email dan password harus diisi", { type: 'error' });
      return;
    }

    // Validasi format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      setErr("Format email tidak valid");
      toast.show("Format email tidak valid", { type: 'error' });
      return;
    }

    try {
      const res = await fetch(`${API_URL}/auth/login`, { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(form) 
      });
      const data = await res.json();

      if (res.ok && data.token) { 
        console.log("Login response data:", data);
        toast.show("Login berhasil!", { type: 'success' });
        setToken(data.token);
        setUsername(data.username);
        nav("/"); 
      } else {
        const errorMessage = data.message || "Email atau password salah";
        setErr(errorMessage);
        toast.show(errorMessage, { type: 'error' });
      }
    } catch (error) {
      setErr("Terjadi kesalahan jaringan");
      toast.show("Terjadi kesalahan jaringan", { type: 'error' });
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
          <div className="group-title">Masuk ke Akun Anda</div>
          <div className="muted" style={{ marginBottom: 10 }}>Login atau buat akun baru untuk mulai</div>
          <div className="tabs">
            <Link className="tab active" to="/login">Login</Link>
            <Link className="tab" to="/register">Sign Up</Link>
          </div>
          <form onSubmit={onSubmit}>
            <div className="muted" style={{ fontSize: 13, marginBottom: 4 }}>Email</div>
            <input className="input" placeholder="nama@email.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <div className="muted" style={{ fontSize: 13, marginBottom: 4 }}>Password</div>
            <input className="input" placeholder="password" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            {err ? <div className="muted" style={{ color: "#b91c1c", marginBottom: 8 }}>{err}</div> : null}
            <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>Login</button>
          </form>
        </div>
      </div>
    </div>
  );
}
