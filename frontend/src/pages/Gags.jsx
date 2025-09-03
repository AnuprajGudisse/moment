import { useState } from "react";
import SideNav from "../components/SideNav";
import BottomNav from "../components/BottomNav";

export default function Gags() {
  const [query, setQuery] = useState("");
  return (
    <div className="min-h-screen bg-[var(--app-bg)]">
      <SideNav active="gags" onNavigate={(p) => (window.location.href = p)} onLogout={() => {}} query={query} setQuery={setQuery} />
      <main className="mx-auto max-w-6xl px-4 py-6 pb-16 md:pl-[260px]">
        <h1 className="text-2xl font-semibold tracking-tight">Gags</h1>
        <p className="text-sm muted mt-1">A job board for photographers: gigs, collaborations, and paid opportunities.</p>
        <div className="mt-4 rounded-2xl border p-6" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
          <p className="text-sm muted">Coming soon: Post a gig, apply with your portfolio, and manage offers.</p>
        </div>
      </main>
      <BottomNav active="gags" onNavigate={(p) => (window.location.href = p)} />
    </div>
  );
}
