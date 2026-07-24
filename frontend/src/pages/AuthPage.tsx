import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../services/auth";

export function AuthPage() {
  const [signup, setSignup] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(""); setLoading(true);
    try {
      if (signup) await auth.signup(form.email, form.password, form.name);
      else await auth.login(form.email, form.password);
      navigate("/dashboard"); window.location.reload();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not sign in."); }
    finally { setLoading(false); }
  }
  return <div className="mx-auto max-w-md pt-10"><div className="card p-7"><p className="eyebrow">{signup ? "Create account" : "Welcome back"}</p><h1 className="page-title">{signup ? "Start your plan" : "Sign in"}</h1><p className="page-copy">Connect to Supabase to sync securely across your devices.</p>
    <form className="mt-7 space-y-4" onSubmit={submit}>{signup && <label>Display name<input className="field mt-2" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>}<label>Email<input className="field mt-2" required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label><label>Password<input className="field mt-2" required minLength={6} type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></label>{error && <p className="rounded-xl bg-rose-400/10 p-3 text-sm text-rose-300">{error}</p>}<button className="btn-primary w-full justify-center" disabled={loading}>{loading ? "Please wait…" : signup ? "Create account" : "Sign in"}</button></form>
    <button className="mt-5 w-full text-sm text-slate-400 hover:text-emerald-300" onClick={() => { setSignup(!signup); setError(""); }}>{signup ? "Already have an account? Sign in" : "New here? Create an account"}</button>
  </div></div>;
}
