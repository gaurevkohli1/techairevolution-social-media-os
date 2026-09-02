import mysql from "mysql2/promise";
import { config } from "./config.js";

export const db = mysql.createPool({
  host: config.DB_HOST,
  port: config.DB_PORT,
  database: config.DB_NAME,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  waitForConnections: true,
  connectionLimit: 8,
  maxIdle: 4,
  enableKeepAlive: true,
  timezone: "Z"
});

export async function withNamedLock<T>(name: string, fn: () => Promise<T>): Promise<T | null> {
  const conn = await db.getConnection();
  try {
    const [rows] = await conn.query<any[]>("SELECT GET_LOCK(?, 0) AS locked", [name]);
    if (!rows?.[0]?.locked) return null;
    try {
      return await fn();
    } finally {
      await conn.query("SELECT RELEASE_LOCK(?)", [name]);
    }
  } finally {
    conn.release();
  }
}
