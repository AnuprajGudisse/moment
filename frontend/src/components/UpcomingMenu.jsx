import Button from "./Button";

export default function UpcomingMenu({ open, onClose }) {
  if (!open) return null;
  const items = [
    {
      key: "gags",
      title: "Gags",
      desc: "Playful, time‑boxed prompts to spark creativity.",
    },
    {
      key: "communities",
      title: "Communities",
      desc: "Follow interests, join circles, and share your niche.",
    },
    {
      key: "events",
      title: "Events",
      desc: "Shoot‑outs, photowalks, meetups, and live challenges.",
    },
  ];
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4 py-10" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl shadow-xl overflow-hidden"
        style={{ background: "var(--card-bg)", border: `1px solid var(--border)` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <h3 className="text-lg font-semibold">Coming soon</h3>
          <p className="text-xs muted mt-0.5">A peek at what we’re building next.</p>
        </div>
        <div className="p-5 space-y-3">
          {items.map((it) => (
            <div key={it.key} className="rounded-xl border p-3 flex items-start gap-3" style={{ borderColor: "var(--border)" }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold" style={{ color: "var(--text)" }}>{it.title}</h4>
                  <span className="text-[10px] rounded-full px-2 py-[2px]" style={{ background: "var(--hover)", color: "var(--muted)" }}>Coming soon</span>
                </div>
                <p className="text-sm mt-1 muted">{it.desc}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => alert(`${it.title} is coming soon!`)}>Notify me</Button>
            </div>
          ))}
        </div>
        <div className="px-5 py-3 border-t flex items-center justify-end" style={{ borderColor: "var(--border)" }}>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}

