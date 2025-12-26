import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { query } from "../db.js";

const router = Router();

// Endpoint untuk registrasi user baru
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body || {};
    
    console.log("Register attempt:", { username, email });
    
    // Validasi field tidak kosong
    if (!username || !email || !password) {
      return res.status(400).json({ error: "invalid", message: "Semua field harus diisi" });
    }
    
    // Validasi format email sederhana
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "invalid_email", message: "Format email tidak valid" });
    }
    
    // Validasi password minimal 6 karakter
    if (password.length < 6) {
      return res.status(400).json({ error: "weak_password", message: "Password minimal 6 karakter" });
    }
    
    // Normalize email to lowercase and check if email or username already exists
    const normalizedEmail = String(email).toLowerCase();
    let exist;
    try {
      exist = await query("SELECT id FROM users WHERE LOWER(username)=LOWER(?) OR LOWER(email)=LOWER(?) LIMIT 1", [username, normalizedEmail]);
    } catch (err) {
      console.error("Query error:", err);
      return res.status(500).json({ error: "db_error", message: "Gagal mengakses database" });
    }

    if (exist && exist.length) {
      return res.status(409).json({ error: "exists", message: "Email atau username sudah terdaftar" });
    }

    const hash = await bcrypt.hash(password, 10);
    let result;
    try {
      result = await query("INSERT INTO users(username,email,password_hash,created_at) VALUES(?,?,?,NOW())", [username, normalizedEmail, hash]);
    } catch (err) {
      console.error("Insert error:", err);
      return res.status(500).json({ error: "db_error", message: "Gagal menyimpan user ke database" });
    }

    // Check insert result (mysql2 returns an object with insertId for INSERT)
    if (!result || (result && result.insertId == null && result.affectedRows == null)) {
      console.error("Insert returned unexpected result:", result);
      return res.status(500).json({ error: "db_error", message: "Gagal menyimpan user ke database" });
    }

    console.log("Register success for:", username);
    res.json({ ok: true, message: "Pendaftaran berhasil" });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "server_error", message: "Terjadi kesalahan server" });
  }
});

// Endpoint untuk login user
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    
    console.log("Login attempt:", { email });
    
    if (!email || !password) {
      return res.status(400).json({ error: "invalid", message: "Email dan password harus diisi" });
    }
    
    // Validasi format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "invalid_email", message: "Format email tidak valid" });
    }
    
    // Query hanya menggunakan email
    let users;
    try {
      users = await query("SELECT id,username,email,password_hash FROM users WHERE LOWER(email)=LOWER(?) LIMIT 1", [email]);
    } catch (err) {
      console.error("Query error:", err);
      return res.status(500).json({ error: "db_error", message: "Gagal mengakses database" });
    }

    if (!users || !users.length) {
      return res.status(401).json({ error: "unauthorized", message: "Email atau password salah" });
    }
    
    const user = users[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      console.log("Login failed: invalid password for", user.email);
      return res.status(401).json({ error: "unauthorized", message: "Email atau password salah" });
    }
    
    console.log("Login success for:", user.email);
    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET || "dev", { expiresIn: "7d" });
    res.json({ token, username: user.username });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "server_error", message: "Terjadi kesalahan server" });
  }
});

export default router;

