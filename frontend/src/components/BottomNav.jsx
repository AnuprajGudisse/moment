import { HomeIcon, CompassIcon, UserIcon, PlusIcon, UsersIcon } from "./icons";

export default function BottomNav({ active = "home", onNavigate = () => {} }) {
  const items = [
    { key: "home", label: "Home", icon: HomeIcon, path: "/home" },
    { key: "discover", label: "Discover", icon: CompassIcon, path: "/discover" },
    { key: "communities", label: "Communities", icon: UsersIcon, path: "/communities" },
    { key: "upload", label: "New Post", icon: PlusIcon, action: () => {
      const isSmall = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
      if (isSmall) onNavigate('/new');
      else window.dispatchEvent(new CustomEvent('open-upload'));
    } },
    { key: "profile", label: "Profile", icon: UserIcon, path: "/profile" },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 md:hidden" style={{ background: "var(--card-bg)", borderTop: `1px solid var(--border)` }}>
      <ul className="grid grid-cols-5">
        {items.map(({ key, label, icon: Icon, path, action }) => (
          <li key={key}>
            <button
              type="button"
              onClick={() => (action ? action() : onNavigate(path))}
              className={`w-full flex flex-col items-center justify-center py-2 text-xs ${active === key ? '' : 'muted'}`}
            >
              <Icon size={20} />
              <span className="mt-0.5">{label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
