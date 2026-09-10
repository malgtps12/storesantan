import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();
const url = process.env.SUPABASE_URL || "https://vrnfcbewtgvevqvkfmkn.supabase.co";
const anon = process.env.SUPABASE_ANON_KEY || "sb_publishable_j9yp2kMz1eB1wOHs2XpYhQ_dgIZaQG5";
export const supabase = createClient(url, anon);
export const SUPABASE_URL = url;
