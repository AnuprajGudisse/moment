import Logo from "./Logo";
import Button from "./Button";

export default function TopBar({ query, setQuery, displayName, onUpload, onLogout }) {
  return (
    <header className="sticky top-0 z-10 backdrop-blur bg-emulsion/70 border-b border-black/5 grain">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-4">
        <Logo />
        <nav className="hidden md:flex items-center gap-5 text-sm text-sprocket/80">
          <a className="hover:text-ink cursor-pointer">Feed</a>
          <a className="hover:text-ink cursor-pointer">Discover</a>
          <a className="hover:text-ink cursor-pointer">Darkroom</a>
        </nav>
        <div className="flex-1" />
        <div className="hidden md:flex items-center gap-2">
          <div className="relative">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search rolls, labs, gear…"
              className="w-72 rounded-xl border border-sprocket/20 bg-paper px-3 py-2 text-sm shadow-sm outline-none transition focus:border-fuji focus:ring-2 focus:ring-fuji/10"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted">⌘K</span>
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
          <div className="h-8 w-8 rounded-full bg-sprocket" title={displayName} />
          <Button variant="ghost" onClick={onLogout}>Log out</Button>
        </div>
      </div>
    </header>
  );
}
