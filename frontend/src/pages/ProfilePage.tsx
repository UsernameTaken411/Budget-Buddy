import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { auth } from "../services/auth";

export function ProfilePage() {
  const [profile, setProfile] = useState({ display_name: "", email: "", currency: "SGD" });
  const [saved, setSaved] = useState(false);
  const navigate = useNavigate();
  useEffect(() => { api<typeof profile>("/profile").then(setProfile); }, []);
  async function submit(event: FormEvent) { event.preventDefault(); await api("/profile", { method: "PATCH", body: JSON.stringify({ display_name: profile.display_name, currency: profile.currency }) }); setSaved(true); }
  return <div className="mx-auto max-w-2xl space-y-7"><div><p className="eyebrow">Account</p><h1 className="page-title">Profile & preferences</h1><p className="page-copy">Your settings are stored in Supabase and synced across signed-in devices.</p></div>
    <form className="card space-y-5 p-7" onSubmit={submit}><label>Display name<input className="field mt-2" value={profile.display_name ?? ""} onChange={e => setProfile({ ...profile, display_name: e.target.value })} /></label><label>Currency<select className="field mt-2" value={profile.currency} onChange={e => setProfile({ ...profile, currency: e.target.value })}><option>SGD</option><option>USD</option><option>MYR</option><option>EUR</option><option>GBP</option></select></label>{saved && <p className="text-sm text-emerald-300">Preferences saved and synced.</p>}<button className="btn-primary" type="submit">Save preferences</button></form>
    <button className="btn-secondary" onClick={() => { auth.logout(); navigate("/auth"); }}>Sign out</button>
  </div>;
}
