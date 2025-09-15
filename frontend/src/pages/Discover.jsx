import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import SideNav from "../components/SideNav";
import BottomNav from "../components/BottomNav";
import { publicPhotoUrl } from "../lib/storage";
import Button from "../components/Button";
import LikeButton from "../components/LikeButton";
import FeedCard from "../components/FeedCard";
import CommentsDrawer from "../components/CommentsDrawer";
import { ChevronLeftIcon, ChevronRightIcon } from "../components/icons";
import Input from "../components/Input";

const PAGE_SIZE = 30;

export default function Discover() {
  const nav = useNavigate();
  const [query, setQuery] = useState("");
  const filterText = useMemo(() => query.trim().toLowerCase(), [query]);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const lastCursorRef = useRef(null);
  const sentinelRef = useRef(null);

  const [viewer, setViewer] = useState(null); // { id, url }
  const [viewIndex, setViewIndex] = useState(-1);
  const [viewerMeta, setViewerMeta] = useState({ caption: "", likesCount: 0, commentsCount: 0, initiallyLiked: false });
  const [exifInfo, setExifInfo] = useState(null);
  const [showInfo, setShowInfo] = useState(false);
  const [commentsFor, setCommentsFor] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentErr, setCommentErr] = useState("");
  const [engagement, setEngagement] = useState({});
  // Removed unused detail viewer state

  async function fetchPage({ initial = false } = {}) {
    if (initial) {
      setLoading(true);
      setItems([]);
      setHasMore(true);
      lastCursorRef.current = null;
    } else {
      if (loading || loadingMore || !hasMore) return;
      setLoadingMore(true);
    }

    // First, get all photo IDs that are used in community posts
    const { data: communityPhotoIds } = await supabase
      .from("community_posts")
      .select("photo_id")
      .not("photo_id", "is", null);
    
    const excludeIds = new Set((communityPhotoIds || []).map(row => row.photo_id).filter(Boolean));

    let q = supabase
      .from("photos")
      .select(`id, storage_path, caption, exif, created_at,
               author:profiles!photos_user_id_fkey (username, full_name)`)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE * 2); // Get more to account for filtering
    
    if (lastCursorRef.current) q = q.lt("created_at", lastCursorRef.current);

    const { data, error } = await q;
    if (error) {
      console.error(error);
      setLoading(false); setLoadingMore(false);
      return;
    }

    const rows = (data || [])
      .filter(p => !excludeIds.has(p.id)) // Filter out community photos
      .map((p) => {
        const w = p.exif?.width ?? null;
        const h = p.exif?.height ?? null;
        return {
          id: p.id,
          url: publicPhotoUrl(p.storage_path),
          caption: p.caption || "",
          user: p.author?.username || p.author?.full_name || "user",
          aspect: (w && h) ? `${w} / ${h}` : "1 / 1",
          created_at: p.created_at,
          tags: Array.isArray(p.exif?.tags) ? p.exif.tags : [],
          exif: p.exif || null,
        };
      })
      .slice(0, PAGE_SIZE); // Limit to original page size

    const merged = filterText
      ? rows.filter((r) => `${r.caption} ${r.user} ${r.tags.join(" ")}`.toLowerCase().includes(filterText))
      : rows;

    setItems((prev) => [...prev, ...merged]);
    if (rows.length < PAGE_SIZE) setHasMore(false);
    if (rows.length) lastCursorRef.current = rows[rows.length - 1].created_at;
    setLoading(false); setLoadingMore(false);
  }

  useEffect(() => { fetchPage({ initial: true }); }, []);
  useEffect(() => { fetchPage({ initial: true }); }, [filterText]);

  // Hydrate engagement data for items
  useEffect(() => {
    if (!items || items.length === 0) return;
    (async () => {
      try {
        const ids = items.map((p) => p.id);
        const [{ data: likesAll }, { data: commentsAll }, { data: commentsPreview }, meRes] = await Promise.all([
          supabase.from("likes").select("photo_id, user_id").in("photo_id", ids),
          supabase.from("comments").select("photo_id").in("photo_id", ids),
          supabase
            .from("comments")
            .select(`id, body, created_at, photo_id, author:profiles!comments_user_id_fkey (username, full_name)`) 
            .in("photo_id", ids)
            .order("created_at", { ascending: false })
            .limit(Math.max(10, ids.length * 3)),
          supabase.auth.getUser(),
        ]);
        const me = meRes?.data?.user || null;
        const likeCounts = new Map();
        const likedSet = new Set();
        (likesAll || []).forEach((r) => {
          likeCounts.set(r.photo_id, (likeCounts.get(r.photo_id) || 0) + 1);
          if (me && r.user_id === me.id) likedSet.add(r.photo_id);
        });
        const commentCounts = new Map();
        (commentsAll || []).forEach((r) => {
          commentCounts.set(r.photo_id, (commentCounts.get(r.photo_id) || 0) + 1);
        });
        const previewMap = new Map();
        (commentsPreview || []).forEach((row) => {
          const arr = previewMap.get(row.photo_id) || [];
          if (arr.length < 2) arr.push(row);
          previewMap.set(row.photo_id, arr);
        });
        const obj = {};
        ids.forEach((id) => {
          obj[id] = {
            likesCount: likeCounts.get(id) || 0,
            likedByMe: likedSet.has(id),
            commentsCount: commentCounts.get(id) || 0,
            previewComments: previewMap.get(id) || [],
          };
        });
        setEngagement(obj);
      } catch {}
    })();
  }, [items, supabase]);

  useEffect(() => {
    const el = sentinelRef.current; if (!el) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting && !loading && !loadingMore && hasMore) fetchPage({ initial: false }); });
    }, { rootMargin: "400px" });
    io.observe(el); return () => io.disconnect();
  }, [loading, loadingMore, hasMore, filterText]);

  async function openViewerAt(index) {
    const list = items; if (index < 0 || index >= list.length) return;
    const p = list[index];
    setViewIndex(index);
    setViewer({ id: p.id, url: p.url });
    // detail viewer state removed
    setComments([]); setCommentText(""); setCommentErr(""); setCommentsLoading(true);
    try {
      const [{ data: photoRow }, { count: likesCount }, { count: commentsCount }, { data: commentsRows }, userRes] = await Promise.all([
        supabase.from("photos").select("exif, caption").eq("id", p.id).single(),
        supabase.from("likes").select("user_id", { count: "exact" }).eq("photo_id", p.id).limit(0),
        supabase.from("comments").select("id", { count: "exact" }).eq("photo_id", p.id).limit(0),
        supabase
          .from("comments")
          .select(`id, body, created_at, user_id, author:profiles!comments_user_id_fkey (username, full_name)`) 
          .eq("photo_id", p.id)
          .order("created_at", { ascending: true }),
        supabase.auth.getUser(),
      ]);
      let initiallyLiked = false;
      const me = userRes?.data?.user || null;
      if (me) {
        const { data: likedRow } = await supabase
          .from("likes").select("user_id").eq("photo_id", p.id).eq("user_id", me.id).maybeSingle();
        initiallyLiked = !!likedRow;
      }
      setViewerMeta({ caption: photoRow?.caption || p.caption, likesCount: likesCount || 0, commentsCount: commentsCount || 0, initiallyLiked });
      setExifInfo(photoRow?.exif || null);
      setComments(commentsRows || []);
    } catch {
      setViewerMeta({ caption: p.caption, likesCount: 0, commentsCount: 0, initiallyLiked: false });
      setExifInfo(null);
      setComments([]);
    } finally { setCommentsLoading(false); }
  }

  function prevPhoto() { openViewerAt(viewIndex - 1); }
  function nextPhoto() { openViewerAt(viewIndex + 1); }

  // openViewerCommentsAt removed (unused)

  async function postComment() {
    setCommentErr("");
    const text = commentText.trim();
    if (!text || !viewer) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setCommentErr("You must be logged in."); return; }
    const temp = { id: `temp-${crypto.randomUUID()}`, body: text, created_at: new Date().toISOString(), user_id: user.id, author: { username: user.user_metadata?.username, full_name: user.user_metadata?.full_name } };
    setComments((arr) => [...arr, temp]); setCommentText("");
    const { data, error } = await supabase
      .from("comments")
      .insert({ photo_id: viewer.id, user_id: user.id, body: text })
      .select(`id, body, created_at, user_id, author:profiles!comments_user_id_fkey (username, full_name)`) 
      .single();
    if (error) { setCommentErr(error.message); setComments((arr) => arr.filter((c) => c.id !== temp.id)); return; }
    setComments((arr) => arr.map((c) => (c.id === temp.id ? data : c)));
    setViewerMeta((m) => ({ ...m, commentsCount: (m.commentsCount || 0) + 1 }));
  }

  return (
    <div className="min-h-screen bg-[var(--app-bg)]">
      <SideNav
        active="discover"
        onNavigate={(path) => nav(path)}
        onLogout={async () => { await supabase.auth.signOut(); }}
        query={query}
        setQuery={setQuery}
      />

      <main className="mx-auto max-w-6xl px-4 py-6 pb-16 md:pl-[260px]">
        <h1 className="text-xl font-semibold">Discover</h1>
        <p className="text-sm muted">Fresh photos from the community.</p>
        <div className="mt-3 max-w-md">
          <Input id="discoverSearch" value={query} onChange={setQuery} placeholder="Search captions, users, tags" />
        </div>

        {/* Masonry grid (all screens). Clicking opens feed-style viewer */}
        <div className="mt-4 columns-2 md:columns-3 gap-2">
          {items.map((p, i) => (
            <button
              key={p.id}
              type="button"
              className="mb-2 block w-full overflow-hidden btn-focus break-inside-avoid"
              onClick={() => openViewerAt(i)}
              aria-label="Open photo"
            >
              <div style={{ aspectRatio: p.aspect || "3 / 4", background: "var(--hover)" }}>
                {p.url && (
                  <img
                    src={p.url}
                    alt={p.caption || "photo"}
                    className="w-full h-full object-cover transition-transform duration-150 hover:scale-[1.01]"
                    loading="lazy"
                    decoding="async"
                  />
                )}
              </div>
            </button>
          ))}
        </div>

        {!loading && hasMore && (
          <div ref={sentinelRef} className="py-6 text-center text-xs muted">{loadingMore ? "Loading more…" : "Scroll to load more"}</div>
        )}
      </main>

      {viewer && (
        <>
          {/* Mobile: infinite scroll overlay of feed cards starting from clicked photo */}
          <div className="fixed inset-x-0 top-0 bottom-14 z-30 bg-[var(--app-bg)] overflow-y-auto md:hidden" onClick={() => { setViewer(null); setViewIndex(-1); }}>
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3" style={{ background: "var(--card-bg)", borderBottom: `1px solid var(--border)` }}>
              <h4 className="text-sm font-semibold">Discover</h4>
              <button className="text-sm muted btn-focus" onClick={() => { setViewer(null); setViewIndex(-1); }}>Close</button>
            </div>
            <div className="px-2 pb-24 space-y-3" onClick={(e) => e.stopPropagation()}>
              {items.slice(viewIndex).map((p) => {
                const e = engagement[p.id] || { likesCount: 0, likedByMe: false, commentsCount: 0, previewComments: [] };
                return (
                  <FeedCard
                    key={p.id}
                    photoId={p.id}
                    url={p.url}
                    aspect={p.aspect}
                    caption={p.caption}
                    created_at={p.created_at}
                    handle={p.user}
                    place=""
                    exif={p.exif}
                    likesCount={e.likesCount}
                    likedByMe={e.likedByMe}
                    commentsCount={e.commentsCount}
                    previewComments={e.previewComments}
                    onOpenComments={() => setCommentsFor(p.id)}
                    imgSizes="100vw"
                  />
                );
              })}
            </div>
          </div>

          {/* Desktop: single-post modal with arrows and comments */}
          <div className="hidden md:flex fixed inset-0 z-50 bg-black/60 items-center justify-center p-4" onClick={() => { setViewer(null); setViewIndex(-1); }}>
            <div className="card w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
              <div className="grid md:grid-cols-[minmax(0,1fr)_360px]">
                <div className="relative" style={{ background: "var(--card-bg)" }} onClick={() => setShowInfo((v) => !v)}>
                  <div className="w-full" style={{ height: "70vh" }}>
                    {viewer?.url && <img src={viewer.url} alt="photo" className="w-full h-full object-contain" />}
                  </div>
                  {showInfo && exifInfo && (
                    <div className="absolute left-2 bottom-2 right-2 rounded-lg px-3 py-2 shadow" style={{ background: "color-mix(in oklab, var(--card-bg) 90%, transparent)" }}>
                      <p className="text-xs" style={{ color: "var(--text)" }}>
                        {[exifInfo.camera_make, exifInfo.camera_model].filter(Boolean).join(' ') || 'Camera: —'}
                      </p>
                      <p className="text-xs muted">{exifInfo.lens_model ? `Lens: ${exifInfo.lens_model}` : 'Lens: —'}</p>
                      <p className="text-xs muted">
                        {[
                          exifInfo.exposure_time_str || (exifInfo.exposure_time ? `${exifInfo.exposure_time}s` : null),
                          exifInfo.f_number ? `f/${exifInfo.f_number}` : null,
                          exifInfo.iso ? `ISO ${exifInfo.iso}` : null,
                          exifInfo.focal_length ? `${exifInfo.focal_length}mm` : null,
                        ].filter(Boolean).join(' · ') || '—'}
                      </p>
                    </div>
                  )}
                  <div className="absolute inset-y-0 left-0 flex items-center">
                    <button className="m-2 rounded-full p-2 bg-[var(--brand)] text-[var(--on-brand)] btn-focus" onClick={(e) => { e.stopPropagation(); prevPhoto(); }} disabled={viewIndex <= 0} aria-label="Previous">
                      <ChevronLeftIcon size={18} />
                    </button>
                  </div>
                  <div className="absolute inset-y-0 right-0 flex items-center">
                    <button className="m-2 rounded-full p-2 bg-[var(--brand)] text-[var(--on-brand)] btn-focus" onClick={(e) => { e.stopPropagation(); nextPhoto(); }} disabled={viewIndex >= items.length - 1} aria-label="Next">
                      <ChevronRightIcon size={18} />
                    </button>
                  </div>
                </div>
                <div className="border-t md:border-t-0 md:border-l p-4 flex flex-col" style={{ borderColor: "var(--border)" }}>
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">Photo {viewIndex + 1} of {items.length}</h4>
                    <button className="text-sm muted btn-focus" onClick={() => { setViewer(null); setViewIndex(-1); }}>Close</button>
                  </div>
                  {viewerMeta.caption && <p className="text-sm mt-2" style={{ color: "var(--text)" }}>{viewerMeta.caption}</p>}
                  <div className="mt-3 flex items-center gap-3 text-sm muted">
                    <LikeButton photoId={viewer.id} initialCount={viewerMeta.likesCount} initiallyLiked={viewerMeta.initiallyLiked} />
                    <span>Comments {viewerMeta.commentsCount}</span>
                  </div>
                  <div className="mt-3 flex-1 overflow-y-auto space-y-2" style={{ maxHeight: "40vh" }}>
                    {commentsLoading && <p className="text-xs muted">Loading comments…</p>}
                    {!commentsLoading && comments.length === 0 && <p className="text-xs muted">No comments yet.</p>}
                    {comments.map((c) => (
                      <div key={c.id} className="rounded border p-2" style={{ borderColor: "var(--border)" }}>
                        <p className="text-xs muted mb-1">@{c.author?.username || c.author?.full_name || "user"} • {new Date(c.created_at).toLocaleString()}</p>
                        <p className="text-sm" style={{ color: "var(--text)" }}>{c.body}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3">
                    <label htmlFor="discNewComment" className="text-sm" style={{ color: "var(--text)" }}>Add a comment</label>
                    <input
                      id="discNewComment"
                      className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Write something…"
                    />
                    <div className="mt-2 flex items-center gap-2">
                      <Button size="sm" onClick={postComment} disabled={!commentText.trim()}>Post</Button>
                      {commentErr && <span className="text-xs text-rose-600">{commentErr}</span>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
      <CommentsDrawer open={!!commentsFor} onClose={() => setCommentsFor(null)} photoId={commentsFor} />
      <BottomNav active="discover" onNavigate={(path) => nav(path)} />
    </div>
  );
}
