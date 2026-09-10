import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../db.js";

const router = express.Router();

router.post("/login", (req, res) => {
  const { password } = req.body;
  const email = (process.env.OWNER_EMAIL || "owner@kelapatuabangcut.local").toLowerCase();

  if (!password) {
    return res.status(400).json({ error: "Password wajib diisi" });
  }

  db.get("SELECT * FROM users WHERE email = ?", [email], (err, user) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (!user) return res.status(401).json({ error: "Owner account belum di-seed" });

    const isValid = bcrypt.compareSync(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: "Password owner salah" });
    }

    const secret = process.env.JWT_SECRET || "fallback_secret_666";
    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      secret,
      { expiresIn: process.env.JWT_EXPIRES || "30m" }
    );

    res.json({ token, expires: process.env.JWT_EXPIRES || "30m" });
  });
});

export default router;
