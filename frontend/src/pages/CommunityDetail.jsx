import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import SideNav from "../components/SideNav";
import BottomNav from "../components/BottomNav";
import Button from "../components/Button";
import { supabase } from "../lib/supabase";
import { makePhotoKey } from "../lib/storage";

export default function CommunityDetail() {
  const nav = useNavigate();
  const { id: slugOrId } = useParams();
  const [query, setQuery] = useState("");
  const [comm, setComm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState(false);
  // Unified posts feed (text + photo + link)
  const [toggling, setToggling] = useState(false);
  const [me, setMe] = useState(null);
  const [composer, setComposer] = useState("");
  const [posting, setPosting] = useState(false);
  const [posts, setPosts] = useState([]);
  const [postPhotoUrls, setPostPhotoUrls] = useState({}); // photo_id -> public URL
  const [likeCounts, setLikeCounts] = useState({}); // postId -> n
  const [likedByMe, setLikedByMe] = useState(new Set());
  const [commentCounts, setCommentCounts] = useState({});
  const [authorNames, setAuthorNames] = useState({}); // user_id -> name
  const [ownerName, setOwnerName] = useState("");
  const [membersCount, setMembersCount] = useState(0);
  const [members, setMembers] = useState([]); // [{ id, username, full_name }]
  const [tab, setTab] = useState('posts'); // posts | members
  const [pickerOpen, setPickerOpen] = useState(false);
  const [myPhotos, setMyPhotos] = useState([]); // recent photos for picker
  const [selectedPhotoId, setSelectedPhotoId] = useState(null);
  const [sortBy, setSortBy] = useState('new'); // new | top
  const [postType, setPostType] = useState('text'); // text | photo | link
  const [postTitle, setPostTitle] = useState("");
  const [postLink, setPostLink] = useState("");
  const [openComments, setOpenComments] = useState(new Set());
  const [commentsByPost, setCommentsByPost] = useState({});
  const [newComment, setNewComment] = useState({});
  const [commentsLoading, setCommentsLoading] = useState({});
  const [uploadingNew, setUploadingNew] = useState(false);
  const fileInputRef = useState(null)[0] || null; // placeholder
  const [fileInputEl, setFileInputEl] = useState(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      const { data: cBySlug } = await supabase.from('communities').select('*').eq('slug', slugOrId).maybeSingle();
      const { data: cById } = cBySlug ? { data: null } : await supabase.from('communities').select('*').eq('id', slugOrId).maybeSingle();
      const c = cBySlug || cById;
      if (!active) return;
      setComm(c);
      if (c) {
        const { data: ownerProfile } = await supabase.from('profiles').select('username, full_name').eq('id', c.created_by).maybeSingle();
        if (active) setOwnerName(ownerProfile?.username || ownerProfile?.full_name || 'owner');
        // joined?
        const { data: meRes } = await supabase.auth.getUser();
        const currUser = meRes?.user || null;
        if (currUser) {
          const { data: m } = await supabase.from('community_members').select('user_id').eq('community_id', c.id).eq('user_id', currUser.id).maybeSingle();
          if (active) { setJoined(!!m); setMe(currUser); }
          // load my recent photos for photo post picker
          const { data: mine } = await supabase
            .from('photos')
            .select('id, storage_path, created_at')
            .eq('user_id', currUser.id)
            .order('created_at', { ascending: false })
            .limit(24);
          if (active) {
            setMyPhotos(mine || []);
          }
        }
        // members count + preview list
        const [{ count }, { data: memRows }] = await Promise.all([
          supabase.from('community_members').select('user_id', { count: 'exact', head: true }).eq('community_id', c.id),
          supabase.from('community_members').select('user_id').eq('community_id', c.id).order('joined_at', { ascending: false }).limit(24),
        ]);
        if (active) setMembersCount(count || 0);
        const uids = (memRows || []).map((m) => m.user_id);
        if (uids.length) {
          const { data: profs } = await supabase.from('profiles').select('id, username, full_name').in('id', uids);
          if (active) setMembers((profs || []).map((p) => ({ id: p.id, username: p.username, full_name: p.full_name })));
        } else {
          if (active) setMembers([]);
        }
        // load community posts (text/photo/link)
        const { data: p } = await supabase
          .from('community_posts')
          .select('*')
          .eq('community_id', c.id)
          .order('created_at', { ascending: false })
          .limit(50);
        if (active) setPosts(p || []);
        const postIds = (p || []).map((x) => x.id);
        if (postIds.length) {
          const [{ data: likes }, { data: myLikes }, { data: comms }] = await Promise.all([
            supabase.from('community_post_likes').select('post_id').in('post_id', postIds),
            currUser ? supabase.from('community_post_likes').select('post_id').eq('user_id', currUser.id).in('post_id', postIds) : Promise.resolve({ data: [] }),
            supabase.from('community_post_comments').select('post_id').in('post_id', postIds),
          ]);
          if (active) {
            const lc = {}; (likes || []).forEach((r) => { lc[r.post_id] = (lc[r.post_id] || 0) + 1; }); setLikeCounts(lc);
            const cc = {}; (comms || []).forEach((r) => { cc[r.post_id] = (cc[r.post_id] || 0) + 1; }); setCommentCounts(cc);
            setLikedByMe(new Set((myLikes || []).map((r) => r.post_id)));
          }
          const uids = Array.from(new Set((p || []).map((x) => x.user_id)));
          if (uids.length) {
            const { data: profs } = await supabase.from('profiles').select('id, username, full_name').in('id', uids);
            if (active) setAuthorNames(Object.fromEntries((profs || []).map((pp) => [pp.id, pp.username || pp.full_name])));
          }
          // Resolve photo URLs for photo posts
          const photoIds = Array.from(new Set((p || []).filter((x) => x.photo_id).map((x) => x.photo_id)));
          if (photoIds.length) {
            const { data: ph } = await supabase.from('photos').select('id, storage_path').in('id', photoIds);
            const map = Object.fromEntries((ph || []).map((row) => [row.id, `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/photos/${row.storage_path}`]));
            if (active) setPostPhotoUrls(map);
          } else {
            if (active) setPostPhotoUrls({});
          }
        }
      }
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [slugOrId]);

  async function toggleJoin() {
    if (!comm) return;
    setToggling(true);
    const { data: me } = await supabase.auth.getUser();
    if (!me?.user) { setToggling(false); nav('/login'); return; }
    if (joined) {
      await supabase.from('community_members').delete().eq('community_id', comm.id).eq('user_id', me.user.id);
      setJoined(false);
    } else {
      await supabase.from('community_members').insert({ community_id: comm.id, user_id: me.user.id });
      setJoined(true);
    }
    setToggling(false);
  }

  async function postText() {
    if (!comm || !me) return;
    const title = postTitle.trim();
    if (!title) return;
    const hasText = !!composer.trim();
    setPosting(true);
    let payload = { community_id: comm.id, user_id: me.id, title };
    if (postType === 'text') payload = { ...payload, kind: 'text', body: composer.trim() };
    if (postType === 'photo') payload = { ...payload, kind: 'photo', photo_id: selectedPhotoId, body: hasText ? composer.trim() : null };
    if (postType === 'link') payload = { ...payload, kind: 'link', link_url: postLink.trim(), body: hasText ? composer.trim() : null };
    const { data, error } = await supabase.from('community_posts').insert(payload).select('*').single();
    setPosting(false);
    if (!error && data) {
      setComposer("");
      setSelectedPhotoId(null);
      setPostTitle("");
      setPostLink("");
      setPosts((arr) => [data, ...arr]);
      if (data.photo_id) {
        // ensure URL available
        if (!postPhotoUrls[data.photo_id]) {
          const { data: ph } = await supabase.from('photos').select('id, storage_path').eq('id', data.photo_id).maybeSingle();
          if (ph?.storage_path) {
            setPostPhotoUrls((m) => ({ ...m, [data.photo_id]: `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/photos/${ph.storage_path}` }));
          }
        }
      }
    }
  }

  async function loadComments(postId) {
    setCommentsLoading((m) => ({ ...m, [postId]: true }));
    const { data } = await supabase
      .from('community_post_comments')
      .select('id, body, user_id, created_at')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    setCommentsLoading((m) => ({ ...m, [postId]: false }));
    setCommentsByPost((map) => ({ ...map, [postId]: data || [] }));
  }

  async function addComment(postId) {
    const text = (newComment[postId] || '').trim();
    if (!text || !me) return;
    const { data, error } = await supabase
      .from('community_post_comments')
      .insert({ post_id: postId, user_id: me.id, body: text })
      .select('id, body, user_id, created_at')
      .single();
    if (!error) {
      setNewComment((m) => ({ ...m, [postId]: '' }));
      setCommentsByPost((map) => ({ ...map, [postId]: [ ...(map[postId] || []), data ] }));
      setCommentCounts((cc) => ({ ...cc, [postId]: (cc[postId] || 0) + 1 }));
    }
  }

  async function onUploadNewPhoto(e) {
    const file = e.target.files?.[0];
    if (!file || !me) return;
    try {
      setUploadingNew(true);
      const key = makePhotoKey(me.id, file);
      const { error: upErr } = await supabase.storage.from('photos').upload(key, file, { upsert: false, cacheControl: '3600' });
      if (upErr) throw upErr;
      // create photos row
      const { data: row, error: insErr } = await supabase
        .from('photos')
        .insert({ user_id: me.id, storage_path: key, caption: null, exif: null })
        .select('id, storage_path')
        .single();
      if (insErr) throw insErr;
      setSelectedPhotoId(row.id);
      setPostPhotoUrls((m) => ({ ...m, [row.id]: `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/photos/${row.storage_path}` }));
    } catch (err) {
      console.error('Upload failed', err);
      alert('Upload failed. Please try again.');
    } finally {
      setUploadingNew(false);
      // reset input so the same file can be chosen again later
      e.target.value = '';
    }
  }

  async function toggleLike(postId) {
    if (!me) { nav('/login'); return; }
    if (likedByMe.has(postId)) {
      await supabase.from('community_post_likes').delete().eq('post_id', postId).eq('user_id', me.id);
      setLikedByMe((s) => { const n = new Set(s); n.delete(postId); return n; });
      setLikeCounts((m) => ({ ...m, [postId]: Math.max(0, (m[postId] || 1) - 1) }));
    } else {
      await supabase.from('community_post_likes').insert({ post_id: postId, user_id: me.id });
      setLikedByMe((s) => new Set([...s, postId]));
      setLikeCounts((m) => ({ ...m, [postId]: (m[postId] || 0) + 1 }));
    }
  }

  const visiblePosts = useMemo(() => {
    const arr = [...posts];
    if (sortBy === 'top') {
      arr.sort((a, b) => {
        const sa = likeCounts[a.id] || 0;
        const sb = likeCounts[b.id] || 0;
        if (sb !== sa) return sb - sa;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    } else {
      // new
      arr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return arr;
  }, [posts, sortBy, likeCounts]);

  return (
    <div className="min-h-screen bg-[var(--app-bg)]">
      <SideNav active="communities" onNavigate={(p) => nav(p)} onLogout={() => {}} query={query} setQuery={setQuery} />
      <main className="mx-auto max-w-6xl px-4 py-6 pb-16 md:pl-[260px]">
        {loading ? (
          <div className="rounded-2xl border p-6" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Loading…</p>
          </div>
        ) : !comm ? (
          <div className="rounded-2xl border p-6" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Community not found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Hero header */}
            <section className="rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
              <div className="h-28 md:h-36" style={{ background: comm.cover_url ? `url(${comm.cover_url}) center/cover` : 'var(--hover)' }} />
              <div className="flex items-start justify-between gap-3 p-4" style={{ background: 'var(--card-bg)' }}>
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight">{comm.name}</h1>
                  <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>{membersCount} {membersCount === 1 ? 'member' : 'members'}</p>
                  {comm.description && <p className="text-sm mt-2" style={{ color: 'var(--muted)' }}>{comm.description}</p>}
                </div>
                <Button variant={joined ? 'outline' : 'primary'} onClick={toggleJoin} loading={toggling}>{joined ? 'Joined' : 'Join'}</Button>
              </div>
            </section>

            {/* Tabs */}
            <div className="flex items-center gap-3">
              {['posts','members'].map((t) => (
                <button key={t} onClick={() => setTab(t)} className={`px-3 py-2 rounded-lg text-sm ${tab===t ? 'font-semibold' : 'muted'} btn-focus`}>
                  {t.charAt(0).toUpperCase()+t.slice(1)}
                </button>
              ))}
            </div>

            {tab === 'posts' && (
            <section>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium" style={{ color: 'var(--text)' }}>Posts</h2>
                <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--muted)' }}>
                  <span>Sort</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="rounded-lg bg-[var(--hover)] px-2 py-1"
                  >
                    <option value="new">New</option>
                    <option value="top">Top</option>
                  </select>
                </div>
              </div>
              {joined && (
                <div className="mt-2 rounded-2xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
                  <div>
                    <input value={postTitle} onChange={(e) => setPostTitle(e.target.value)} placeholder="Title (optional)" className="w-full rounded-xl bg-[var(--hover)] px-3 py-2 text-sm outline-none" />
                  </div>
                  <textarea
                    rows={3}
                    value={composer}
                    onChange={(e) => setComposer(e.target.value)}
                    placeholder="Share an update with the community…"
                    className="w-full rounded-xl bg-[var(--hover)] px-3 py-2 text-sm outline-none"
                  />
                  <div className="mt-2">
                    <input value={postLink} onChange={(e) => setPostLink(e.target.value)} placeholder="Link (optional: https://example.com)" className="w-full rounded-xl bg-[var(--hover)] px-3 py-2 text-sm outline-none" />
                  </div>
                  {selectedPhotoId && (
                    <div className="mt-2">
                      <div className="rounded-xl overflow-hidden" style={{ aspectRatio: '3 / 4', background: 'var(--hover)' }}>
                        {postPhotoUrls[selectedPhotoId] && (
                          <img src={postPhotoUrls[selectedPhotoId]} alt="selected" className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="mt-2 flex justify-end">
                        <Button size="sm" variant="outline" onClick={() => setSelectedPhotoId(null)}>Remove photo</Button>
                      </div>
                    </div>
                  )}
                  {!selectedPhotoId && (
                    <div className="mt-2">
                      <div className="flex items-center gap-3">
                        <button type="button" className="text-xs underline" onClick={() => setPickerOpen((v) => !v)}>
                          {pickerOpen ? 'Hide photos' : 'Pick existing photo'}
                        </button>
                        <div className="flex items-center gap-2">
                          <input ref={setFileInputEl} type="file" accept="image/*" className="hidden" onChange={onUploadNewPhoto} />
                          <Button size="sm" variant="outline" onClick={() => fileInputEl && fileInputEl.click()} loading={uploadingNew}>Upload new</Button>
                        </div>
                      </div>
                      {pickerOpen && (
                        <div className="mt-2 grid grid-cols-4 gap-2">
                          {(myPhotos || []).map((ph) => (
                            <button key={ph.id} type="button" className="rounded-lg overflow-hidden" onClick={() => { setSelectedPhotoId(ph.id); setPickerOpen(false); }}>
                              <img src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/photos/${ph.storage_path}`} alt="mine" className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="mt-2 flex justify-end gap-2">
                    <Button size="sm" onClick={postText} loading={posting} disabled={!composer.trim() && !selectedPhotoId && !postLink.trim()}>Post</Button>
                  </div>
                </div>
              )}
              {visiblePosts.length === 0 ? (
                <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>No posts yet.</p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {visiblePosts.map((p) => (
                    <li key={p.id} className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
                      <div className="text-xs" style={{ color: 'var(--muted)' }}>@{authorNames[p.user_id] || p.user_id.slice(0,8)}</div>
                      {p.kind === 'text' && (
                        <p className="mt-1 text-sm" style={{ color: 'var(--text)' }}>{p.body}</p>
                      )}
                      {p.photo_id && (
                        <div className="mt-2" style={{ aspectRatio: '3 / 4', background: 'var(--hover)' }}>
                          {postPhotoUrls[p.photo_id] && (
                            <img src={postPhotoUrls[p.photo_id]} alt="photo" className="w-full h-full object-cover rounded-lg" />
                          )}
                        </div>
                      )}
                      {p.title && (
                        <h3 className="mt-2 text-sm font-semibold" style={{ color: 'var(--text)' }}>{p.title}</h3>
                      )}
                      {p.link_url && (
                        <a href={p.link_url} target="_blank" rel="noreferrer" className="mt-1 text-xs underline" style={{ color: 'var(--muted)' }}>{p.link_url}</a>
                      )}
                      <div className="mt-3 flex items-center gap-4 text-xs" style={{ color: 'var(--muted)' }}>
                        <button onClick={() => toggleLike(p.id)} className="underline">
                          {likedByMe.has(p.id) ? 'Unlike' : 'Like'} ({likeCounts[p.id] || 0})
                        </button>
                        <button onClick={() => {
                          const open = new Set(openComments);
                          if (open.has(p.id)) { open.delete(p.id); setOpenComments(open); }
                          else { open.add(p.id); setOpenComments(open); if (!commentsByPost[p.id]) loadComments(p.id); }
                        }} className="underline">Comments {commentCounts[p.id] || 0}</button>
                      </div>
                      {openComments.has(p.id) && (
                        <div className="mt-2 rounded-xl border p-3" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
                          {commentsLoading[p.id] ? (
                            <p className="text-xs" style={{ color: 'var(--muted)' }}>Loading comments…</p>
                          ) : (
                            <ul className="space-y-2">
                              {(commentsByPost[p.id] || []).map((c) => (
                                <li key={c.id} className="rounded border p-2" style={{ borderColor: 'var(--border)' }}>
                                  <div className="text-xs" style={{ color: 'var(--muted)' }}>{new Date(c.created_at).toLocaleString()}</div>
                                  <div className="text-sm" style={{ color: 'var(--text)' }}>{c.body}</div>
                                </li>
                              ))}
                            </ul>
                          )}
                          {joined && (
                            <div className="mt-2 flex items-center gap-2">
                              <input value={newComment[p.id] || ''} onChange={(e) => setNewComment((m) => ({ ...m, [p.id]: e.target.value }))} placeholder="Add a comment" className="flex-1 rounded-xl bg-[var(--hover)] px-3 py-2 text-sm outline-none" />
                              <Button size="sm" onClick={() => addComment(p.id)} disabled={!newComment[p.id] || !newComment[p.id].trim()}>Post</Button>
                            </div>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
            )}

            {tab === 'members' && (
              <section>
                {members.length === 0 ? (
                  <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>No members yet.</p>
                ) : (
                  <ul className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-3">
                    {members.map((m) => (
                      <li key={m.id} className="rounded-xl border px-3 py-2 text-sm" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
                        @{m.username || m.full_name || m.id.slice(0,8)}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
            {/* Simple sidebar blocks for about/mods/rules */}
            <section className="grid md:grid-cols-3 gap-4">
              <div className="md:col-span-2" />
              <aside className="space-y-3">
                <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
                  <h3 className="text-sm font-medium">About</h3>
                  <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>{comm.description || 'No description yet.'}</p>
                </div>
                <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
                  <h3 className="text-sm font-medium">Moderators</h3>
                  <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>Owner: @{ownerName}</p>
                </div>
                <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
                  <h3 className="text-sm font-medium">Rules</h3>
                  <ul className="mt-2 list-disc pl-5 text-sm" style={{ color: 'var(--muted)' }}>
                    <li>Be respectful.</li>
                    <li>No spam or self-promotion.</li>
                    <li>Stay on topic.</li>
                  </ul>
                </div>
              </aside>
            </section>
          </div>
        )}
      </main>
      <BottomNav active="communities" onNavigate={(p) => nav(p)} />
    </div>
  );
}
