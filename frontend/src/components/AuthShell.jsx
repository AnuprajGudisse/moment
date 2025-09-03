import Logo from "./Logo";
import Button from "./Button";
import ThemeToggle from "./ThemeToggle";

export default function AuthShell({ children, footer, onBackHome }) {
  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      {/* Left Pane */}
      <div className="flex flex-col p-8 md:p-12 gap-6">
        <div className="flex items-center justify-between gap-3">
          <Logo />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" onClick={onBackHome}>Back</Button>
          </div>
        </div>
        <div className="max-w-md w-full mx-auto">{children}</div>
        <div className="max-w-md w-full mx-auto">{footer}</div>
        <p className="mt-auto text-xs text-gray-400">
          © {new Date().getFullYear()} moment. All rights reserved.
        </p>
      </div>

      {/* Right Pane (Showcase) */}
      <div className="hidden md:block relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-800" />
        {/* Fake masonry preview boxes */}
        <div className="absolute inset-0 p-8 grid grid-cols-3 gap-4">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className={`rounded-2xl bg-gradient-to-br from-neutral-700 to-neutral-900/60 shadow-inner ${
                i % 5 === 0 ? "col-span-2 row-span-2" : ""
              }`}
            />
          ))}
        </div>
        <div className="absolute bottom-8 left-8 text-white/90">
          <h2 className="text-2xl font-semibold">Share photos. Meet creatives. Grow together.</h2>
          <p className="text-sm text-white/70 mt-1">A social platform built for photographers.</p>
        </div>
      </div>
    </div>
  );
}
