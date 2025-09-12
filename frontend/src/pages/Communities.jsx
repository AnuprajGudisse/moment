import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import SideNav from "../components/SideNav";
import BottomNav from "../components/BottomNav";
import Button from "../components/Button";
import Input from "../components/Input";
import Select from "../components/Select";
import Label from "../components/Label";
import { supabase } from "../lib/supabase";

export default function Communities() {
  const nav = useNavigate();
  const [query, setQuery] = useState("");
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", description: "" });
  const [me, setMe] = useState(null);
  const [myComms, setMyComms] = useState([]);
  const [joining, setJoining] = useState({}); // community_id -> bool
  const [joinedSet, setJoinedSet] = useState(new Set());
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedPosts, setFeedPosts] = useState([]); // [{ id, community_id, user_id, kind, body, created_at }]
  const [authorNames, setAuthorNames] = useState({});
  const [communityNames, setCommunityNames] = useState({});
  const [likeCounts, setLikeCounts] = useState({});
  const [likedByMe, setLikedByMe] = useState(new Set());
  const [commentCounts, setCommentCounts] = useState({});
  const [feedPhotoUrls, setFeedPhotoUrls] = useState({}); // photo_id -> url

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => { if (active) setMe(data.user ?? null); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    async function loadMine() {
      if (!me) { setMyComms([]); setJoinedSet(new Set()); return; }
      const { data: mems } = await supabase
        .from('community_members')
        .select('community_id')
        .eq('user_id', me.id)
        .limit(100);
      const ids = (mems || []).map((m) => m.community_id);
      setJoinedSet(new Set(ids));
      if (ids.length) {
        const { data: rows } = await supabase
          .from('communities')
          .select('id, name, slug, description')
          .in('id', ids)
          .order('name');
        if (active) setMyComms(rows || []);
      } else {
        if (active) setMyComms([]);
      }
    }
    loadMine();
    async function load() {
      setLoading(true);
      let q = supabase.from('communities').select('id, name, slug, description, created_at').order('created_at', { ascending: false }).limit(50);
      if (query.trim()) {
        const t = `%${query.trim()}%`;
        q = q.or(`name.ilike.${t},description.ilike.${t},slug.ilike.${t}`);
      }
      const { data } = await q;
      if (!active) return;
      setCommunities(data || []);
      setLoading(false);
    }
    load();
    // Load feed from joined communities
    async function loadFeed() {
      setFeedLoading(true);
      try {
        if (!me) { setFeedPosts([]); setFeedLoading(false); return; }
        const { data: mems } = await supabase
          .from('community_members')
          .select('community_id')
          .eq('user_id', me.id)
          .limit(200);
        const ids = (mems || []).map((m) => m.community_id);
        if (ids.length === 0) { setFeedPosts([]); setFeedLoading(false); return; }
        const { data: posts } = await supabase
          .from('community_posts')
          .select('id, community_id, user_id, kind, body, photo_id, created_at')
          .in('community_id', ids)
          .order('created_at', { ascending: false })
          .limit(50);
        setFeedPosts(posts || []);
        const pids = (posts || []).map((p) => p.id);
        if (pids.length) {
          const [{ data: likes }, { data: myLikes }, { data: comms }] = await Promise.all([
            supabase.from('community_post_likes').select('post_id').in('post_id', pids),
            supabase.from('community_post_likes').select('post_id').eq('user_id', me.id).in('post_id', pids),
            supabase.from('community_post_comments').select('post_id').in('post_id', pids),
          ]);
          const lc = {}; (likes || []).forEach((r) => { lc[r.post_id] = (lc[r.post_id] || 0) + 1; }); setLikeCounts(lc);
          const cc = {}; (comms || []).forEach((r) => { cc[r.post_id] = (cc[r.post_id] || 0) + 1; }); setCommentCounts(cc);
          setLikedByMe(new Set((myLikes || []).map((r) => r.post_id)));
          const uids = Array.from(new Set((posts || []).map((p) => p.user_id)));
          const cids = Array.from(new Set((posts || []).map((p) => p.community_id)));
          const [{ data: profs }, { data: commRows }] = await Promise.all([
            uids.length ? supabase.from('profiles').select('id, username, full_name').in('id', uids) : Promise.resolve({ data: [] }),
            cids.length ? supabase.from('communities').select('id, name, slug').in('id', cids) : Promise.resolve({ data: [] }),
          ]);
          setAuthorNames(Object.fromEntries((profs || []).map((p) => [p.id, p.username || p.full_name || p.id.slice(0,8)])));
          setCommunityNames(Object.fromEntries((commRows || []).map((c) => [c.id, c.name])));
          const photoIds = Array.from(new Set((posts || []).filter((p) => p.photo_id).map((p) => p.photo_id)));
          if (photoIds.length) {
            const { data: ph } = await supabase.from('photos').select('id, storage_path').in('id', photoIds);
            setFeedPhotoUrls(Object.fromEntries((ph || []).map((row) => [row.id, `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/photos/${row.storage_path}`])));
          } else {
            setFeedPhotoUrls({});
          }
        } else {
          setLikeCounts({}); setCommentCounts({}); setAuthorNames({}); setCommunityNames({}); setLikedByMe(new Set());
        }
      } finally {
        setFeedLoading(false);
      }
    }
    loadFeed();
    return () => { active = false; };
  }, [query, me, supabase]);

  function CommunityCard({ c, joined }) {
    return (
      <div className="rounded-2xl border p-4 hover:bg-[var(--hover)]" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link to={`/communities/${c.slug || c.id}`} className="text-base font-semibold underline" style={{ color: 'var(--text)' }}>{c.name}</Link>
            {c.description && <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>{c.description}</p>}
            {c.slug && <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>/{c.slug}</p>}
          </div>
          <div className="shrink-0">
            <Button size="sm" variant={joined ? 'outline' : 'primary'} onClick={() => toggleJoin(c)} loading={!!joining[c.id]}>
              {joined ? 'Joined' : 'Join'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  async function createCommunity(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setCreating(true);
    const { data: { user } } = await supabase.auth.getUser();
    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim() || null,
      description: form.description.trim() || null,
      created_by: user?.id,
    };
    const { error } = await supabase.from('communities').insert(payload);
    setCreating(false);
    if (!error) {
      setForm({ name: "", slug: "", description: "" });
      setQuery("");
    }
  }

  async function toggleJoin(c) {
    if (!me) { nav('/login'); return; }
    setJoining((m) => ({ ...m, [c.id]: true }));
    if (joinedSet.has(c.id)) {
      await supabase.from('community_members').delete().eq('community_id', c.id).eq('user_id', me.id);
      setJoinedSet((s) => { const next = new Set(s); next.delete(c.id); return next; });
      setMyComms((arr) => arr.filter((x) => x.id !== c.id));
    } else {
      await supabase.from('community_members').insert({ community_id: c.id, user_id: me.id });
      setJoinedSet((s) => new Set([...s, c.id]));
      setMyComms((arr) => [{ id: c.id, name: c.name, slug: c.slug, description: c.description }, ...arr]);
    }
    setJoining((m) => ({ ...m, [c.id]: false }));
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

  function FeedItem({ p }) {
    return (
      <li className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
        <div className="text-xs" style={{ color: 'var(--muted)' }}>
          <span className="rounded-full bg-[var(--hover)] px-2 py-0.5 mr-2">{communityNames[p.community_id] || 'Community'}</span>
          @{authorNames[p.user_id] || p.user_id.slice(0,8)}
        </div>
        {p.kind === 'text' && (
          <p className="mt-2 text-sm" style={{ color: 'var(--text)' }}>{p.body}</p>
        )}
        {p.kind === 'photo' && p.photo_id && (
          <div className="mt-2" style={{ aspectRatio: '3 / 4', background: 'var(--hover)' }}>
            {feedPhotoUrls[p.photo_id] && (
              <img src={feedPhotoUrls[p.photo_id]} alt="photo" className="w-full h-full object-cover rounded-lg" />
            )}
          </div>
        )}
        <div className="mt-3 flex items-center gap-4 text-xs" style={{ color: 'var(--muted)' }}>
          <button onClick={() => toggleLike(p.id)} className="underline">
            {likedByMe.has(p.id) ? 'Unlike' : 'Like'} ({likeCounts[p.id] || 0})
          </button>
          <span>Comments {commentCounts[p.id] || 0}</span>
        </div>
      </li>
    );
  }
  return (
    <div className="min-h-screen bg-[var(--app-bg)]">
      <SideNav active="communities" onNavigate={(p) => nav(p)} onLogout={() => {}} query={query} setQuery={setQuery} />
      <main className="mx-auto max-w-6xl px-4 py-6 pb-16 md:pl-[260px]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Communities</h1>
            <p className="text-sm muted mt-1">Follow interests, join circles, and share your niche.</p>
          </div>
          <Button onClick={() => document.getElementById('new-comm')?.showModal?.()}>Create</Button>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            {feedLoading ? (
              <div className="rounded-2xl border p-6" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>Loading feed…</p>
              </div>
            ) : feedPosts.length === 0 ? (
              <div className="rounded-2xl border p-6" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>Join communities to see posts here.</p>
              </div>
            ) : (
              <ul className="grid gap-3">
                {feedPosts.map((p) => <FeedItem key={p.id} p={p} />)}
              </ul>
            )}
          </div>
          <aside className="space-y-3">
            <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
              <h2 className="text-sm font-medium" style={{ color: 'var(--text)' }}>Search</h2>
              <div className="mt-3 space-y-2">
                <Input placeholder="Name, slug, description" value={query} onChange={setQuery} />
              </div>
            </div>
            {myComms.length > 0 && (
              <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
                <h2 className="text-sm font-medium" style={{ color: 'var(--text)' }}>My Communities</h2>
                <ul className="mt-2 space-y-2">
                  {myComms.slice(0, 8).map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
                      <Link to={`/communities/${c.slug || c.id}`} className="underline" style={{ color: 'var(--text)' }}>{c.name}</Link>
                      <Button size="sm" variant="outline" onClick={() => nav(`/communities/${c.slug || c.id}`)}>Open</Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
              <h2 className="text-sm font-medium" style={{ color: 'var(--text)' }}>Discover</h2>
              <div className="mt-2 grid gap-2">
                {loading ? (
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>Loading…</p>
                ) : (
                  communities.slice(0, 5).map((c) => (
                    <CommunityCard key={c.id} c={c} joined={joinedSet.has(c.id)} />
                  ))
                )}
              </div>
            </div>
          </aside>
        </div>

        <dialog id="new-comm" className="rounded-2xl border p-0 w-11/12 md:w-[520px]" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
          <form onSubmit={createCommunity} className="p-5 space-y-3">
            <h3 className="text-base font-semibold" style={{ color: 'var(--text)' }}>Create a community</h3>
            <div>
              <Label htmlFor="c-name">Name</Label>
              <Input id="c-name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="e.g. Film Street" />
            </div>
            <div>
              <Label htmlFor="c-slug">Slug</Label>
              <Input id="c-slug" value={form.slug} onChange={(v) => setForm((f) => ({ ...f, slug: v.replace(/\s+/g, '-').toLowerCase() }))} placeholder="Optional (letters, dashes)" />
            </div>
            <div>
              <Label htmlFor="c-desc">Description</Label>
              <textarea id="c-desc" rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="mt-1 w-full rounded-xl bg-[var(--hover)] px-3 py-2 text-sm outline-none" placeholder="What’s this group about?" />
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button variant="outline" type="button" onClick={() => document.getElementById('new-comm')?.close?.()}>Cancel</Button>
              <Button type="submit" loading={creating}>Create</Button>
            </div>
          </form>
        </dialog>
      </main>
      <BottomNav active="communities" onNavigate={(p) => nav(p)} />
    </div>
  );
}
