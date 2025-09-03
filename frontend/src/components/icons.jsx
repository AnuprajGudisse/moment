// Simple editorial/noir-friendly action icons
// Usage: <LikeIcon filled size={20} className="..." />

function IconBase({ children, size = 20, className = "", title }) {
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
      aria-hidden={title ? undefined : true}
      role={title ? "img" : "presentation"}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

export function LikeIcon({ filled = false, size = 20, className = "", title }) {
  return (
    <IconBase size={size} className={className} title={title}>
      {filled ? (
        <path
          fill="currentColor"
          stroke="currentColor"
          d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06A5.5 5.5 0 0 0 3.16 12.5l1.06 1.06L12 21l7.78-7.44 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z"
        />
      ) : (
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21l8.84-8.61a5.5 5.5 0 0 0 0-7.78Z" />
      )}
    </IconBase>
  );
}

export function CommentIcon({ size = 20, className = "", title }) {
  return (
    <IconBase size={size} className={className} title={title}>
      <path d="M21 11.5a7.5 7.5 0 0 1-7.5 7.5H9l-4 3v-3.5A7.5 7.5 0 1 1 21 11.5Z" />
    </IconBase>
  );
}

export function ShareIcon({ size = 20, className = "", title }) {
  return (
    <IconBase size={size} className={className} title={title}>
      <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
      <path d="M12 3v12" />
      <path d="m8 7 4-4 4 4" />
    </IconBase>
  );
}

export function PencilIcon({ size = 20, className = "", title }) {
  return (
    <IconBase size={size} className={className} title={title}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
      <path d="m15 5 3 3" />
    </IconBase>
  );
}

export function HomeIcon({ size = 20, className = "", title }) {
  return (
    <IconBase size={size} className={className} title={title}>
      <path d="m3 10 9-7 9 7" />
      <path d="M5 10v10h14V10" />
    </IconBase>
  );
}

export function CompassIcon({ size = 20, className = "", title }) {
  return (
    <IconBase size={size} className={className} title={title}>
      <circle cx="12" cy="12" r="10" />
      <path d="m16 8-4 10-4-4 10-4" />
    </IconBase>
  );
}

export function UserIcon({ size = 20, className = "", title }) {
  return (
    <IconBase size={size} className={className} title={title}>
      <path d="M20 21a8 8 0 1 0-16 0" />
      <circle cx="12" cy="7" r="4" />
    </IconBase>
  );
}

export function PlusIcon({ size = 20, className = "", title }) {
  return (
    <IconBase size={size} className={className} title={title}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </IconBase>
  );
}

export function ChevronLeftIcon({ size = 20, className = "", title }) {
  return (
    <IconBase size={size} className={className} title={title}>
      <path d="m15 18-6-6 6-6" />
    </IconBase>
  );
}

export function ChevronRightIcon({ size = 20, className = "", title }) {
  return (
    <IconBase size={size} className={className} title={title}>
      <path d="m9 6 6 6-6 6" />
    </IconBase>
  );
}

export default { LikeIcon, CommentIcon, ShareIcon };
