import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { publicPhotoUrl } from "../lib/storage";
import { PencilIcon, ChevronLeftIcon, ChevronRightIcon } from "../components/icons";
import Button from "../components/Button";
import Input from "../components/Input";
import Label from "../components/Label";
import ErrorText from "../components/ErrorText";
import SideNav from "../components/SideNav";
import EditProfileDialog from "../components/EditProfileDialog";
import BottomNav from "../components/BottomNav";
import LikeButton from "../components/LikeButton";
import CommentsDrawer from "../components/CommentsDrawer";
import FeedCard from "../components/FeedCard";

const ENABLE_FOLLOWS = import.meta.env.VITE_ENABLE_FOLLOWS === 'true';
const levels = ["Beginner", "Enthusiast", "Professional"];
const genresAll = ["Street","Portrait","Landscape","Astro","Wildlife","Travel","Urban","Macro","Documentary"];

export default function Profile() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [location, setLocation] = useState("");
  const [level, setLevel] = useState(levels[0]);
  const [genres, setGenres] = useState([]);
  const [userId, setUserId] = useState(null);
  const [myPhotos, setMyPhotos] = useState([]);

  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("posts"); // posts | albums | clips

  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  // Viewer state
  const [viewPhoto, setViewPhoto] = useState(null); // { id, url }
  const [viewIndex, setViewIndex] = useState(-1);
  const [viewMeta, setViewMeta] = useState({ caption: "", likesCount: 0, commentsCount: 0, initiallyLiked: false });
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentErr, setCommentErr] = useState("");
  const [exifInfo, setExifInfo] = useState(null);
  const [showInfo, setShowInfo] = useState(false);
  const [commentsFor, setCommentsFor] = useState(null); // photoId for drawer (mobile feed)
  const [engagement, setEngagement] = useState({}); // { [photoId]: { likesCount, likedByMe, commentsCount, previewComments: [] } }

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: userData, error: uErr } = await supabase.auth.getUser();
      if (uErr || !userData.user) { nav("/login"); return; }
      const uid = userData.user.id;
      setUserId(uid);

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, username, location, level, genres")
        .eq("id", uid)
        .single();

      if (mounted) {
        if (error) setErr(error.message);
        if (data) {
          setFullName(data.full_name ?? "");
          setUsername(data.username ?? "");
          setLocation(data.location ?? "");
          setLevel(data.level ?? levels[0]);
          setGenres(Array.isArray(data.genres) ? data.genres : []);
        }
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [nav]);

  // Load my recent photos for grid preview
  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data, error } = await supabase
        .from("photos")
        .select("id, storage_path, exif, created_at, caption")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(24);
      if (error) return; // keep silent for now
      setMyPhotos((data || []).map((p) => ({
        id: p.id,
        url: publicPhotoUrl(p.storage_path),
        aspect: (() => {
          const w = p.exif?.width ?? 0, h = p.exif?.height ?? 0;
          return w && h ? `${w} / ${h}` : "1 / 1";
        })(),
        caption: p.caption || "",
        created_at: p.created_at,
      })));
    })();
  }, [userId, supabase]);

  // Hydrate engagement data (likes, comments, preview comments) for myPhotos
  useEffect(() => {
    if (!myPhotos || myPhotos.length === 0) return;
    (async () => {
      try {
        const ids = myPhotos.map((p) => p.id);
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
  }, [myPhotos, supabase]);

  // Followers/Following counts (optional; gated by env to avoid 400 if table absent)
  useEffect(() => {
    if (!userId || !ENABLE_FOLLOWS) return;
    (async () => {
      try {
        const [{ count: followers }, { count: following }] = await Promise.all([
          supabase.from("follows").select("follower_id", { count: "exact" }).eq("followed_id", userId).limit(0),
          supabase.from("follows").select("followed_id", { count: "exact" }).eq("follower_id", userId).limit(0),
        ]);
        setFollowersCount(followers || 0);
        setFollowingCount(following || 0);
      } catch {
        setFollowersCount(0); setFollowingCount(0);
      }
    })();
  }, [userId, supabase]);

  const canSave = useMemo(() =>
    (username.trim().length >= 3) && fullName.trim().length >= 2, [username, fullName]
  );

  function toggleGenre(g) {
    setGenres((prev) => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);
  }

  async function save() {
    setErr(""); setOk(""); setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, username, location, level, genres })
      .eq("id", user.id);

    setSaving(false);
    if (error) {
      if (error.code === "23505") setErr("That username is already taken.");
      else setErr(error.message);
      return;
    }
    setOk("Saved!");
    setEditing(false);
  }

  // Viewer helpers
  async function fetchMetaAndComments(photo) {
    try {
      const [{ data: photoRow }, { count: likesCount }, { count: commentsCount }, { data: commentsRows }, userRes] = await Promise.all([
        supabase.from("photos").select("caption, exif").eq("id", photo.id).single(),
        supabase.from("likes").select("user_id", { count: "exact" }).eq("photo_id", photo.id).limit(0),
        supabase.from("comments").select("id", { count: "exact" }).eq("photo_id", photo.id).limit(0),
        supabase
          .from("comments")
          .select(`id, body, created_at, user_id, author:profiles!comments_user_id_fkey (username, full_name)`) 
          .eq("photo_id", photo.id)
          .order("created_at", { ascending: true }),
        supabase.auth.getUser(),
      ]);
      let initiallyLiked = false;
      const me = userRes?.data?.user || null;
      if (me) {
        const { data: likedRow } = await supabase
          .from("likes").select("user_id").eq("photo_id", photo.id).eq("user_id", me.id).maybeSingle();
        initiallyLiked = !!likedRow;
      }
      setViewMeta({ caption: photoRow?.caption || photo.caption || "", likesCount: likesCount || 0, commentsCount: commentsCount || 0, initiallyLiked });
      setExifInfo(photoRow?.exif || null);
      setComments(commentsRows || []);
    } catch {
      setViewMeta({ caption: photo.caption || "", likesCount: 0, commentsCount: 0, initiallyLiked: false });
      setExifInfo(null);
      setComments([]);
    }
  }

  async function openPhotoAt(index) {
    const list = myPhotos; // use full list for mobile feed-like experience
    if (index < 0 || index >= list.length) return;
    setViewIndex(index);
    const p = list[index];
    setViewPhoto({ id: p.id, url: p.url });
    setCommentsLoading(true);
    await fetchMetaAndComments(p);
    setCommentsLoading(false);
  }

  function closeViewer() { setViewPhoto(null); setViewIndex(-1); setComments([]); setCommentText(""); setCommentErr(""); }
  function prevPhoto() { openPhotoAt(viewIndex - 1); }
  function nextPhoto() { openPhotoAt(viewIndex + 1); }

  // Helpers for feed card display
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

  async function postComment() {
    setCommentErr("");
    const text = commentText.trim();
    if (!text || !viewPhoto) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setCommentErr("You must be logged in."); return; }
    const temp = { id: `temp-${crypto.randomUUID()}`, body: text, created_at: new Date().toISOString(), user_id: user.id, author: { username: user.user_metadata?.username, full_name: user.user_metadata?.full_name } };
    setComments((arr) => [...arr, temp]); setCommentText("");
    const { data, error } = await supabase
      .from("comments")
      .insert({ photo_id: viewPhoto.id, user_id: user.id, body: text })
      .select(`id, body, created_at, user_id, author:profiles!comments_user_id_fkey (username, full_name)`) 
      .single();
    if (error) { setCommentErr(error.message); setComments((arr) => arr.filter((c) => c.id !== temp.id)); return; }
    setComments((arr) => arr.map((c) => (c.id === temp.id ? data : c)));
    setViewMeta((m) => ({ ...m, commentsCount: (m.commentsCount || 0) + 1 }));
  }

  if (loading) return <div className="p-6 text-sm muted">Loading profile…</div>;

  return (
    <div className="min-h-screen bg-[var(--app-bg)]">
      <SideNav
        active="profile"
        onNavigate={(path) => nav(path)}
        onLogout={async () => { await supabase.auth.signOut(); }}
        query=""
        setQuery={() => {}}
      />

      <main className="mx-auto max-w-6xl px-4 py-6 pb-16 md:pl-[260px]">
        <div className="max-w-4xl w-full">
          {/* Header with banner + avatar */}
          <section className="mb-6">
            <div className="relative">
              <div className="h-40 md:h-48 w-full rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--hover)" }} />
              <div className="absolute top-3 right-3">
                <Button size="sm" variant="outline" onClick={() => window.dispatchEvent(new CustomEvent('open-upload'))}>Change header</Button>
              </div>
              <div className="absolute -bottom-8 left-4 h-24 w-24 md:h-28 md:w-28 rounded-full flex items-center justify-center border shadow-sm" style={{ borderColor: "var(--border)", background: "var(--card-bg)" }}>
                <div className="h-[90%] w-[90%] rounded-full flex items-center justify-center" style={{ background: "var(--hover)" }}>
                  <span className="text-lg md:text-xl font-semibold muted">
                    {(() => {
                      const n = (username || fullName || "").trim();
                      const parts = n.replace(/^@/, "").split(/\s+|_/).filter(Boolean);
                      return (parts[0]?.[0] || "").concat(parts[1]?.[0] || "").toUpperCase();
                    })()}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-12 flex items-start md:items-center gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-semibold tracking-tight truncate">{fullName || username || "Your profile"}</h1>
                  {username && <span className="text-sm muted truncate">@{username}</span>}
                </div>
                {(location || level) && (
                  <p className="mt-1 text-sm muted">{[location, level].filter(Boolean).join(" • ")}</p>
                )}
                <div className="mt-3 grid grid-cols-3 gap-4 max-w-xs">
                  <div className="text-center">
                    <div className="text-lg font-semibold">{myPhotos.length}</div>
                    <div className="text-xs muted">Posts</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold">{followersCount}</div>
                    <div className="text-xs muted">Followers</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold">{followingCount}</div>
                    <div className="text-xs muted">Following</div>
                  </div>
                </div>
              </div>
              {!editing && (
                <div className="hidden md:block">
                  <Button variant="outline" onClick={() => setEditing(true)} className="inline-flex items-center gap-2">
                    <PencilIcon size={16} />
                    Edit Profile
                  </Button>
                </div>
              )}
            </div>

            {!editing && (
              <div className="mt-3 md:hidden">
                <Button variant="outline" onClick={() => setEditing(true)} className="w-full inline-flex items-center justify-center gap-2">
                  <PencilIcon size={16} />
                  Edit Profile
                </Button>
              </div>
            )}
          </section>

          <EditProfileDialog
            open={editing}
            onClose={() => setEditing(false)}
            onSave={save}
            saving={saving}
            err={err}
            ok={ok}
            fullName={fullName}
            setFullName={setFullName}
            username={username}
            setUsername={setUsername}
            location={location}
            setLocation={setLocation}
            level={level}
            setLevel={setLevel}
            levels={levels}
            genres={genres}
            setGenres={setGenres}
          />

          {/* Tabs: Posts / Albums / Clips */}
          <section className="mt-8">
            <div className="border-b" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center justify-center gap-6">
                {[
                  { key: "posts", label: "Posts" },
                  { key: "albums", label: "Albums" },
                  { key: "clips", label: "Clips" },
                ].map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setActiveTab(t.key)}
                    className={`px-3 py-3 text-sm btn-focus ${activeTab === t.key ? "font-semibold" : "muted"}`}
                    style={activeTab === t.key ? { borderBottom: `2px solid var(--text)` } : {}}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {activeTab === "posts" && (
              <div className="mt-4">
                {myPhotos.length === 0 ? (
                  <p className="text-sm muted">You haven’t posted any photos yet.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-[6px]">
                    {myPhotos.slice(0, 9).map((p, i) => (
                      <button
                        key={p.id}
                        type="button"
                        className="group overflow-hidden btn-focus"
                        onClick={() => openPhotoAt(i)}
                        aria-label="Open photo"
                      >
                        <div style={{ aspectRatio: "3 / 4", background: "var(--hover)" }}>
                          {p.url && (
                            <img
                              src={p.url}
                              alt="photo"
                              className="w-full h-full object-cover transition-transform duration-150 group-hover:scale-[1.01]"
                              loading="lazy"
                              decoding="async"
                            />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "albums" && (
              <div className="mt-4 text-sm muted">Albums coming soon.</div>
            )}

            {activeTab === "clips" && (
              <div className="mt-4 text-sm muted">Clips will appear here.</div>
            )}
          </section>
        </div>

        {/* Viewer modal (desktop) */}
        {viewPhoto && (
          <div className="fixed inset-0 z-50 bg-black/60 hidden md:flex items-center justify-center p-4" onClick={closeViewer}>
            <div className="card w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
              <div className="grid md:grid-cols-[minmax(0,1fr)_360px]">
                <div className="relative" style={{ background: "var(--card-bg)" }} onClick={() => setShowInfo((v) => !v)}>
                  <div className="w-full" style={{ height: "70vh" }}>
                    {viewPhoto.url && <img src={viewPhoto.url} alt="photo" className="w-full h-full object-contain" />}
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
                    <button className="m-2 rounded-full p-2 bg-[var(--brand)] text-[var(--on-brand)] btn-focus" onClick={(e) => { e.stopPropagation(); nextPhoto(); }} disabled={viewIndex >= Math.min(myPhotos.length, 9) - 1} aria-label="Next">
                      <ChevronRightIcon size={18} />
                    </button>
                  </div>
                </div>
                <div className="border-t md:border-t-0 md:border-l p-4 flex flex-col" style={{ borderColor: "var(--border)" }}>
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">Photo {viewIndex + 1} of {Math.min(myPhotos.length, 9)}</h4>
                    <button className="text-sm muted hover-surface rounded px-2 py-1 btn-focus" onClick={closeViewer}>Close</button>
                  </div>
                  {viewMeta.caption && <p className="text-sm mt-2" style={{ color: "var(--text)" }}>{viewMeta.caption}</p>}
                  <div className="mt-3 flex items-center gap-3 text-sm muted">
                    <LikeButton photoId={viewPhoto.id} initialCount={viewMeta.likesCount} initiallyLiked={viewMeta.initiallyLiked} />
                    <span>Comments {viewMeta.commentsCount}</span>
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
                    <Label htmlFor="newComment">Add a comment</Label>
                    <Input id="newComment" value={commentText} onChange={setCommentText} placeholder="Write something…" />
                    <div className="mt-2 flex items-center gap-2">
                      <Button size="sm" onClick={postComment} disabled={!commentText.trim()}>Post</Button>
                      {commentErr && <span className="text-xs text-rose-600">{commentErr}</span>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
      {/* Mobile: full-screen scroll feed starting at selected image */}
      {viewPhoto && (
        <div className="fixed inset-x-0 top-0 bottom-14 z-30 bg-[var(--app-bg)] overflow-y-auto md:hidden">
          <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3" style={{ background: "var(--card-bg)", borderBottom: `1px solid var(--border)` }}>
            <h4 className="text-sm font-semibold">@{username || fullName || "profile"}</h4>
            <button className="text-sm muted btn-focus" onClick={closeViewer}>Close</button>
          </div>
          <div className="px-2 pb-24 space-y-3">
            {myPhotos.slice(viewIndex).map((p) => {
              const e = engagement[p.id] || { likesCount: 0, likedByMe: false, commentsCount: 0, previewComments: [] };
              const handle = username || fullName || "user";
              return (
                <FeedCard
                  key={p.id}
                  photoId={p.id}
                  url={p.url}
                  aspect={p.aspect}
                  caption={p.caption}
                  created_at={p.created_at}
                  handle={handle}
                  place={location}
                  likesCount={e.likesCount}
                  likedByMe={e.likedByMe}
                  commentsCount={e.commentsCount}
                  previewComments={e.previewComments}
                  onOpenComments={() => setCommentsFor(p.id)}
                  imgSizes="100vw"
                  ownedByMe
                  onEdit={(photoId) => {
                    const current = myPhotos.find((x) => x.id === photoId)?.caption || "";
                    const next = prompt("Edit post", current);
                    if (next == null) return;
                    supabase.from('photos').update({ caption: next }).eq('id', photoId).then(({ error }) => {
                      if (!error) setMyPhotos((arr) => arr.map((it) => it.id === photoId ? { ...it, caption: next } : it));
                    });
                  }}
                  onDelete={(photoId) => {
                    if (!confirm('Delete this photo?')) return;
                    supabase.from('photos').delete().eq('id', photoId).then(({ error }) => {
                      if (!error) setMyPhotos((arr) => arr.filter((it) => it.id !== photoId));
                    });
                  }}
                />
              );
            })}
          </div>
        </div>
      )}

      <CommentsDrawer open={!!commentsFor} onClose={() => setCommentsFor(null)} photoId={commentsFor} />
      <BottomNav active="profile" onNavigate={(path) => nav(path)} />
    </div>
  );
}
