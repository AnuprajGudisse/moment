import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import SideNav from "../components/SideNav";
import BottomNav from "../components/BottomNav";
import Button from "../components/Button";
import Input from "../components/Input";
import Select from "../components/Select";
import Label from "../components/Label";
import { supabase } from "../lib/supabase";
import { PlusIcon, SearchIcon, UsersIcon, ImageIcon, CalendarIcon, TrendingUpIcon } from "../components/icons";

const COMMUNITY_CATEGORIES = [
  { value: 'all', label: 'All Communities' },
  { value: 'genre', label: 'By Genre' },
  { value: 'location', label: 'By Location' },
  { value: 'skill', label: 'By Skill Level' },
  { value: 'equipment', label: 'Equipment & Gear' }
];

export default function Communities() {
  const nav = useNavigate();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState('all');
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", description: "", category: "genre" });
  const [me, setMe] = useState(null);
  const [myComms, setMyComms] = useState([]);
  const [joining, setJoining] = useState({});
  const [joinedSet, setJoinedSet] = useState(new Set());
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedPosts, setFeedPosts] = useState([]);
  const [authorNames, setAuthorNames] = useState({});
  const [communityNames, setCommunityNames] = useState({});
  const [likeCounts, setLikeCounts] = useState({});
  const [likedByMe, setLikedByMe] = useState(new Set());
  const [commentCounts, setCommentCounts] = useState({});
  const [feedPhotoUrls, setFeedPhotoUrls] = useState({});
  const [activeTab, setActiveTab] = useState('feed');
  const [memberCounts, setMemberCounts] = useState({});

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => { if (active) setMe(data.user ?? null); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    async function loadData() {
      if (!active) return;
      
      setLoading(true);
      
      // Load communities
      let q = supabase.from('communities').select('id, name, slug, description, created_at').order('created_at', { ascending: false }).limit(50);
      if (query.trim()) {
        const t = `%${query.trim()}%`;
        q = q.or(`name.ilike.${t},description.ilike.${t},slug.ilike.${t}`);
      }
      const { data: communitiesData } = await q;
      
      if (!active) return;
      setCommunities(communitiesData || []);
      
      // Load member counts for communities
      if (communitiesData?.length) {
        const { data: memberCountsData } = await supabase
          .from('community_members')
          .select('community_id')
          .in('community_id', communitiesData.map(c => c.id));
        
        const counts = {};
        memberCountsData?.forEach(member => {
          counts[member.community_id] = (counts[member.community_id] || 0) + 1;
        });
        setMemberCounts(counts);
      }
      
      if (me) {
        // Load user's communities
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
        
        // Load feed from joined communities
        await loadFeed(ids);
      }
      
      setLoading(false);
    }
    
    loadData();
    return () => { active = false; };
  }, [query, me, category]);

  async function loadFeed(communityIds = null) {
    setFeedLoading(true);
    try {
      if (!me) { 
        setFeedPosts([]); 
        setFeedLoading(false); 
        return; 
      }
      
      let ids = communityIds;
      if (!ids) {
        const { data: mems } = await supabase
          .from('community_members')
          .select('community_id')
          .eq('user_id', me.id)
          .limit(200);
        ids = (mems || []).map((m) => m.community_id);
      }
      
      if (ids.length === 0) { 
        setFeedPosts([]); 
        setFeedLoading(false); 
        return; 
      }
      
      const { data: posts } = await supabase
        .from('community_posts')
        .select('id, community_id, user_id, kind, body, photo_id, created_at, title')
        .in('community_id', ids)
        .order('created_at', { ascending: false })
        .limit(20);
      
      setFeedPosts(posts || []);
      
      const pids = (posts || []).map((p) => p.id);
      if (pids.length) {
        const [{ data: likes }, { data: myLikes }, { data: comms }] = await Promise.all([
          supabase.from('community_post_likes').select('post_id').in('post_id', pids),
          supabase.from('community_post_likes').select('post_id').eq('user_id', me.id).in('post_id', pids),
          supabase.from('community_post_comments').select('post_id').in('post_id', pids),
        ]);
        
        const lc = {}; 
        (likes || []).forEach((r) => { lc[r.post_id] = (lc[r.post_id] || 0) + 1; }); 
        setLikeCounts(lc);
        
        const cc = {}; 
        (comms || []).forEach((r) => { cc[r.post_id] = (cc[r.post_id] || 0) + 1; }); 
        setCommentCounts(cc);
        
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
        setLikeCounts({}); 
        setCommentCounts({}); 
        setAuthorNames({}); 
        setCommunityNames({}); 
        setLikedByMe(new Set());
      }
    } finally {
      setFeedLoading(false);
    }
  }

  function CommunityCard({ c, joined, featured = false }) {
    const memberCount = memberCounts[c.id] || 0;
    
    return (
      <div className="group rounded-lg border p-4 transition-all hover:bg-[var(--hover)] hover:bg-opacity-50" 
           style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-[var(--hover)] flex items-center justify-center text-sm font-medium" style={{ color: 'var(--text)' }}>
                {c.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <Link to={`/communities/${c.slug || c.id}`} 
                      className="font-medium text-sm text-[var(--text)] hover:underline block truncate">
                  {c.name}
                </Link>
                {c.slug && <p className="text-xs text-[var(--muted)]">/{c.slug}</p>}
              </div>
            </div>
            
            {c.description && (
              <p className="text-sm text-[var(--muted)] line-clamp-2 mb-3">{c.description}</p>
            )}
            
            <div className="flex items-center gap-4 text-xs text-[var(--muted)]">
              <div className="flex items-center gap-1">
                <UsersIcon size={14} />
                <span>{memberCount} {memberCount === 1 ? 'member' : 'members'}</span>
              </div>
              <div className="flex items-center gap-1">
                <CalendarIcon size={14} />
                <span>{new Date(c.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          
          <div className="shrink-0">
            <Button 
              size="sm" 
              variant={joined ? 'outline' : 'primary'} 
              onClick={() => toggleJoin(c)} 
              loading={!!joining[c.id]}
              className="min-w-[80px]"
            >
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
      setForm({ name: "", slug: "", description: "", category: "genre" });
      setQuery("");
      document.getElementById('new-comm')?.close?.();
    }
  }

  async function toggleJoin(c) {
    if (!me) { nav('/login'); return; }
    setJoining((m) => ({ ...m, [c.id]: true }));
    if (joinedSet.has(c.id)) {
      await supabase.from('community_members').delete().eq('community_id', c.id).eq('user_id', me.id);
      setJoinedSet((s) => { const next = new Set(s); next.delete(c.id); return next; });
      setMyComms((arr) => arr.filter((x) => x.id !== c.id));
      setMemberCounts(prev => ({ ...prev, [c.id]: Math.max(0, (prev[c.id] || 1) - 1) }));
    } else {
      await supabase.from('community_members').insert({ community_id: c.id, user_id: me.id });
      setJoinedSet((s) => new Set([...s, c.id]));
      setMyComms((arr) => [{ id: c.id, name: c.name, slug: c.slug, description: c.description }, ...arr]);
      setMemberCounts(prev => ({ ...prev, [c.id]: (prev[c.id] || 0) + 1 }));
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
    const timeAgo = (date) => {
      const now = new Date();
      const then = new Date(date);
      const diffMs = now - then;
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${diffDays}d ago`;
    };

    return (
      <article className="bg-[var(--card-bg)] rounded-2xl border p-6 hover:bg-[var(--hover)] transition-colors cursor-pointer" 
               style={{ borderColor: 'var(--border)' }}
               onClick={() => nav(`/posts/${p.id}`)}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-[var(--hover)] flex items-center justify-center text-xs font-medium" style={{ color: 'var(--text)' }}>
            {(authorNames[p.user_id] || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-[var(--text)]">@{authorNames[p.user_id] || p.user_id.slice(0,8)}</span>
              <span className="text-xs text-[var(--muted)]">•</span>
              <span className="text-xs text-[var(--muted)]">{timeAgo(p.created_at)}</span>
            </div>
            <Link to={`/communities/${communityNames[p.community_id] || p.community_id}`} 
                  className="text-xs hover:underline truncate block" 
                  style={{ color: 'var(--muted)' }}
                  onClick={(e) => e.stopPropagation()}>
              {communityNames[p.community_id] || 'Community'}
            </Link>
          </div>
        </div>
        
        {p.title && (
          <h3 className="text-lg font-semibold text-[var(--text)] mb-2">{p.title}</h3>
        )}
        
        {p.kind === 'text' && p.body && (
          <p className="text-[var(--text)] mb-4 leading-relaxed line-clamp-3">{p.body}</p>
        )}
        
        {p.kind === 'photo' && p.photo_id && (
          <div className="mb-4">
            {feedPhotoUrls[p.photo_id] && (
              <img 
                src={feedPhotoUrls[p.photo_id]} 
                alt="Community post" 
                className="w-full max-h-96 object-cover rounded-xl" 
              />
            )}
            {p.body && (
              <p className="text-[var(--text)] mt-3 leading-relaxed line-clamp-2">{p.body}</p>
            )}
          </div>
        )}
        
        <div className="flex items-center gap-6 pt-3 border-t border-[var(--border)]">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              toggleLike(p.id);
            }} 
            className={`flex items-center gap-2 text-sm transition-colors ${
              likedByMe.has(p.id) ? 'text-[var(--text)]' : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            <span>{likedByMe.has(p.id) ? '❤️' : '🤍'}</span>
            <span>{likeCounts[p.id] || 0}</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              nav(`/posts/${p.id}`);
            }}
            className="flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors"
          >
            <span>💬</span>
            <span>{commentCounts[p.id] || 0} comments</span>
          </button>
        </div>
      </article>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--app-bg)]">
      <SideNav active="communities" onNavigate={(p) => nav(p)} onLogout={() => {}} query={query} setQuery={setQuery} />
      
      <main className="mx-auto max-w-7xl px-4 py-6 pb-16 md:pl-[280px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text)]">Communities</h1>
            <p className="text-[var(--muted)] mt-1">Connect with photographers who share your passion</p>
          </div>
          <Button 
            onClick={() => document.getElementById('new-comm')?.showModal?.()} 
            className="flex items-center gap-2"
          >
            <PlusIcon size={18} />
            Create Community
          </Button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-6 bg-[var(--hover)] p-1 rounded-xl w-fit">
          {[
            { id: 'feed', label: 'My Feed', icon: ImageIcon },
            { id: 'discover', label: 'Discover', icon: SearchIcon },
            { id: 'my-communities', label: 'My Communities', icon: UsersIcon }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id 
                  ? 'bg-[var(--card-bg)] text-[var(--text)] shadow-sm' 
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content based on active tab */}
        {activeTab === 'feed' && (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-[var(--text)]">Latest Posts</h2>
                <div className="text-sm text-[var(--muted)]">
                  {feedPosts.length} posts from {myComms.length} communities
                </div>
              </div>
              
              {feedLoading ? (
                <div className="space-y-4">
                  {[1,2,3].map(i => (
                    <div key={i} className="bg-[var(--card-bg)] rounded-2xl border p-6 animate-pulse" style={{ borderColor: 'var(--border)' }}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-full bg-[var(--hover)]"></div>
                        <div className="space-y-2">
                          <div className="h-4 bg-[var(--hover)] rounded w-24"></div>
                          <div className="h-3 bg-[var(--hover)] rounded w-16"></div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="h-4 bg-[var(--hover)] rounded w-full"></div>
                        <div className="h-4 bg-[var(--hover)] rounded w-3/4"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : feedPosts.length === 0 ? (
                <div className="text-center py-12 bg-[var(--card-bg)] rounded-2xl border" style={{ borderColor: 'var(--border)' }}>
                  <ImageIcon size={48} className="mx-auto text-[var(--muted)] mb-4" />
                  <h3 className="text-lg font-medium text-[var(--text)] mb-2">No posts yet</h3>
                  <p className="text-[var(--muted)] mb-4">Join communities to see posts in your feed</p>
                  <Button onClick={() => setActiveTab('discover')}>Discover Communities</Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {feedPosts.map((p) => <FeedItem key={p.id} p={p} />)}
                </div>
              )}
            </div>
            
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="bg-[var(--card-bg)] rounded-2xl border p-6" style={{ borderColor: 'var(--border)' }}>
                <h3 className="font-semibold text-[var(--text)] mb-4">Your Communities</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">Joined</span>
                    <span className="font-medium text-[var(--text)]">{myComms.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">Posts in feed</span>
                    <span className="font-medium text-[var(--text)]">{feedPosts.length}</span>
                  </div>
                </div>
              </div>

              {/* Recent Communities */}
              {myComms.length > 0 && (
                <div className="bg-[var(--card-bg)] rounded-2xl border p-6" style={{ borderColor: 'var(--border)' }}>
                  <h3 className="font-semibold text-[var(--text)] mb-4">Your Communities</h3>
                  <div className="space-y-3">
                    {myComms.slice(0, 5).map((c) => (
                      <Link 
                        key={c.id} 
                        to={`/communities/${c.slug || c.id}`}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--hover)] transition-colors"
                      >
                        <div className="w-6 h-6 rounded-full bg-[var(--hover)] flex items-center justify-center text-xs font-medium" style={{ color: 'var(--text)' }}>
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[var(--text)] truncate">{c.name}</p>
                          <p className="text-xs text-[var(--muted)]">{memberCounts[c.id] || 0} members</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                  {myComms.length > 5 && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setActiveTab('my-communities')}
                      className="w-full mt-3"
                    >
                      View all {myComms.length} communities
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'discover' && (
          <div>
            {/* Search and Filter */}
            <div className="flex gap-4 mb-6">
              <div className="flex-1 relative">
                <SearchIcon size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--muted)]" />
                <Input 
                  placeholder="Search communities..." 
                  value={query} 
                  onChange={setQuery}
                  className="pl-10"
                />
              </div>
              <Select value={category} onChange={setCategory} className="w-48">
                {COMMUNITY_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </Select>
            </div>

            {/* Communities Grid */}
            {loading ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="bg-[var(--card-bg)] rounded-2xl border p-6 animate-pulse" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 rounded-full bg-[var(--hover)]"></div>
                      <div className="space-y-2">
                        <div className="h-5 bg-[var(--hover)] rounded w-32"></div>
                        <div className="h-3 bg-[var(--hover)] rounded w-20"></div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-4 bg-[var(--hover)] rounded w-full"></div>
                      <div className="h-4 bg-[var(--hover)] rounded w-2/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : communities.length === 0 ? (
              <div className="text-center py-12 bg-[var(--card-bg)] rounded-2xl border" style={{ borderColor: 'var(--border)' }}>
                <SearchIcon size={48} className="mx-auto text-[var(--muted)] mb-4" />
                <h3 className="text-lg font-medium text-[var(--text)] mb-2">No communities found</h3>
                <p className="text-[var(--muted)] mb-4">Try adjusting your search or create a new community</p>
                <Button onClick={() => document.getElementById('new-comm')?.showModal?.()}>
                  Create Community
                </Button>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {communities.map((c, index) => (
                  <CommunityCard 
                    key={c.id} 
                    c={c} 
                    joined={joinedSet.has(c.id)} 
                    featured={index < 3 && !query} 
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'my-communities' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-[var(--text)]">My Communities</h2>
              <div className="text-sm text-[var(--muted)]">
                {myComms.length} communities joined
              </div>
            </div>
            
            {myComms.length === 0 ? (
              <div className="text-center py-12 bg-[var(--card-bg)] rounded-2xl border" style={{ borderColor: 'var(--border)' }}>
                <UsersIcon size={48} className="mx-auto text-[var(--muted)] mb-4" />
                <h3 className="text-lg font-medium text-[var(--text)] mb-2">No communities joined</h3>
                <p className="text-[var(--muted)] mb-4">Discover and join communities to connect with other photographers</p>
                <Button onClick={() => setActiveTab('discover')}>
                  Discover Communities
                </Button>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {myComms.map((c) => (
                  <CommunityCard key={c.id} c={c} joined={true} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create Community Modal */}
        <dialog id="new-comm" className="rounded-2xl border p-0 w-11/12 md:w-[520px] backdrop:bg-black backdrop:bg-opacity-50" 
                style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
          <form onSubmit={createCommunity} className="p-6 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-[var(--text)]">Create a Community</h3>
              <button 
                type="button" 
                onClick={() => document.getElementById('new-comm')?.close?.()} 
                className="text-[var(--muted)] hover:text-[var(--text)]"
              >
                ✕
              </button>
            </div>
            
            <div>
              <Label htmlFor="c-name">Community Name</Label>
              <Input 
                id="c-name" 
                value={form.name} 
                onChange={(v) => setForm((f) => ({ ...f, name: v }))} 
                placeholder="e.g. Film Street Photography" 
                required
              />
            </div>
            
            <div>
              <Label htmlFor="c-slug">URL Slug (Optional)</Label>
              <Input 
                id="c-slug" 
                value={form.slug} 
                onChange={(v) => setForm((f) => ({ ...f, slug: v.replace(/\s+/g, '-').toLowerCase() }))} 
                placeholder="film-street-photography" 
              />
              <p className="text-xs text-[var(--muted)] mt-1">Leave empty to auto-generate from name</p>
            </div>
            
            <div>
              <Label htmlFor="c-desc">Description</Label>
              <textarea 
                id="c-desc" 
                rows={3} 
                value={form.description} 
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} 
                className="mt-1 w-full rounded-xl bg-[var(--hover)] px-3 py-2 text-sm outline-none border border-[var(--border)] focus:border-[var(--ring)] transition-colors" 
                placeholder="What's this community about? Who should join?"
                style={{ background: 'var(--hover)', borderColor: 'var(--border)' }}
              />
            </div>
            
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)]">
              <Button 
                variant="outline" 
                type="button" 
                onClick={() => document.getElementById('new-comm')?.close?.()}
              >
                Cancel
              </Button>
              <Button type="submit" loading={creating}>
                Create Community
              </Button>
            </div>
          </form>
        </dialog>
      </main>
      
      <BottomNav active="communities" onNavigate={(p) => nav(p)} />
    </div>
  );
}
