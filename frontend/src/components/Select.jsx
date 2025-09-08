export default function Select({
  id,
  value,
  onChange,
  children,
  size = "md", // sm | md
  className = "",
  mutedWhenEmpty = true,
  ...props
}) {
  const sizes = {
    sm: "px-2 py-1.5",
    md: "px-3 py-2",
  };
  const colorClass = mutedWhenEmpty && (value === "" || value === undefined || value === null)
    ? "text-[var(--muted)]"
    : "text-[var(--text)]";
  return (
    <div className="relative inline-block w-full">
      <select
        id={id}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className={[
          "appearance-none w-full rounded-xl bg-[var(--hover)] text-sm",
          "shadow-sm outline-none transition focus:ring-2 focus:ring-[var(--ring)]",
          "focus:ring-offset-2 focus:ring-offset-[var(--app-bg)]",
          "hover:bg-[var(--hover)] cursor-pointer",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "pr-8", // space for chevron
          colorClass,
          sizes[size],
          className,
        ].join(" ")}
        {...props}
      >
        {children}
      </select>
      <svg
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  );
}
