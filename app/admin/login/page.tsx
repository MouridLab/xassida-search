"use client";
import { FormEvent, useState } from "react";
import { browserClient } from "@/lib/supabase";
export default function Login() {
  const [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const { error } = await browserClient().auth.signInWithPassword({
      email: String(f.get("email")),
      password: String(f.get("password")),
    });
    if (error) setError(error.message);
    else location.href = "/admin";
  }
  return (
    <main className="container section" style={{ maxWidth: 520 }}>
      <div className="panel">
        <span className="eyebrow">Accès réservé</span>
        <h1>Administration</h1>
        <form onSubmit={submit}>
          <div className="field">
            <label>Email</label>
            <input name="email" type="email" required />
          </div>
          <div className="field">
            <label>Mot de passe</label>
            <input name="password" type="password" required />
          </div>
          {error && <p className="error">{error}</p>}
          <button className="button">Se connecter</button>
        </form>
      </div>
    </main>
  );
}
