function ApertureM({ size = 24, className = "" }) {
  // Aperture ring with an abstract 'M' formed by shutter-like strokes.
  // Uses currentColor to adapt to Editorial/Noir themes.
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
      {/* Outer aperture ring */}
      <circle cx="12" cy="12" r="9" />
      {/* Abstract 'M' with shutter-like strokes */}
      <path d="M6.5 15.5 9 8.5l3 4 3-4 2.5 7" />
      {/* Optional subtle inner ring for depth */}
      <circle cx="12" cy="12" r="3.25" opacity="0.25" />
    </svg>
  );
}

export default function Logo({ withWordmark = true }) {
  return (
    <div className="flex items-center gap-2 select-none" style={{ color: "var(--text)" }}>
      <ApertureM size={24} />
      {withWordmark && (
        <span className="font-semibold tracking-tight text-xl">moment</span>
      )}
    </div>
  );
}
