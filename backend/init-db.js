import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { db, initDb } from "./db.js";
dotenv.config();

initDb();

const email = (process.env.OWNER_EMAIL || "owner@kelapatuabangcut.local").toLowerCase();
const pass = process.env.OWNER_PASS || "owner123";

const hash = bcrypt.hashSync(pass, 12);
const now = new Date().toISOString();

db.run(`INSERT OR IGNORE INTO users (email, password_hash, role, created_at) VALUES (?,?, 'owner', ?)`,
  [email, hash, now],
  function (err) {
    if (err) { console.error(err); process.exit(1); }
    console.log(`Owner seeded: ${email} (ubah OWNER_PASS setelah init)`);
    process.exit(0);
  }
);
