import Logo from "./Logo";
import Button from "./Button";
import ThemeToggle from "./ThemeToggle";

export default function SideNav({
  active = "home",
  onNavigate = () => {},
  onUpload = undefined,
  onLogout = () => {},
  query = "",
  setQuery = () => {},
}) {
  const items = [
    { key: "home", label: "Home", path: "/home" },
    { key: "discover", label: "Discover", path: "/discover" },
    { key: "profile", label: "Profile", path: "/profile" },
    { key: "events", label: "Events", path: "/events" },
    { key: "gags", label: "Gags", path: "/gags" },
    { key: "communities", label: "Communities", path: "/communities" },
    { key: "trending", label: "Trending", path: "/trending" },
    { key: "messages", label: "Messages", path: "/messages" },
  ];

  return (
    <aside className="hidden md:block fixed inset-y-0 left-0 z-30" style={{ width: 240 }}>
      <div className="h-full overflow-y-auto flex flex-col gap-4 border-r px-4 py-4" style={{ borderColor: "var(--border)", background: "var(--app-bg)" }}>
        {/* Brand */}
        <div className="flex items-center justify-between pr-1">
          <Logo />
          <ThemeToggle />
        </div>

        {/* Search */}
        <div className="relative">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--app-bg)] px-3 py-2 text-sm shadow-sm outline-none transition focus:ring-2 focus:ring-[var(--ring)]"
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs muted">⌘K</span>
        </div>

        {/* Nav items */}
        <nav className="flex-1">
          <ul className="space-y-1 text-sm">
            {items.map((it) => (
              <li key={it.key}>
                <button
                  className={`w-full text-left rounded-xl px-3 py-2 hover-surface btn-focus ${active === it.key ? "" : "muted"}`}
                  onClick={() => onNavigate(it.path)}
                >
                  {it.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Actions */}
        <div className="space-y-2">
          <Button
            variant="outline"
            onClick={() => {
              const isSmall = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
              if (isSmall) {
                window.location.href = '/new';
              } else if (onUpload) {
                onUpload();
              } else {
                window.dispatchEvent(new CustomEvent('open-upload'));
              }
            }}
            className="w-full"
          >
            New Post
          </Button>
          <Button
            variant="ghost"
            onClick={() => window.dispatchEvent(new CustomEvent('open-upcoming'))}
            className="w-full"
          >
            More (Coming soon)
          </Button>
          <Button variant="ghost" onClick={onLogout} className="w-full">Log out</Button>
        </div>
        <p className="text-[10px] muted">© {new Date().getFullYear()} moment</p>
      </div>
    </aside>
  );
}
