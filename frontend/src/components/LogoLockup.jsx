export default function LogoLockup({
  size = 28,
  wordmarkSize = 32,
  tagline,
  className = "",
}) {
  return (
    <div className={`flex items-center gap-3 ${className}`} style={{ color: "var(--text)" }}>
      <ApertureM size={size} />
      <div>
        <div className="font-semibold tracking-tight" style={{ fontSize: wordmarkSize }}>
          moment
        </div>
        {tagline && (
          <div className="text-sm muted mt-0.5">{tagline}</div>
        )}
      </div>
    </div>
  );
}

function ApertureM({ size = 24, className = "" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M6.5 15.5 9 8.5l3 4 3-4 2.5 7" />
      <circle cx="12" cy="12" r="3.25" opacity="0.25" />
    </svg>
  );
}

