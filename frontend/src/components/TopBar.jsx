import Logo from "./Logo";
import Button from "./Button";

export default function TopBar({ query, setQuery, displayName, onUpload, onLogout }) {
  return (
    <header
      className="sticky top-0 z-10 backdrop-blur border-b"
      style={{
        background: "color-mix(in oklab, var(--app-bg) 85%, transparent)",
        borderColor: "var(--border)",
      }}
    >
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-4">
        <Logo />
        <nav className="hidden md:flex items-center gap-5 text-sm">
          <a className="cursor-pointer hover-surface rounded px-2 py-1" style={{ color: "var(--muted)" }}>Feed</a>
          <a className="cursor-pointer hover-surface rounded px-2 py-1" style={{ color: "var(--muted)" }}>Discover</a>
          <a className="cursor-pointer hover-surface rounded px-2 py-1" style={{ color: "var(--muted)" }}>Darkroom</a>
        </nav>
        <div className="flex-1" />
        <div className="hidden md:flex items-center gap-2">
          <div className="relative">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search rolls, labs, gear…"
              className="w-72 rounded-xl border bg-[var(--card-bg)] px-3 py-2 text-sm shadow-sm outline-none transition focus:ring-2 focus:ring-[var(--ring)]"
              style={{ borderColor: "var(--border)", color: "var(--text)" }}
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs muted">⌘K</span>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              if (onUpload) return onUpload();
              const isSmall = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
              if (isSmall) window.location.href = '/new'; else window.dispatchEvent(new CustomEvent('open-upload'));
            }}
          >
            New Post
          </Button>
          <div
            className="h-8 w-8 rounded-full"
            title={displayName}
            style={{ background: "var(--hover)" }}
          />
          <Button variant="ghost" onClick={onLogout}>Log out</Button>
        </div>
      </div>
    </header>
  );
}
