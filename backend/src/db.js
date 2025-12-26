import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config();

let pool;

// Fungsi untuk mendapatkan connection pool MySQL (singleton pattern)
export function getPool() {
  if (pool) return pool;
  const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
  if (!DB_HOST || !DB_USER || !DB_NAME) return null;
  pool = mysql.createPool({
    host: DB_HOST,
    port: DB_PORT ? Number(DB_PORT) : 3306,
    user: DB_USER,
    password: DB_PASSWORD || "",
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
  return pool;
}

// Fungsi untuk menjalankan query SQL dengan parameter
export async function query(sql, params) {
  const p = getPool();
  if (!p) throw new Error("Database not configured");
  const [rows] = await p.query(sql, params);
  return rows;
}

