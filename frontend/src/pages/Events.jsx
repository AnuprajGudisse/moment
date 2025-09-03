import { useState } from "react";
import SideNav from "../components/SideNav";
import BottomNav from "../components/BottomNav";

export default function Events() {
  const [query, setQuery] = useState("");
  return (
    <div className="min-h-screen bg-[var(--app-bg)]">
      <SideNav active="events" onNavigate={(p) => (window.location.href = p)} onLogout={() => {}} query={query} setQuery={setQuery} />
      <main className="mx-auto max-w-6xl px-4 py-6 pb-16 md:pl-[260px]">
        <h1 className="text-2xl font-semibold tracking-tight">Events</h1>
        <p className="text-sm muted mt-1">Create or join events. Upload the photos you took at a specific event and share with attendees.</p>
        <div className="mt-4 rounded-2xl border p-6" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
          <p className="text-sm muted">Coming soon: Event boards with galleries from participants, RSVP, and location/time details.</p>
        </div>
      </main>
      <BottomNav active="events" onNavigate={(p) => (window.location.href = p)} />
    </div>
  );
}
