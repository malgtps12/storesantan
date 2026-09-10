import express from "express";
import multer from "multer";
import path from "path";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
dotenv.config();
import { dbSupabase } from "../db-supabase.js";
import { auth } from "../middleware/auth.js";
import { consumeHuman } from "./captcha.js";

const router = express.Router();
const upload = multer({ limits: { fileSize: 2 * 1024 * 1024 } });
const orderLimiter = rateLimit({ windowMs: 60*1000, max: 5, message: { error: "Terlalu banyak order. Tunggu 1 menit." } });

async function notifyOwnerWA(orderId, items, total) {
  const ownerPhone = process.env.OWNER_WA || "6289516353968";
  const text = `🔔 Order baru #${orderId.slice(-6)}\n${items.map(i=>`- ${i.name} x${i.quantity} = Rp${i.price*i.quantity}`).join("\n")}\nTotal: Rp${total}\nCek: http://localhost:3000/owner-dashboard.html`;
  const url = `https://wa.me/${ownerPhone}?text=${encodeURIComponent(text)}`;
  console.log(`[WA NOTIF] ${url}`);
  const token = process.env.FONNTE_TOKEN || process.env.WA_TOKEN;
  if (token) {
    fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: { Authorization: token, "Content-Type": "application/json" },
      body: JSON.stringify({ target: ownerPhone, message: text })
    }).catch(()=>{});
  }
}

router.post("/", orderLimiter, upload.single("proof"), async (req, res) => {
  try {
    const { items, total, humanToken } = req.body;
    if (!humanToken || !consumeHuman(humanToken)) {
      return res.status(403).json({ error: "Verifikasi manusia dulu (isi captcha)." });
    }
    const orderId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const proofPath = req.file ? `/uploads/${req.file.filename}` : null; // simplified local fallback
    const parsedItems = typeof items === "string" ? JSON.parse(items) : items;

    await dbSupabase.createOrder({
      id: orderId,
      items: parsedItems,
      total: Number(total),
      status: "pending",
      proof_path: proofPath,
      created_at: new Date().toISOString()
    });
    notifyOwnerWA(orderId, parsedItems, Number(total));
    res.json({ success: true, orderId });
  } catch (e) {
    res.status(500).json({ error: "Gagal simpan order ke Supabase: " + e.message });
  }
});

router.get("/", auth, async (req, res) => {
  try {
    const data = await dbSupabase.listOrders();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch("/:id/status", auth, async (req, res) => {
  try {
    await dbSupabase.updateStatus(req.params.id, req.body.status);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
