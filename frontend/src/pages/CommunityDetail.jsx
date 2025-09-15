import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import SideNav from "../components/SideNav";
import BottomNav from "../components/BottomNav";
import Button from "../components/Button";
import { supabase } from "../lib/supabase";
import { makePhotoKey } from "../lib/storage";
import { 
  UsersIcon as Users, 
  CommentIcon as MessageSquare, 
  PlusIcon as Plus, 
  Check, 
  FileText, 
  UserIcon as User, 
  ImageIcon as Image, 
  Upload, 
  X, 
  Globe, 
  ExternalLink, 
  LikeIcon as Heart, 
  Send, 
  Info, 
  CalendarIcon as Calendar, 
  Shield, 
  Crown, 
  BookOpen 
} from "../components/icons";

// Recursive comment component for threaded discussions
function ThreadedComment({ comment, postId, depth = 0, onReply, newReply, setNewReply, showReplies, setShowReplies, collapsedThreads, setCollapsedThreads, joined, me }) {
  const isCollapsed = collapsedThreads.has(comment.id);
  const hasReplies = comment.replies && comment.replies.length > 0;
  const showReplyForm = showReplies.has(comment.id);
  
  const toggleCollapse = () => {
    const newSet = new Set(collapsedThreads);
    if (isCollapsed) {
      newSet.delete(comment.id);
    } else {
      newSet.add(comment.id);
    }
    setCollapsedThreads(newSet);
  };
  
  const toggleReplyForm = () => {
    const newSet = new Set(showReplies);
    if (showReplyForm) {
      newSet.delete(comment.id);
      setNewReply((m) => ({ ...m, [comment.id]: '' }));
    } else {
      newSet.add(comment.id);
    }
    setShowReplies(newSet);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-3 relative" style={{ marginLeft: `${depth * 16}px` }}>
        {/* Thread connection line for nested comments */}
        {depth > 0 && (
          <>
            <div 
              className="absolute w-px bg-[var(--border)]" 
              style={{ 
                left: `${-8}px`, 
                top: '0px', 
                height: '24px'
              }} 
            />
            <div 
              className="absolute h-px bg-[var(--border)]" 
              style={{ 
                left: `${-8}px`, 
                top: '12px', 
                width: '8px'
              }} 
            />
          </>
        )}
        
        <div className="w-6 h-6 rounded-full bg-[var(--hover)] flex items-center justify-center flex-shrink-0">
          <User className="w-3 h-3" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">Anonymous</span>
            <span className="text-xs" style={{ color: 'var(--muted)' }}>
              {new Date(comment.created_at).toLocaleDateString()} • {new Date(comment.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </span>
            {hasReplies && (
              <button
                onClick={toggleCollapse}
                className="text-xs hover:underline flex items-center gap-1"
                style={{ color: 'var(--primary)' }}
              >
                <span>{isCollapsed ? '▶' : '▼'}</span>
                {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
              </button>
            )}
          </div>
          
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>{comment.body}</p>
          
          <div className="flex items-center gap-3">
            {joined && (
              <button
                onClick={toggleReplyForm}
                className="text-xs hover:underline flex items-center gap-1"
                style={{ color: 'var(--muted)' }}
              >
                <MessageSquare className="w-3 h-3" />
                Reply
              </button>
            )}
          </div>
          
          {/* Reply form */}
          {showReplyForm && (
            <div className="flex gap-2 pt-2">
              <div className="w-5 h-5 rounded-full bg-[var(--hover)] flex items-center justify-center flex-shrink-0">
                <User className="w-2.5 h-2.5" />
              </div>
              <input 
                value={newReply[comment.id] || ''} 
                onChange={(e) => setNewReply((m) => ({ ...m, [comment.id]: e.target.value }))} 
                placeholder="Write a reply..." 
                className="flex-1 rounded-lg bg-[var(--hover)] px-3 py-2 text-sm outline-none border border-transparent focus:border-[var(--primary)] transition-colors" 
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    onReply(postId, comment.id);
                  }
                }}
                autoFocus
              />
              <Button 
                size="sm" 
                onClick={() => onReply(postId, comment.id)}
                disabled={!(newReply[comment.id] || '').trim()}
              >
                Reply
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* Nested replies with connecting lines */}
      {hasReplies && !isCollapsed && (
        <div className="space-y-3 relative" style={{ marginLeft: `${depth * 16}px` }}>
          {/* Vertical line connecting replies */}
          {comment.replies.length > 1 && (
            <div 
              className="absolute w-px bg-[var(--border)] opacity-50" 
              style={{ 
                left: '12px', 
                top: '0px', 
                height: '100%' 
              }} 
            />
          )}
          {comment.replies.map((reply) => (
            <ThreadedComment
              key={reply.id}
              comment={reply}
              postId={postId}
              depth={depth + 1}
              onReply={onReply}
              newReply={newReply}
              setNewReply={setNewReply}
              showReplies={showReplies}
              setShowReplies={setShowReplies}
              collapsedThreads={collapsedThreads}
              setCollapsedThreads={setCollapsedThreads}
              joined={joined}
              me={me}
            />
          ))}
        </div>
      )}
    </div>
  );
}

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
  const [newReply, setNewReply] = useState({}); // For replies to comments
  const [showReplies, setShowReplies] = useState(new Set()); // Which comments show reply form
  const [collapsedThreads, setCollapsedThreads] = useState(new Set()); // Collapsed comment threads
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
    const text = composer.trim();
    const link = postLink.trim();
    
    // Must have some content to post
    if (!text && !selectedPhotoId && !link) return;
    
    setPosting(true);
    let payload = { community_id: comm.id, user_id: me.id };
    
    // Add title if provided
    if (title) payload.title = title;
    
    // Determine post type and content
    if (selectedPhotoId) {
      payload = { ...payload, kind: 'photo', photo_id: selectedPhotoId };
      if (text) payload.body = text;
    } else if (link) {
      payload = { ...payload, kind: 'link', link_url: link };
      if (text) payload.body = text;
    } else if (text) {
      payload = { ...payload, kind: 'text', body: text };
    }
    
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
      .select('id, body, user_id, parent_id, created_at')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    
    // Organize comments into threaded structure
    const comments = data || [];
    const commentMap = {};
    const rootComments = [];
    
    // First pass: create comment objects with replies array
    comments.forEach(comment => {
      commentMap[comment.id] = { ...comment, replies: [] };
    });
    
    // Second pass: organize into tree structure
    comments.forEach(comment => {
      if (comment.parent_id && commentMap[comment.parent_id]) {
        commentMap[comment.parent_id].replies.push(commentMap[comment.id]);
      } else {
        rootComments.push(commentMap[comment.id]);
      }
    });
    
    setCommentsLoading((m) => ({ ...m, [postId]: false }));
    setCommentsByPost((map) => ({ ...map, [postId]: rootComments }));
  }

  async function addComment(postId, parentId = null) {
    const text = parentId ? (newReply[parentId] || '').trim() : (newComment[postId] || '').trim();
    if (!text || !me) return;
    
    const payload = { 
      post_id: postId, 
      user_id: me.id, 
      body: text,
      ...(parentId && { parent_id: parentId })
    };
    
    const { data, error } = await supabase
      .from('community_post_comments')
      .insert(payload)
      .select('id, body, user_id, parent_id, created_at')
      .single();
      
    if (!error && data) {
      // Clear the input
      if (parentId) {
        setNewReply((m) => ({ ...m, [parentId]: '' }));
        setShowReplies((s) => {
          const newSet = new Set(s);
          newSet.delete(parentId);
          return newSet;
        });
      } else {
        setNewComment((m) => ({ ...m, [postId]: '' }));
      }
      
      // Reload comments to get the updated threaded structure
      loadComments(postId);
      
      // Update comment count
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
      <main className="mx-auto max-w-7xl px-4 py-6 pb-16 md:pl-[260px]">
        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]"></div>
          </div>
        ) : !comm ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Community not found</h3>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>This community doesn't exist or has been removed.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Enhanced Hero Section */}
            <div className="relative">
              <div className="rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
                <div 
                  className="h-24 md:h-32" 
                  style={{ 
                    background: comm.cover_url 
                      ? `linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.1)), url(${comm.cover_url}) center/cover` 
                      : 'var(--hover)'
                  }}
                />
                <div className="p-6" style={{ background: 'var(--card-bg)' }}>
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex-1">
                      <h1 className="text-2xl font-semibold tracking-tight mb-2">{comm.name}</h1>
                      <div className="flex items-center gap-4 text-sm mb-3" style={{ color: 'var(--muted)' }}>
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {membersCount} member{membersCount !== 1 ? 's' : ''}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-4 h-4" />
                          {visiblePosts.length} post{visiblePosts.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {comm.description && (
                        <p className="text-sm leading-relaxed max-w-2xl" style={{ color: 'var(--muted)' }}>
                          {comm.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <Button 
                        variant={joined ? 'outline' : 'primary'} 
                        onClick={toggleJoin} 
                        loading={toggling}
                        className="min-w-[100px]"
                      >
                        {joined ? (
                          <>
                            <Check className="w-4 h-4 mr-2" />
                            Joined
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4 mr-2" />
                            Join
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content with Sidebar Layout */}
            <div className="grid lg:grid-cols-4 gap-6">
              {/* Main Content */}
              <div className="lg:col-span-3 space-y-6">
                {/* Navigation Tabs */}
                <div className="flex items-center gap-1 p-1 rounded-2xl" style={{ background: 'var(--hover)' }}>
                  {[
                    { key: 'posts', label: 'Posts', icon: FileText },
                    { key: 'members', label: 'Members', icon: Users }
                  ].map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      onClick={() => setTab(key)}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                        tab === key
                          ? 'bg-[var(--card-bg)] shadow-sm border border-[var(--border)]'
                          : 'hover:bg-[var(--card-bg)] hover:bg-opacity-50'
                      }`}
                      style={{ color: tab === key ? 'var(--text)' : 'var(--muted)' }}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>

                {/* Posts Tab */}
                {tab === 'posts' && (
                  <div className="space-y-6">
                    {/* Post Composer - Compact Design */}
                    {joined && (
                      <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-[var(--hover)] flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4" />
                          </div>
                          <div className="flex-1 space-y-3">
                            <textarea
                              rows={2}
                              value={composer}
                              onChange={(e) => setComposer(e.target.value)}
                              placeholder="Share something with the community..."
                              className="w-full rounded-lg bg-[var(--hover)] px-3 py-2 text-sm outline-none border border-transparent focus:border-[var(--primary)] transition-colors resize-none"
                            />
                            
                            {/* Expanded options when focused or has content */}
                            {(composer.trim() || postTitle.trim() || postLink.trim() || selectedPhotoId) && (
                              <div className="space-y-2">
                                <input 
                                  value={postTitle} 
                                  onChange={(e) => setPostTitle(e.target.value)} 
                                  placeholder="Add a title (optional)" 
                                  className="w-full rounded-lg bg-[var(--hover)] px-3 py-2 text-sm outline-none border border-transparent focus:border-[var(--primary)] transition-colors" 
                                />
                                <input 
                                  value={postLink} 
                                  onChange={(e) => setPostLink(e.target.value)} 
                                  placeholder="Add a link (optional)" 
                                  className="w-full rounded-lg bg-[var(--hover)] px-3 py-2 text-sm outline-none border border-transparent focus:border-[var(--primary)] transition-colors" 
                                />
                              </div>
                            )}

                            {selectedPhotoId && (
                              <div className="relative w-24 h-24">
                                <div className="rounded-lg overflow-hidden w-full h-full" style={{ background: 'var(--hover)' }}>
                                  {postPhotoUrls[selectedPhotoId] && (
                                    <img src={postPhotoUrls[selectedPhotoId]} alt="selected" className="w-full h-full object-cover" />
                                  )}
                                </div>
                                <button 
                                  onClick={() => setSelectedPhotoId(null)}
                                  className="absolute -top-1 -right-1 p-1 rounded-full bg-[var(--card-bg)] border border-[var(--border)] hover:bg-[var(--hover)] transition-all"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            )}

                            {pickerOpen && (
                              <div className="grid grid-cols-6 gap-2 p-2 rounded-lg bg-[var(--hover)]">
                                {(myPhotos || []).slice(0, 12).map((ph) => (
                                  <button 
                                    key={ph.id} 
                                    type="button" 
                                    className="aspect-square rounded-md overflow-hidden hover:ring-2 hover:ring-[var(--primary)] transition-all" 
                                    onClick={() => { setSelectedPhotoId(ph.id); setPickerOpen(false); }}
                                  >
                                    <img 
                                      src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/photos/${ph.storage_path}`} 
                                      alt="option" 
                                      className="w-full h-full object-cover" 
                                    />
                                  </button>
                                ))}
                              </div>
                            )}

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1">
                                <button 
                                  type="button" 
                                  onClick={() => setPickerOpen((v) => !v)}
                                  className="p-1.5 rounded-lg hover:bg-[var(--hover)] transition-colors"
                                  title="Add photo"
                                >
                                  <Image className="w-4 h-4" />
                                </button>
                                <input ref={setFileInputEl} type="file" accept="image/*" className="hidden" onChange={onUploadNewPhoto} />
                                <button
                                  type="button"
                                  onClick={() => fileInputEl && fileInputEl.click()}
                                  disabled={uploadingNew}
                                  className="p-1.5 rounded-lg hover:bg-[var(--hover)] transition-colors disabled:opacity-50"
                                  title="Upload photo"
                                >
                                  {uploadingNew ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--primary)]"></div>
                                  ) : (
                                    <Upload className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                              <Button 
                                onClick={postText} 
                                loading={posting} 
                                disabled={!composer.trim() && !selectedPhotoId && !postLink.trim()}
                                variant="secondary"
                                className="text-sm px-4 py-1.5"
                              >
                                Post
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Sort Controls */}
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold">Community Posts</h2>
                      <div className="flex items-center gap-2">
                        <span className="text-sm" style={{ color: 'var(--muted)' }}>Sort by:</span>
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value)}
                          className="rounded-lg bg-[var(--hover)] border border-[var(--border)] px-3 py-1 text-sm outline-none focus:border-[var(--primary)] transition-colors"
                        >
                          <option value="new">Latest</option>
                          <option value="top">Top Liked</option>
                        </select>
                      </div>
                    </div>

                    {/* Posts Feed */}
                    {visiblePosts.length === 0 ? (
                      <div className="text-center py-12">
                        <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-30" />
                        <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
                        <p className="text-sm" style={{ color: 'var(--muted)' }}>
                          {joined ? "Be the first to share something with the community!" : "Join the community to see and share posts."}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {visiblePosts.map((p) => (
                          <article key={p.id} className="rounded-2xl border p-6 space-y-4" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
                            {/* Post Header */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-[var(--hover)] flex items-center justify-center">
                                  <User className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className="font-medium text-sm">@{authorNames[p.user_id] || p.user_id.slice(0,8)}</p>
                                  <p className="text-xs" style={{ color: 'var(--muted)' }}>
                                    {new Date(p.created_at).toLocaleDateString()} at {new Date(p.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Post Content */}
                            <div className="space-y-3">
                              {p.title && (
                                <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>{p.title}</h3>
                              )}
                              
                              {p.kind === 'text' && p.body && (
                                <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>{p.body}</p>
                              )}
                              
                              {p.photo_id && postPhotoUrls[p.photo_id] && (
                                <div className="rounded-xl overflow-hidden max-w-md">
                                  <img src={postPhotoUrls[p.photo_id]} alt="post" className="w-full h-auto object-cover" />
                                </div>
                              )}
                              
                              {p.link_url && (
                                <a 
                                  href={p.link_url} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className="inline-flex items-center gap-2 text-sm hover:underline p-3 rounded-lg bg-[var(--hover)] transition-colors"
                                  style={{ color: 'var(--primary)' }}
                                >
                                  <ExternalLink className="w-4 h-4" />
                                  {p.link_url}
                                </a>
                              )}
                            </div>

                            {/* Post Actions */}
                            <div className="flex items-center gap-6 pt-2">
                              <button 
                                onClick={() => toggleLike(p.id)} 
                                className="flex items-center gap-2 text-sm transition-colors hover:opacity-70"
                                style={{ color: 'var(--muted)' }}
                              >
                                <Heart className={`w-4 h-4 ${likedByMe.has(p.id) ? 'fill-current' : ''}`} />
                                {likeCounts[p.id] || 0}
                              </button>
                              
                              <button 
                                onClick={() => {
                                  const open = new Set(openComments);
                                  if (open.has(p.id)) { 
                                    open.delete(p.id); 
                                    setOpenComments(open); 
                                  } else { 
                                    open.add(p.id); 
                                    setOpenComments(open); 
                                    if (!commentsByPost[p.id]) loadComments(p.id); 
                                  }
                                }}
                                className="flex items-center gap-2 text-sm transition-colors hover:text-[var(--primary)]"
                                style={{ color: 'var(--muted)' }}
                              >
                                <MessageSquare className="w-4 h-4" />
                                {commentCounts[p.id] || 0} comments
                              </button>
                            </div>

                            {/* Comments Section - Threaded */}
                            {openComments.has(p.id) && (
                              <div className="mt-4 space-y-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                                {commentsLoading[p.id] ? (
                                  <div className="flex items-center justify-center py-4">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[var(--primary)]"></div>
                                  </div>
                                ) : (
                                  <div className="space-y-4">
                                    {(commentsByPost[p.id] || []).map((c) => (
                                      <ThreadedComment
                                        key={c.id}
                                        comment={c}
                                        postId={p.id}
                                        depth={0}
                                        onReply={addComment}
                                        newReply={newReply}
                                        setNewReply={setNewReply}
                                        showReplies={showReplies}
                                        setShowReplies={setShowReplies}
                                        collapsedThreads={collapsedThreads}
                                        setCollapsedThreads={setCollapsedThreads}
                                        joined={joined}
                                        me={me}
                                      />
                                    ))}
                                  </div>
                                )}
                                
                                {/* Main comment input */}
                                {joined && (
                                  <div className="flex gap-3 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                                    <div className="w-6 h-6 rounded-full bg-[var(--hover)] flex items-center justify-center flex-shrink-0">
                                      <User className="w-3 h-3" />
                                    </div>
                                    <div className="flex-1 flex gap-2">
                                      <input 
                                        value={newComment[p.id] || ''} 
                                        onChange={(e) => setNewComment((m) => ({ ...m, [p.id]: e.target.value }))} 
                                        placeholder="Write a comment..." 
                                        className="flex-1 rounded-lg bg-[var(--hover)] px-3 py-2 text-sm outline-none border border-transparent focus:border-[var(--primary)] transition-colors"
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            addComment(p.id);
                                          }
                                        }}
                                      />
                                      <Button 
                                        size="sm" 
                                        onClick={() => addComment(p.id)} 
                                        disabled={!newComment[p.id] || !newComment[p.id].trim()}
                                      >
                                        <Send className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Members Tab */}
                {tab === 'members' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold">Community Members</h2>
                      <span className="text-sm px-3 py-1 rounded-full bg-[var(--hover)]" style={{ color: 'var(--muted)' }}>
                        {members.length} member{members.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    
                    {members.length === 0 ? (
                      <div className="text-center py-12">
                        <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
                        <h3 className="text-lg font-semibold mb-2">No members yet</h3>
                        <p className="text-sm" style={{ color: 'var(--muted)' }}>Be the first to join this community!</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {members.map((m) => (
                          <div key={m.id} className="flex items-center gap-3 p-4 rounded-xl border hover:shadow-md transition-all duration-200" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
                            <div className="w-10 h-10 rounded-full bg-[var(--hover)] flex items-center justify-center">
                              <User className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">@{m.username || m.full_name || m.id.slice(0,8)}</p>
                              <p className="text-xs" style={{ color: 'var(--muted)' }}>Member</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <aside className="lg:col-span-1 space-y-6">
                {/* About */}
                <div className="rounded-2xl border p-6" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Info className="w-5 h-5" />
                    About
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
                    {comm.description || 'No description available for this community.'}
                  </p>
                </div>

                {/* Stats */}
                <div className="rounded-2xl border p-6" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
                  <h3 className="text-lg font-semibold mb-4">Community Stats</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm flex items-center gap-2" style={{ color: 'var(--muted)' }}>
                        <Users className="w-4 h-4" />
                        Members
                      </span>
                      <span className="font-semibold">{membersCount}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm flex items-center gap-2" style={{ color: 'var(--muted)' }}>
                        <MessageSquare className="w-4 h-4" />
                        Posts
                      </span>
                      <span className="font-semibold">{visiblePosts.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm flex items-center gap-2" style={{ color: 'var(--muted)' }}>
                        <Calendar className="w-4 h-4" />
                        Created
                      </span>
                      <span className="font-semibold text-sm">
                        {new Date(comm.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Moderators */}
                <div className="rounded-2xl border p-6" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Moderators
                  </h3>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[var(--hover)] flex items-center justify-center">
                      <Crown className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">@{ownerName}</p>
                      <p className="text-xs" style={{ color: 'var(--muted)' }}>Owner</p>
                    </div>
                  </div>
                </div>

                {/* Community Rules */}
                <div className="rounded-2xl border p-6" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    Community Rules
                  </h3>
                  <div className="space-y-3">
                    {[
                      'Be respectful and kind to all members',
                      'No spam or excessive self-promotion',
                      'Keep discussions relevant to the community',
                      'Report inappropriate content to moderators'
                    ].map((rule, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--primary)] text-white text-xs flex items-center justify-center font-medium">
                          {index + 1}
                        </span>
                        <p className="text-sm" style={{ color: 'var(--muted)' }}>{rule}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
          </div>
        )}
      </main>
      <BottomNav active="communities" onNavigate={(p) => nav(p)} />
    </div>
  );
}
