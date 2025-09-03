import { useEffect, useState } from "react";

// Simple two-theme switcher: Editorial (light) ↔ Film Noir (dark)
export default function ThemeToggle({ className = "" }) {
  const [theme, setTheme] = useState("editorial");

  useEffect(() => {
    const t = document.documentElement.dataset.theme || (document.documentElement.classList.contains("dark") ? "noir" : "editorial");
    setTheme(t === "dark" ? "noir" : t);
  }, []);

  function toggle() {
    const next = theme === "noir" ? "editorial" : "noir";
    if (typeof window !== "undefined" && typeof window.__setTheme === "function") {
      window.__setTheme(next);
    } else {
      document.documentElement.dataset.theme = next;
      document.documentElement.classList.toggle("dark", next === "noir");
      try { localStorage.setItem("theme", next); } catch {}
    }
    setTheme(next);
  }

  const dark = theme === "noir";

  return (
    <button
      type="button"
      onClick={toggle}
      className={`rounded-lg px-2.5 py-1.5 text-sm hover-surface btn-focus ${className}`}
      aria-label={dark ? "Switch to Editorial theme" : "Switch to Noir theme"}
      title={dark ? "Editorial" : "Noir"}
    >
      <span className="align-middle">{dark ? "Editorial" : "Noir"}</span>
    </button>
  );
}
