import { useMemo, useState } from "react";
import LikeButton from "./LikeButton";
import { CommentIcon, ShareIcon } from "./icons";

export default function FeedCard({
  photoId,
  url,
  aspect = "1 / 1",
  caption = "",
  created_at,
  handle = "user",
  place = "",
  exif = null,
  likesCount = 0,
  likedByMe = false,
  commentsCount = 0,
  previewComments = [],
  onOpenComments = () => {},
  imgSizes = "(max-width: 768px) 100vw, 700px",
  ownedByMe = false,
  onEdit = undefined,
  onDelete = undefined,
  onCopyLink = undefined,
}) {
  const [showInfo, setShowInfo] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const time = useMemo(() => timeAgo(created_at), [created_at]);
  const initialsText = useMemo(() => initials(handle), [handle]);

  return (
    <article className="card card--square shadow-none">
      <header className="flex items-center justify-between gap-2 px-2 py-2">
        <div className="h-6 w-6 rounded-full flex items-center justify-center border border-[var(--border)]" style={{ background: "var(--hover)" }}>
          <span className="text-[9px] font-semibold muted">{initialsText}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">@{handle}</p>
          <p className="text-xs muted truncate">{place ? `${place} · ` : ""}{time}</p>
        </div>
        <div className="relative">
          <button
            type="button"
            className="px-2 py-1 rounded-lg hover-surface btn-focus"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            title="More"
          >
            ⋯
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-1 w-40 rounded-xl border shadow-sm text-sm z-10" style={{ background: "var(--card-bg)", borderColor: "var(--border)" }}>
              {ownedByMe && onEdit && (
                <button className="w-full text-left px-3 py-2 hover-surface" onClick={() => { setMenuOpen(false); onEdit(photoId); }}>Edit post</button>
              )}
              {ownedByMe && onDelete && (
                <button className="w-full text-left px-3 py-2 hover-surface" onClick={() => { setMenuOpen(false); onDelete(photoId); }}>Delete</button>
              )}
              <button className="w-full text-left px-3 py-2 hover-surface" onClick={() => { setMenuOpen(false); (onCopyLink ? onCopyLink(url) : copyToClipboard(url)); }}>Copy link</button>
              <a className="block px-3 py-2 hover-surface" href={url || '#'} download target="_blank" rel="noopener noreferrer">Download</a>
            </div>
          )}
        </div>
      </header>

      <div
        className="w-full overflow-hidden relative"
        style={{ aspectRatio: aspect || "1 / 1", background: "var(--hover)" }}
        onClick={() => setShowInfo((v) => !v)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowInfo((v) => !v); } }}
        aria-label="Toggle photo info"
        title="Click to toggle photo info"
      >
        {url ? (
          <img
            src={url}
            alt={caption || "photo"}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
            sizes={imgSizes}
          />
        ) : (
          <div className="w-full h-full" />
        )}

        {showInfo && exif && (
          <div
            className="absolute left-2 right-2 bottom-2 rounded-lg px-3 py-2 shadow"
            style={{ background: "color-mix(in oklab, var(--card-bg) 90%, transparent)" }}
          >
            <p className="text-xs" style={{ color: "var(--text)" }}>
              <span className="font-medium">Camera:</span>{" "}
              {[exif.camera_make, exif.camera_model].filter(Boolean).join(" ") || "—"}
            </p>
            <p className="text-xs muted">
              <span className="font-medium" style={{ color: "var(--text)" }}>Lens:</span>{" "}
              {exif.lens_model || "—"}
            </p>
            <p className="text-xs muted">
              <span className="font-medium" style={{ color: "var(--text)" }}>Aperture:</span>{" "}
              {exif.f_number ? `f/${exif.f_number}` : "—"}
              {"  •  "}
              <span className="font-medium" style={{ color: "var(--text)" }}>Shutter:</span>{" "}
              {exif.exposure_time_str || exposureToString(exif.exposure_time) || "—"}
              {"  •  "}
              <span className="font-medium" style={{ color: "var(--text)" }}>ISO:</span>{" "}
              {exif.iso || "—"}
              {exif.focal_length ? (
                <>
                  {"  •  "}
                  <span className="font-medium" style={{ color: "var(--text)" }}>Focal:</span>{" "}
                  {`${exif.focal_length}mm`}
                </>
              ) : null}
            </p>
          </div>
        )}
      </div>

      <div className="px-2 pt-2 flex items-center gap-2 text-sm muted">
        <LikeButton photoId={photoId} initialCount={likesCount} initiallyLiked={likedByMe} />
        <button
          className="inline-flex items-center gap-1 hover-surface rounded-lg px-2 py-1 btn-focus"
          onClick={onOpenComments}
          aria-label="Comments"
          title="Comments"
        >
          <CommentIcon size={14} />
          <span>{commentsCount}</span>
        </button>
        <button className="inline-flex items-center gap-1 hover-surface rounded-lg px-2 py-1 btn-focus" aria-label="Share" title="Share">
          <ShareIcon size={14} />
        </button>
      </div>

      {(caption || commentsCount > 0) && (
        <div className="px-2 pb-2 pt-1">
          {caption && <p className="text-xs" style={{ color: "var(--text)" }}>{caption}</p>}

          {commentsCount > 0 && (
            <button
              className="mt-1 text-sm muted hover-surface rounded px-1 btn-focus"
              onClick={onOpenComments}
            >
              View all {commentsCount} comments
            </button>
          )}

          {previewComments && previewComments.length > 0 && (
            <div className="mt-2 space-y-1">
              {[...previewComments].reverse().map((pc) => {
                const h = pc.author?.username || pc.author?.full_name || "user";
                return (
                  <p key={pc.id} className="text-sm" style={{ color: "var(--text)" }}>
                    <span className="font-medium">@{h}</span>{" "}
                    <span className="muted">{pc.body}</span>
                  </p>
                );
              })}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function initials(name) {
  const n = (name || "").trim();
  if (!n) return "";
  const parts = n.replace(/^@/, "").split(/\s+|_/).filter(Boolean);
  return (parts[0]?.[0] || "").concat(parts[1]?.[0] || "").toUpperCase();
}

function timeAgo(iso) {
  try {
    const then = new Date(iso).getTime();
    const now = Date.now();
    const s = Math.max(1, Math.round((now - then) / 1000));
    const map = [
      [60, "s"], [60, "m"], [24, "h"], [7, "d"], [4.345, "w"], [12, "mo"], [Number.POSITIVE_INFINITY, "y"],
    ];
    let val = s, unit = "s";
    for (const [limit, u] of map) {
      if (val < limit) { unit = unit; break; }
      unit = u; val = Math.floor(val / limit);
      if (!isFinite(limit)) break;
    }
    return `${val}${unit}`;
  } catch { return ""; }
}

function exposureToString(x) {
  if (!x || typeof x !== 'number' || !isFinite(x)) return null;
  if (x === 0) return '0s';
  if (x >= 1) return `${x.toFixed(1)}s`;
  const denom = Math.round(1 / x);
  return `1/${denom}s`;
}

function copyToClipboard(text) {
  try {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text || "");
    } else {
      const ta = document.createElement('textarea');
      ta.value = text || "";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  } catch {}
}
