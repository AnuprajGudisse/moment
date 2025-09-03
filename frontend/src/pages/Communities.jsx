import { useState } from "react";
import SideNav from "../components/SideNav";
import BottomNav from "../components/BottomNav";

export default function Communities() {
  const [query, setQuery] = useState("");
  return (
    <div className="min-h-screen bg-[var(--app-bg)]">
      <SideNav active="communities" onNavigate={(p) => (window.location.href = p)} onLogout={() => {}} query={query} setQuery={setQuery} />
      <main className="mx-auto max-w-6xl px-4 py-6 pb-16 md:pl-[260px]">
        <h1 className="text-2xl font-semibold tracking-tight">Communities</h1>
        <p className="text-sm muted mt-1">Follow interests, join circles, and share your niche.</p>
        <div className="mt-4 rounded-2xl border p-6" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
          <p className="text-sm muted">Coming soon: Interest hubs, mods, and curated threads.</p>
        </div>
      </main>
      <BottomNav active="communities" onNavigate={(p) => (window.location.href = p)} />
    </div>
  );
}
