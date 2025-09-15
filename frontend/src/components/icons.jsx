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

export function SearchIcon({ size = 20, className = "", title }) {
  return (
    <IconBase size={size} className={className} title={title}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </IconBase>
  );
}

export function UsersIcon({ size = 20, className = "", title }) {
  return (
    <IconBase size={size} className={className} title={title}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </IconBase>
  );
}

export function ImageIcon({ size = 20, className = "", title }) {
  return (
    <IconBase size={size} className={className} title={title}>
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </IconBase>
  );
}

export function CalendarIcon({ size = 20, className = "", title }) {
  return (
    <IconBase size={size} className={className} title={title}>
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
    </IconBase>
  );
}

export function TrendingUpIcon({ size = 20, className = "", title }) {
  return (
    <IconBase size={size} className={className} title={title}>
      <polyline points="22,7 13.5,15.5 8.5,10.5 2,17" />
      <polyline points="16,7 22,7 22,13" />
    </IconBase>
  );
}

export function Crown({ size = 20, className = "", title }) {
  return (
    <IconBase size={size} className={className} title={title}>
      <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm6 16v2h8v-2H8z" />
    </IconBase>
  );
}

export function Shield({ size = 20, className = "", title }) {
  return (
    <IconBase size={size} className={className} title={title}>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1v7z" />
    </IconBase>
  );
}

export function BookOpen({ size = 20, className = "", title }) {
  return (
    <IconBase size={size} className={className} title={title}>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </IconBase>
  );
}

export function Info({ size = 20, className = "", title }) {
  return (
    <IconBase size={size} className={className} title={title}>
      <circle cx="12" cy="12" r="10" />
      <path d="m9 9h.01" />
      <path d="M11 12h1v4h1" />
    </IconBase>
  );
}

export function Send({ size = 20, className = "", title }) {
  return (
    <IconBase size={size} className={className} title={title}>
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </IconBase>
  );
}

export function Globe({ size = 20, className = "", title }) {
  return (
    <IconBase size={size} className={className} title={title}>
      <circle cx="12" cy="12" r="10" />
      <path d="m21.24 12.53-1.45-.36a9.77 9.77 0 0 0-.46-1.82l1.11-1.03a10 10 0 0 0-1.31-2.17l-1.45.74a9.26 9.26 0 0 0-1.22-1.22l.74-1.45A10.02 10.02 0 0 0 14.03 3.9l-1.03 1.11c-.59-.17-1.19-.3-1.82-.46L10.82 3.1A9.84 9.84 0 0 0 8.65 3.9l.36 1.45c-.63.16-1.23.39-1.82.46L5.97 4.7A9.84 9.84 0 0 0 3.9 6.87l1.45.74c-.39.38-.74.8-1.22 1.22l-1.45-.74A10.02 10.02 0 0 0 3.9 14.03l1.45-.36c.16.63.29 1.23.46 1.82l-1.11 1.03a10 10 0 0 0 2.17 2.17l1.03-1.11c.59.17 1.19.3 1.82.46l.36 1.45a9.84 9.84 0 0 0 2.17 0l.36-1.45a9.77 9.77 0 0 0 1.82-.46l1.03 1.11a10 10 0 0 0 2.17-2.17l-1.11-1.03c.17-.59.3-1.19.46-1.82l1.45-.36a9.84 9.84 0 0 0 0-2.17z" />
    </IconBase>
  );
}

export function ExternalLink({ size = 20, className = "", title }) {
  return (
    <IconBase size={size} className={className} title={title}>
      <path d="M15 3h6v6" />
      <path d="m10 14 11-11" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </IconBase>
  );
}

export function Upload({ size = 20, className = "", title }) {
  return (
    <IconBase size={size} className={className} title={title}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7,10 12,5 17,10" />
      <line x1="12" x2="12" y1="5" y2="15" />
    </IconBase>
  );
}

export function Check({ size = 20, className = "", title }) {
  return (
    <IconBase size={size} className={className} title={title}>
      <polyline points="20,6 9,17 4,12" />
    </IconBase>
  );
}

export function FileText({ size = 20, className = "", title }) {
  return (
    <IconBase size={size} className={className} title={title}>
      <path d="M14,2 C14,2 18,2 18,6 L18,20 C18,21.105 17.105,22 16,22 L8,22 C6.895,22 6,21.105 6,20 L6,4 C6,2.895 6.895,2 8,2 L14,2 Z" />
      <polyline points="14,2 14,8 20,8" />
      <line x1="16" x2="8" y1="13" y2="13" />
      <line x1="16" x2="8" y1="17" y2="17" />
      <polyline points="10,9 9,9 8,9" />
    </IconBase>
  );
}

export function X({ size = 20, className = "", title }) {
  return (
    <IconBase size={size} className={className} title={title}>
      <path d="m18 6-12 12" />
      <path d="m6 6 12 12" />
    </IconBase>
  );
}

export default { 
  LikeIcon, 
  CommentIcon, 
  ShareIcon, 
  SearchIcon, 
  UsersIcon, 
  ImageIcon, 
  CalendarIcon, 
  TrendingUpIcon,
  Crown,
  Shield,
  BookOpen,
  Info,
  Send,
  Globe,
  ExternalLink,
  Upload,
  Check,
  FileText,
  X,
  PlusIcon,
  UserIcon
};
