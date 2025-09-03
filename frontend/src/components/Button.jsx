export default function Button({
  children,
  onClick,
  type = "button",
  variant = "primary", // primary | secondary | outline | ghost | danger
  size = "md", // sm | md | lg
  loading = false,
  disabled,
  className = "",
}) {
  const base = [
    "inline-flex items-center justify-center rounded-xl text-sm font-medium select-none",
    "btn-focus disabled:opacity-50 disabled:cursor-not-allowed",
    "transition-colors transition-shadow transition-transform duration-150 ease-out",
    "motion-reduce:transition-none motion-reduce:transform-none",
  ].join(" ");
  const sizes = {
    sm: "px-3 py-1.5",
    md: "px-4 py-2",
    lg: "px-5 py-2.5",
  };
  const variants = {
    primary: [
      "bg-[var(--brand)] text-[var(--on-brand)]",
      "shadow-sm hover:shadow md:active:shadow-sm",
      "hover:brightness-95 active:brightness-90 active:scale-[.98]",
    ].join(" "),
    secondary: [
      "bg-[var(--hover)] text-[var(--text)]",
      "shadow-sm hover:shadow",
      "active:scale-[.98]",
    ].join(" "),
    outline: [
      "border border-[var(--border)] bg-[var(--card-bg)] text-[var(--text)]",
      "hover:bg-[var(--hover)]",
      "active:scale-[.98]",
    ].join(" "),
    ghost: [
      "bg-transparent text-[var(--text)]",
      "hover:bg-[var(--hover)]",
      "active:scale-[.98]",
    ].join(" "),
    danger: [
      "bg-[var(--danger)] text-white",
      "shadow-sm hover:shadow",
      "hover:brightness-105 active:brightness-95 active:scale-[.98]",
    ].join(" "),
  };
  const showSpinner = loading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {showSpinner && (
        <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-[color-mix(in_oklab,var(--on-brand)_60%,transparent)] border-t-[var(--on-brand)]"></span>
      )}
      {children}
    </button>
  );
}
