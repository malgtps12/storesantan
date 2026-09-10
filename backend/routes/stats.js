import express from "express";
import { db } from "../db.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

router.get("/summary", auth, (req, res) => {
  const { period } = req.query; // 'hari_ini', '7_hari', '30_hari', '1_tahun'
  
  db.all(
    `SELECT total, created_at, approved_at FROM orders WHERE status = 'approved'`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Gagal mengambil data statistik" });

      const now = new Date();
      let labels = [];
      let values = [];
      let total = 0;

      if (period === "hari_ini") {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const sum = rows.reduce((acc, r) => {
          const t = new Date(r.created_at).getTime();
          return t >= startOfDay ? acc + r.total : acc;
        }, 0);
        labels = ["Hari Ini"];
        values = [sum];
        total = sum;
      } else if (period === "7_hari") {
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(now.getDate() - i);
          d.setHours(0, 0, 0, 0);
          const nextDay = new Date(d);
          nextDay.setDate(d.getDate() + 1);

          const label = d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
          const val = rows.reduce((acc, r) => {
            const t = new Date(r.created_at).getTime();
            return t >= d.getTime() && t < nextDay.getTime() ? acc + r.total : acc;
          }, 0);

          labels.push(label);
          values.push(val);
          total += val;
        }
      } else if (period === "30_hari") {
        for (let i = 29; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(now.getDate() - i);
          d.setHours(0, 0, 0, 0);
          const nextDay = new Date(d);
          nextDay.setDate(d.getDate() + 1);

          const label = String(d.getDate());
          const val = rows.reduce((acc, r) => {
            const t = new Date(r.created_at).getTime();
            return t >= d.getTime() && t < nextDay.getTime() ? acc + r.total : acc;
          }, 0);

          labels.push(label);
          values.push(val);
          total += val;
        }
      } else {
        // 1 tahun (12 bulan)
        for (let i = 11; i >= 0; i--) {
          const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

          const label = month.toLocaleDateString("id-ID", { month: "short" });
          const val = rows.reduce((acc, r) => {
            const t = new Date(r.created_at).getTime();
            return t >= month.getTime() && t < nextMonth.getTime() ? acc + r.total : acc;
          }, 0);

          labels.push(label);
          values.push(val);
          total += val;
        }
      }

      res.json({ labels, values, total });
    }
  );
});

export default router;
