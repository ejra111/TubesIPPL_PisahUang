import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import billRoutes from "./routes/bills.js";

// Load environment variables
dotenv.config();

// Inisialisasi aplikasi Express
const app = express();

// Middleware untuk mengizinkan CORS
app.use(cors({
  exposedHeaders: ['Content-Disposition']
}));

// Middleware untuk parsing JSON body
app.use(express.json());

// Endpoint health check untuk memverifikasi server berjalan
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Mount routes untuk autentikasi
app.use("/auth", authRoutes);

// Mount routes untuk operasi bills
app.use("/bills", billRoutes);

// Port dari environment atau default 4000
const port = process.env.PORT || 4000;

// Jalankan server
app.listen(port, () => { });

