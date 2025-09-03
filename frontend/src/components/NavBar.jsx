import Logo from "./Logo";
import Button from "./Button";
import ThemeToggle from "./ThemeToggle";

export default function NavBar({
  query = "",
  setQuery = () => {},
  onUpload = () => {},
  onLogout = () => {},
  onNavigate = () => {},
  active = "home",
  displayName = "",
}) {
  function initials(name) {
    const n = (name || "").trim();
    if (!n) return "";
    const parts = n.replace(/^@/, "").split(/\s+|_/).filter(Boolean);
    return (parts[0]?.[0] || "").concat(parts[1]?.[0] || "").toUpperCase();
  }

  const items = [
    { key: "home", label: "Home", onClick: () => onNavigate("/home") },
    { key: "discover", label: "Discover", onClick: () => onNavigate("/home?tab=discover") },
    { key: "profile", label: "Profile", onClick: () => onNavigate("/profile") },
  ];

  return (
    <header className="sticky top-0 z-10 backdrop-blur border-b" style={{ background: "var(--card-bg)", borderColor: "var(--border)" }}>
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-4">
        <Logo />
        <nav className="hidden md:flex items-center gap-4 text-sm">
          {items.map((it) => (
            <button
              key={it.key}
              onClick={it.onClick}
              className={`px-2 py-1 rounded-lg hover-surface btn-focus ${active === it.key ? "" : "muted"}`}
            >
              {it.label}
            </button>
          ))}
        </nav>
        <div className="flex-1" />
        <div className="hidden md:flex items-center gap-2">
          <div className="relative">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search photos, people, tags"
              className="w-72 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2 text-sm shadow-sm outline-none transition focus:ring-2 focus:ring-[var(--ring)]"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs muted">⌘K</span>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              if (onUpload) return onUpload();
              const isSmall = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
              if (isSmall) window.location.href = '/new'; else window.dispatchEvent(new CustomEvent('open-upload'));
            }}
          >
            New Post
          </Button>
          <ThemeToggle />
          <Button variant="ghost" onClick={onLogout}>Log out</Button>
        </div>
      </div>
    </header>
  );
}
