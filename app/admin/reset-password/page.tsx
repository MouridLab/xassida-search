"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { browserClient } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const [recovery, setRecovery] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data } = browserClient().auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
    });
    void browserClient().auth.getSession().then(({ data: session }) => {
      if (session.session && window.location.hash) setRecovery(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true); setError(""); setMessage("");
    const values = new FormData(event.currentTarget);
    if (recovery) {
      const password = String(values.get("password"));
      const confirmation = String(values.get("confirmation"));
      if (password.length < 8 || password !== confirmation) {
        setError(password.length < 8 ? "Utilisez au moins 8 caractères." : "Les mots de passe ne correspondent pas.");
      } else {
        const { error } = await browserClient().auth.updateUser({ password });
        if (error) setError(error.message); else setMessage("Mot de passe modifié. Vous pouvez revenir à l’administration.");
      }
    } else {
      const email = String(values.get("email"));
      const { error } = await browserClient().auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/admin/reset-password` });
      if (error) setError(error.message); else setMessage("Si ce compte existe, un lien de réinitialisation vient d’être envoyé.");
    }
    setLoading(false);
  }

  return <main className="grid min-h-[calc(100vh-72px)] place-items-center bg-slate-50 px-5 py-12"><section className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,.08)] sm:p-8"><span className="text-[10px] font-bold uppercase tracking-[.18em] text-emerald-700">Compte administrateur</span><h1 className="mt-2 text-2xl font-bold">{recovery ? "Choisir un nouveau mot de passe" : "Mot de passe oublié"}</h1><p className="mt-2 text-sm leading-6 text-slate-500">{recovery ? "Le nouveau mot de passe doit contenir au moins 8 caractères." : "Indiquez l’adresse email associée à votre compte Supabase."}</p><form onSubmit={submit} className="mt-6 space-y-4">{recovery ? <><label className="grid gap-1.5 text-xs font-semibold">Nouveau mot de passe<input name="password" type="password" autoComplete="new-password" minLength={8} required className="h-12 rounded-xl border border-slate-200 px-3 outline-none focus:border-emerald-500" /></label><label className="grid gap-1.5 text-xs font-semibold">Confirmation<input name="confirmation" type="password" autoComplete="new-password" minLength={8} required className="h-12 rounded-xl border border-slate-200 px-3 outline-none focus:border-emerald-500" /></label></> : <label className="grid gap-1.5 text-xs font-semibold">Email<input name="email" type="email" autoComplete="email" required className="h-12 rounded-xl border border-slate-200 px-3 outline-none focus:border-emerald-500" /></label>}{error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs text-red-700">{error}</p>}{message && <p className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">{message}</p>}<button disabled={loading} className="h-12 w-full rounded-xl bg-emerald-800 text-sm font-bold text-white disabled:opacity-60">{loading ? "Traitement…" : recovery ? "Modifier le mot de passe" : "Envoyer le lien"}</button></form><Link href="/admin/login" className="mt-5 block text-center text-xs font-semibold text-emerald-800">Retour à la connexion</Link></section></main>;
}
