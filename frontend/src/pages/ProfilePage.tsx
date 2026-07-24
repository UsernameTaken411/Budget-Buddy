import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, isPreviewMode } from "../services/api";
import { auth } from "../services/auth";

export function ProfilePage() {
  const preview = isPreviewMode();
  const [profile, setProfile] = useState({ display_name: "", email: "", currency: "SGD" });
  const [saved, setSaved] = useState(false);
  const navigate = useNavigate();
  useEffect(() => { if (!preview) api<typeof profile>("/profile").then(setProfile); }, [preview]);
  async function submit(event: FormEvent) { event.preventDefault(); if (!preview) await api("/profile", { method: "PATCH", body: JSON.stringify({ display_name: profile.display_name, currency: profile.currency }) }); setSaved(true); }
  return <div className="mx-auto max-w-2xl space-y-7"><div><p className="eyebrow">Account</p><h1 className="page-title">Profile & preferences</h1><p className="page-copy">{preview ? "You are using local preview mode. Sign in to sync between devices." : "Keep your default currency and account details current."}</p></div>
    <form className="card space-y-5 p-7" onSubmit={submit}><label>Display name<input className="field mt-2" value={profile.display_name ?? ""} onChange={e => setProfile({ ...profile, display_name: e.target.value })} /></label><label>Currency<select className="field mt-2" value={profile.currency} onChange={e => setProfile({ ...profile, currency: e.target.value })}><option>SGD</option><option>USD</option><option>MYR</option><option>EUR</option><option>GBP</option></select></label>{saved && <p className="text-sm text-emerald-300">Preferences saved.</p>}<button className="btn-primary" type="submit" disabled={preview}>Save preferences</button></form>
    {preview ? <button className="btn-primary" onClick={() => navigate("/auth")}>Sign in or create account</button> : <button className="btn-secondary" onClick={() => { auth.logout(); navigate("/dashboard"); window.location.reload(); }}>Sign out</button>}
  </div>;
}
