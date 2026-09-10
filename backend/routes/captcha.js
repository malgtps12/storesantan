import express from "express";
import rateLimit from "express-rate-limit";

const router = express.Router();
const store = new Map();
const puzzleLimiter = rateLimit({ windowMs: 60*1000, max: 30 });

const PUZZLES = [
  { img: "🥥", name: "Kelapa" },
  { img: "🌴", name: "Pohon" },
  { img: "💧", name: "Air" },
  { img: "🟢", name: "Bulat" }
];

router.get("/", puzzleLimiter, (req, res) => {
  const target = PUZZLES[Math.floor(Math.random() * PUZZLES.length)];
  const shuffled = [...PUZZLES].sort(() => Math.random() - 0.5);
  const id = Math.random().toString(36).slice(2, 10);
  
  store.set(id, { target: target.name, exp: Date.now() + 5*60*1000 });
  setTimeout(() => store.delete(id), 5*60*1000);

  res.json({
    id,
    targetName: target.name,
    options: shuffled.map(p => p.img)
  });
});

router.post("/verify", puzzleLimiter, (req, res) => {
  const { id, choiceIndex, options } = req.body;
  const entry = store.get(id);
  if (!entry) return res.status(400).json({ ok: false, error: "Puzzle kadaluarsa, refresh" });
  if (Date.now() > entry.exp) { store.delete(id); return res.status(400).json({ ok: false, error: "Kadaluarsa" }); }

  // mapping emoji back to name
  const map = { "🥥": "Kelapa", "🌴": "Pohon", "💧": "Air", "🟢": "Bulat" };
  const chosenEmoji = options[choiceIndex];
  const chosenName = map[chosenEmoji];

  if (chosenName !== entry.target) {
    return res.status(400).json({ ok: false, error: "Puzzle salah, coba lagi" });
  }

  store.delete(id);
  const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
  store.set("human_" + token, { exp: Date.now() + 10*60*1000 });
  setTimeout(() => store.delete("human_" + token), 10*60*1000);
  res.json({ ok: true, humanToken: token });
});

export function consumeHuman(token) {
  const k = "human_" + token;
  if (!store.has(k)) return false;
  store.delete(k);
  return true;
}

export default router;
