import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import Button from "../components/Button";
import { publicPhotoUrl } from "../lib/storage";
import FeedCard from "../components/FeedCard";
import EditPostDialog from "../components/EditPostDialog";
import CommentsDrawer from "../components/CommentsDrawer";
import SideNav from "../components/SideNav";
import BottomNav from "../components/BottomNav";

const PAGE_SIZE = 10;

export default function Home() {
  const nav = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [query, setQuery] = useState("");
  const [showUpload, setShowUpload] = useState(false);

  // feed & paging
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const lastCursorRef = useRef(null);
  const sentinelRef = useRef(null);

  // comments drawer
  const [commentsFor, setCommentsFor] = useState(null);
  // edit post dialog
  const [editPhotoId, setEditPhotoId] = useState(null);

  // Auth + profile
  useEffect(() => {
    let mounted = true;
    async function hydrate() {
      const { data: ures } = await supabase.auth.getUser();
      const u = ures?.user ?? null;
      if (!mounted) return;
      setUser(u);
      if (u) {
        const { data: prow } = await supabase
          .from("profiles")
          .select("full_name, username, location, level, genres")
          .eq("id", u.id)
          .maybeSingle();
        if (mounted) {
          // Normalize genres for downstream consumers
          const normalize = (val) => Array.isArray(val) ? val : (typeof val === 'string' ? (() => {
            try { const j = JSON.parse(val); return Array.isArray(j) ? j : []; } catch {}
            if (val.startsWith('{') && val.endsWith('}')) return val.slice(1,-1).split(',').map(s=>s.replace(/^"|"$/g,'').trim()).filter(Boolean);
            return [];
          })() : []);
          setProfile(prow ? { ...prow, genres: normalize(prow.genres) } : null);
        }
      }
    }
    hydrate();
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) setProfile(null);
      else {
        supabase
          .from("profiles")
          .select("full_name, username, location, level, genres")
          .eq("id", session.user.id)
          .maybeSingle()
          .then(({ data }) => {
            const normalize = (val) => Array.isArray(val) ? val : (typeof val === 'string' ? (() => {
              try { const j = JSON.parse(val); return Array.isArray(j) ? j : []; } catch {}
              if (val.startsWith('{') && val.endsWith('}')) return val.slice(1,-1).split(',').map(s=>s.replace(/^"|"$/g,'').trim()).filter(Boolean);
              return [];
            })() : []);
            setProfile(data ? { ...data, genres: normalize(data.genres) } : null);
          });
      }
    });
    return () => sub.subscription?.unsubscribe?.();
  }, []);

  const filterText = useMemo(() => query.trim().toLowerCase(), [query]);

  // Counts + my likes (client-side aggregation)
  async function hydrateEngagement(rows, me) {
    if (!rows.length) return rows;
    const ids = rows.map((r) => r.id);

    const { data: likesAll } = await supabase
      .from("likes")
      .select("photo_id, user_id")
      .in("photo_id", ids);

    const likeCountsMap = new Map();
    let myLikedSet = new Set();
    (likesAll || []).forEach((row) => {
      likeCountsMap.set(row.photo_id, (likeCountsMap.get(row.photo_id) || 0) + 1);
      if (me && row.user_id === me.id) myLikedSet.add(row.photo_id);
    });

    const { data: commentsAll } = await supabase
      .from("comments")
      .select("photo_id")
      .in("photo_id", ids);

    const commentCountsMap = new Map();
    (commentsAll || []).forEach((row) => {
      commentCountsMap.set(row.photo_id, (commentCountsMap.get(row.photo_id) || 0) + 1);
    });

    // Fetch a small preview set of latest comments across these photos
    const previewLimit = Math.max(10, ids.length * 3);
    const { data: commentsPreview } = await supabase
      .from("comments")
      .select(`
        id, body, created_at, photo_id,
        author:profiles!comments_user_id_fkey (username, full_name)
      `)
      .in("photo_id", ids)
      .order("created_at", { ascending: false })
      .limit(previewLimit);

    const previewMap = new Map();
    (commentsPreview || []).forEach((row) => {
      const arr = previewMap.get(row.photo_id) || [];
      if (arr.length < 2) arr.push(row);
      previewMap.set(row.photo_id, arr);
    });

    return rows.map((r) => ({
      ...r,
      likesCount: likeCountsMap.get(r.id) || 0,
      likedByMe: myLikedSet.has(r.id),
      commentsCount: commentCountsMap.get(r.id) || 0,
      previewComments: previewMap.get(r.id) || [],
    }));
  }

  // Load page (keyset on created_at) + dedupe
  async function loadPage({ initial = false } = {}) {
    if (initial) {
      setLoading(true);
      setFeed([]);
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
      .select(`
        id,
        user_id,
        storage_path,
        caption,
        exif,
        created_at,
        context,
        author:profiles!photos_user_id_fkey (
          username,
          full_name,
          location
        )
      `)
      .eq("context", "post") // Only show regular posts, not event or community photos
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE * 2); // Get more to account for filtering

    if (lastCursorRef.current) q = q.lt("created_at", lastCursorRef.current);

    const { data, error } = await q;
    if (error) {
      console.error(error);
      if (initial) setLoading(false);
      else setLoadingMore(false);
      return;
    }

    const rows = (data || [])
      .filter(p => !excludeIds.has(p.id)) // Filter out community photos
      .map((p) => {
        const w = p.exif?.width ?? null;
        const h = p.exif?.height ?? null;
        const aspect = (w && h) ? `${w} / ${h}` : "1 / 1";
        return {
          id: p.id,
          owner_id: p.user_id,
          url: publicPhotoUrl(p.storage_path),
          caption: p.caption || "",
          created_at: p.created_at,
          user: p.author?.username || p.author?.full_name || "user",
          place: p.author?.location || "",
          aspect,
          exif: p.exif || null,
        };
      })
      .slice(0, PAGE_SIZE); // Limit to original page size

    const merged = await hydrateEngagement(rows, user);

    const filtered = filterText
      ? merged.filter((r) =>
          `${r.caption} ${r.user} ${r.place}`.toLowerCase().includes(filterText)
        )
      : merged;

    setFeed((prev) => {
      const seen = new Set();
      return [...prev, ...filtered].filter((it) => {
        if (seen.has(it.id)) return false;
        seen.add(it.id);
        return true;
      });
    });

    if (rows.length < PAGE_SIZE) setHasMore(false);
    if (rows.length) lastCursorRef.current = rows[rows.length - 1].created_at;

    if (initial) setLoading(false);
    else setLoadingMore(false);
  }

  useEffect(() => { loadPage({ initial: true }); }, []);
  useEffect(() => { loadPage({ initial: true }); }, [filterText]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && !loading && !loadingMore && hasMore) {
          loadPage({ initial: false });
        }
      });
    }, { rootMargin: "400px" });
    io.observe(el);
    return () => io.disconnect();
  }, [loading, loadingMore, hasMore, filterText]);


  return (
    <div className="min-h-screen bg-[var(--app-bg)]">
      <SideNav
        active="home"
        onNavigate={(path) => nav(path)}
        onUpload={() => window.dispatchEvent(new CustomEvent('open-upload'))}
        onLogout={async () => { await supabase.auth.signOut(); }}
        query={query}
        setQuery={setQuery}
      />
      <main className="mx-auto max-w-6xl px-4 py-6 pb-16 md:pl-[260px] grid grid-cols-1 lg:grid-cols-[minmax(0,740px)_1fr] gap-6 items-start">
        {/* Feed */}
        <section className="space-y-3 max-w-[560px] w-full">
          {loading && (
            <>
              {[...Array(3)].map((_, i) => (
                <div key={i} className="card shadow-none">
                  <div className="flex items-center gap-2 px-2 py-2">
                    <div className="h-8 w-8 rounded-full skeleton" />
                    <div className="h-4 w-32 rounded skeleton" />
                  </div>
                  <div className="w-full h-[28vh] skeleton" />
                  <div className="px-2 py-2">
                    <div className="h-4 w-40 rounded skeleton" />
                  </div>
                </div>
              ))}
            </>
          )}
          {!loading && feed.length === 0 && (
            <div className="rounded-2xl border p-6 text-sm muted" style={{ background: "var(--card-bg)", borderColor: "var(--border)" }}>
              No photos yet. Be the first to upload!
            </div>
          )}

          {feed.map((c) => (
            <FeedCard
              key={c.id}
              photoId={c.id}
              url={c.url}
              aspect={c.aspect}
              caption={c.caption}
              created_at={c.created_at}
              handle={c.user}
              place={c.place}
              exif={c.exif}
              likesCount={c.likesCount}
              likedByMe={c.likedByMe}
              commentsCount={c.commentsCount}
              previewComments={c.previewComments}
              onOpenComments={() => setCommentsFor(c.id)}
              ownedByMe={user?.id === c.owner_id}
              onEdit={(photoId) => setEditPhotoId(photoId)}
              onDelete={(photoId) => deletePhoto(photoId)}
              onCopyLink={(u) => copyLink(u)}
            />
          ))}

          

          {!loading && hasMore && (
            <div ref={sentinelRef} className="py-6 text-center text-xs muted">
              {loadingMore ? "Loading more…" : "Scroll to load more"}
            </div>
          )}
        </section>

        {/* Right sidebar (wide screens) */}
        <aside className="hidden lg:block space-y-4">
          {/* Quick actions */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold">Quick Actions</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => window.dispatchEvent(new CustomEvent('open-upload'))}>Upload Photo</Button>
              <Button size="sm" variant="outline" onClick={() => nav('/profile')}>Edit Profile</Button>
            </div>
          </div>

          {/* Trending tags (click to filter) */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold">Trending</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {['Portrait','Street','Landscape','Travel','Urban','Documentary'].map((t) => (
                <button
                  key={t}
                  type="button"
                  className="rounded-full border px-3 py-1 text-xs border-[var(--border)] hover-surface"
                  onClick={() => setQuery(t)}
                >
                  #{t}
                </button>
              ))}
            </div>
          </div>

          {/* Who to follow (placeholder) */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold">Who to follow</h3>
            <ul className="mt-2 space-y-2 text-sm">
              {["lightchaser","urbanpoet","wildfocus"].map((u) => (
                <li key={u} className="flex items-center justify-between">
                  <span className="truncate">@{u}</span>
                  <Button size="sm" variant="outline" className="px-2">Follow</Button>
                </li>
              ))}
            </ul>
          </div>

          {/* Shortcuts */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold">Shortcuts</h3>
            <ul className="mt-2 text-xs muted space-y-1">
              <li>⌘K — Search</li>
              <li>U — Upload</li>
              <li>L — Like</li>
            </ul>
          </div>
        </aside>
      </main>

      {/* Upload dialog */}
      {/* UploadDialog is now global (mounted in App) */}

      {/* Comments drawer */}
      <CommentsDrawer
        open={!!commentsFor}
        onClose={() => setCommentsFor(null)}
        photoId={commentsFor}
      />
      <EditPostDialog
        open={!!editPhotoId}
        photoId={editPhotoId}
        onClose={() => setEditPhotoId(null)}
        onSaved={({ id, caption, exif }) => {
          setFeed((arr) => arr.map((it) => (it.id === id ? { ...it, caption, exif } : it)));
        }}
      />
      <BottomNav active="home" onNavigate={(path) => nav(path)} />
    </div>
  );
}

  async function editPost(photoId) {
    const current = feed.find((f) => f.id === photoId)?.caption || "";
    const next = prompt("Edit post", current);
    if (next == null) return;
    try {
      const { error } = await supabase.from('photos').update({ caption: next }).eq('id', photoId);
      if (error) throw error;
      setFeed((arr) => arr.map((it) => it.id === photoId ? { ...it, caption: next } : it));
    } catch (e) {
      alert(e.message || 'Failed to update caption');
    }
  }

  async function deletePhoto(photoId) {
    if (!confirm('Delete this photo? This cannot be undone.')) return;
    try {
      const { error } = await supabase.from('photos').delete().eq('id', photoId);
      if (error) throw error;
      setFeed((arr) => arr.filter((it) => it.id !== photoId));
    } catch (e) {
      alert(e.message || 'Failed to delete');
    }
  }

  function copyLink(url) {
    try {
      navigator.clipboard?.writeText(url || '');
    } catch {}
  }
