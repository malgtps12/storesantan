import { supabase } from "./supabase.js";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
dotenv.config();

export async function seedOwner() {
  const email = (process.env.OWNER_EMAIL || "owner@kelapatuabangcut.local").toLowerCase();
  const { data: existing } = await supabase.from("users").select("id").eq("email", email).maybeSingle();
  if (existing) return console.log(`Owner exists: ${email}`);
  const hash = bcrypt.hashSync(process.env.OWNER_PASS || "owner123", 12);
  const { error } = await supabase.from("users").insert({ email, password_hash: hash, role: "owner", created_at: new Date().toISOString() });
  if (error) console.error("seed error:", error.message);
  else console.log(`Owner seeded: ${email}`);
}

export const dbSupabase = {
  async getUser(email) {
    const { data, error } = await supabase.from("users").select("*").eq("email", email.toLowerCase()).maybeSingle();
    if (error) throw error;
    return data;
  },
  async createOrder(order) {
    const { error } = await supabase.from("orders").insert(order);
    if (error) throw error;
  },
  async listOrders() {
    const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map((r) => ({ ...r, items: typeof r.items === "string" ? JSON.parse(r.items) : r.items }));
  },
  async updateStatus(id, status) {
    const patch = { status, ...(status === "approved" ? { approved_at: new Date().toISOString() } : { rejected_at: new Date().toISOString() }) };
    const { error, count } = await supabase.from("orders").update(patch).eq("id", id);
    if (error) throw error;
    return count;
  }
};
