import express from "express";
import rateLimit from "express-rate-limit";
const router = express.Router();
const store = new Map();
const limiter = rateLimit({ windowMs: 60*1000, max: 30 });

router.post("/verify", limiter, (req,res)=>{
  const { checked } = req.body;
  if(!checked) return res.status(400).json({ok:false, error:"Centang verifikasi"});
  const token=Math.random().toString(36).slice(2)+Date.now().toString(36);
  store.set("human_"+token,{exp:Date.now()+10*60*1000});
  setTimeout(()=>store.delete("human_"+token),10*60*1000);
  res.json({ok:true, humanToken: token});
});

export function consumeHuman(token){
  const k="human_"+token;
  if(!store.has(k)) return false;
  store.delete(k); return true;
}
export default router;
