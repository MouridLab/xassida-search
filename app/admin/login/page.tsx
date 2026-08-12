"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { browserClient } from "@/lib/supabase";

export default function Login() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const values = new FormData(event.currentTarget);
    const { error } = await browserClient().auth.signInWithPassword({
      email: String(values.get("email")),
      password: String(values.get("password")),
    });
    if (error) {
      setError(error.message === "Invalid login credentials" ? "Email ou mot de passe incorrect." : error.message);
      setLoading(false);
      return;
    }
    router.replace("/admin");
    router.refresh();
  }

  return (
    <main className="grid min-h-[calc(100vh-72px)] place-items-center bg-slate-50 px-5 py-12">
      <section className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,.08)] sm:p-8">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><LockKeyhole size={25} /></span>
        <div className="mt-5 text-center"><span className="text-[10px] font-bold uppercase tracking-[.18em] text-emerald-700">Accès réservé</span><h1 className="mt-2 text-2xl font-bold">Administration</h1><p className="mt-2 text-sm text-slate-500">Connectez-vous avec votre compte d’équipe.</p></div>
        <form onSubmit={submit} className="mt-7 space-y-4">
          <label className="grid gap-1.5 text-xs font-semibold text-slate-700">Email<input name="email" type="email" autoComplete="email" required className="h-12 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" /></label>
          <label className="grid gap-1.5 text-xs font-semibold text-slate-700">Mot de passe<span className="relative"><input name="password" type={visible ? "text" : "password"} autoComplete="current-password" required className="h-12 w-full rounded-xl border border-slate-200 px-3 pr-12 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" /><button type="button" onClick={() => setVisible((value) => !value)} aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"} className="absolute right-1 top-1 grid size-10 place-items-center text-slate-400">{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>
          {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2.5 text-xs text-red-700">{error}</p>}
          <button disabled={loading} className="h-12 w-full rounded-xl bg-emerald-800 text-sm font-bold text-white hover:bg-emerald-900 disabled:cursor-wait disabled:opacity-60">{loading ? "Connexion…" : "Se connecter"}</button>
        </form>
        <Link href="/admin/reset-password" className="mt-5 block text-center text-xs font-semibold text-emerald-800">Mot de passe oublié ?</Link>
      </section>
    </main>
  );
}
