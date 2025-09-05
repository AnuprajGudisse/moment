import { useState } from "react";
import { useNavigate } from "react-router-dom";
import SideNav from "../components/SideNav";
import BottomNav from "../components/BottomNav";

export default function Trending() {
  const nav = useNavigate();
  const [query, setQuery] = useState("");
  return (
    <div className="min-h-screen bg-[var(--app-bg)]">
      <SideNav active="trending" onNavigate={(p) => nav(p)} onLogout={() => {}} query={query} setQuery={setQuery} />
      <main className="mx-auto max-w-6xl px-4 py-6 pb-16 md:pl-[260px]">
        <h1 className="text-2xl font-semibold tracking-tight">Trending</h1>
        <p className="text-sm muted mt-1">What&apos;s hot: posts, tags, and events gaining momentum.</p>
        <div className="mt-4 rounded-2xl border p-6" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
          <p className="text-sm muted">Coming soon: Live trends with filters by timeframe and category.</p>
        </div>
      </main>
      <BottomNav active="trending" onNavigate={(p) => nav(p)} />
    </div>
  );
}
