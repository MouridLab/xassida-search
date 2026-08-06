import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const isConfigured = Boolean(url && anon);
export function browserClient(){ if(!url||!anon) throw new Error("Supabase n’est pas configuré"); return createBrowserClient(url,anon); }
export function publicServerClient(){ if(!url||!anon) throw new Error("Supabase n’est pas configuré"); return createClient(url,anon,{auth:{persistSession:false}}); }
export function adminClient(){ const key=process.env.SUPABASE_SERVICE_ROLE_KEY; if(!url||!key) throw new Error("Clé Supabase serveur absente"); return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}); }
