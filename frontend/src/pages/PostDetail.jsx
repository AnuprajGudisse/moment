import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import SideNav from "../components/SideNav";
import BottomNav from "../components/BottomNav";
import Button from "../components/Button";
import { supabase } from "../lib/supabase";
import { 
  UsersIcon as Users, 
  CommentIcon as MessageSquare, 
  UserIcon as User, 
  LikeIcon as Heart, 
  Send, 
  ExternalLink,
  ChevronLeftIcon as ArrowLeft 
} from "../components/icons";

// Reuse the ThreadedComment component from CommunityDetail
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

export default function PostDetail() {
  const nav = useNavigate();
  const { id: postId } = useParams();
  const [post, setPost] = useState(null);
  const [community, setCommunity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState(null);
  const [joined, setJoined] = useState(false);
  
  // Comments state
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [newReply, setNewReply] = useState({});
  const [showReplies, setShowReplies] = useState(new Set());
  const [collapsedThreads, setCollapsedThreads] = useState(new Set());
  
  // Post interaction state
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [photoUrl, setPhotoUrl] = useState('');
  const [authorName, setAuthorName] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      if (!postId) return;
      
      setLoading(true);
      
      // Get current user
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (active) setMe(user);
      
      // Load post
      const { data: postData } = await supabase
        .from('community_posts')
        .select('*')
        .eq('id', postId)
        .single();
      
      if (!active || !postData) return;
      setPost(postData);
      
      // Load community
      const { data: communityData } = await supabase
        .from('communities')
        .select('*')
        .eq('id', postData.community_id)
        .single();
      
      if (active) setCommunity(communityData);
      
      // Check if user is a member
      if (user && communityData) {
        const { data: memberData } = await supabase
          .from('community_members')
          .select('user_id')
          .eq('community_id', communityData.id)
          .eq('user_id', user.id)
          .single();
        
        if (active) setJoined(!!memberData);
      }
      
      // Load author name
      const { data: authorData } = await supabase
        .from('profiles')
        .select('username, full_name')
        .eq('id', postData.user_id)
        .single();
      
      if (active) {
        setAuthorName(authorData?.username || authorData?.full_name || 'Anonymous');
      }
      
      // Load photo if exists
      if (postData.photo_id) {
        const { data: photoData } = await supabase
          .from('photos')
          .select('storage_path')
          .eq('id', postData.photo_id)
          .single();
        
        if (active && photoData) {
          setPhotoUrl(`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/photos/${photoData.storage_path}`);
        }
      }
      
      // Load likes and comments count
      const [{ data: likes }, { data: userLike }, { count: commentsCount }] = await Promise.all([
        supabase.from('community_post_likes').select('user_id').eq('post_id', postId),
        user ? supabase.from('community_post_likes').select('user_id').eq('post_id', postId).eq('user_id', user.id) : Promise.resolve({ data: [] }),
        supabase.from('community_post_comments').select('id', { count: 'exact', head: true }).eq('post_id', postId)
      ]);
      
      if (active) {
        setLikeCount(likes?.length || 0);
        setLiked(userLike && userLike.length > 0);
        setCommentCount(commentsCount || 0);
      }
      
      setLoading(false);
      
      // Load comments
      loadComments();
    }
    
    load();
    return () => { active = false; };
  }, [postId]);

  async function loadComments() {
    if (!postId) return;
    
    setCommentsLoading(true);
    const { data } = await supabase
      .from('community_post_comments')
      .select('id, body, user_id, parent_id, created_at')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    
    // Organize comments into threaded structure
    const commentsData = data || [];
    const commentMap = {};
    const rootComments = [];
    
    // First pass: create comment objects with replies array
    commentsData.forEach(comment => {
      commentMap[comment.id] = { ...comment, replies: [] };
    });
    
    // Second pass: organize into tree structure
    commentsData.forEach(comment => {
      if (comment.parent_id && commentMap[comment.parent_id]) {
        commentMap[comment.parent_id].replies.push(commentMap[comment.id]);
      } else {
        rootComments.push(commentMap[comment.id]);
      }
    });
    
    setComments(rootComments);
    setCommentsLoading(false);
  }

  async function addComment(postId, parentId = null) {
    const text = parentId ? (newReply[parentId] || '').trim() : newComment.trim();
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
        setNewComment('');
      }
      
      // Reload comments to get the updated threaded structure
      loadComments();
      
      // Update comment count
      setCommentCount((prev) => prev + 1);
    }
  }

  async function toggleLike() {
    if (!me || !post) return;
    
    if (liked) {
      await supabase
        .from('community_post_likes')
        .delete()
        .eq('post_id', post.id)
        .eq('user_id', me.id);
      setLiked(false);
      setLikeCount(prev => prev - 1);
    } else {
      await supabase
        .from('community_post_likes')
        .insert({ post_id: post.id, user_id: me.id });
      setLiked(true);
      setLikeCount(prev => prev + 1);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--app-bg)]">
        <SideNav active="communities" onNavigate={(p) => nav(p)} onLogout={() => {}} />
        <main className="mx-auto max-w-4xl px-4 py-6 pb-16 md:pl-[280px]">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]"></div>
          </div>
        </main>
        <BottomNav active="communities" onNavigate={(p) => nav(p)} />
      </div>
    );
  }

  if (!post || !community) {
    return (
      <div className="min-h-screen bg-[var(--app-bg)]">
        <SideNav active="communities" onNavigate={(p) => nav(p)} onLogout={() => {}} />
        <main className="mx-auto max-w-4xl px-4 py-6 pb-16 md:pl-[280px]">
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold mb-2">Post not found</h2>
            <p className="text-[var(--muted)] mb-4">This post may have been deleted or doesn't exist.</p>
            <Button onClick={() => nav('/communities')}>Back to Communities</Button>
          </div>
        </main>
        <BottomNav active="communities" onNavigate={(p) => nav(p)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--app-bg)]">
      <SideNav active="communities" onNavigate={(p) => nav(p)} onLogout={() => {}} />
      
      <main className="mx-auto max-w-4xl px-4 py-6 pb-16 md:pl-[280px]">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => nav(-1)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text)]">Post Discussion</h1>
            <Link 
              to={`/communities/${community.slug || community.id}`}
              className="text-sm text-[var(--primary)] hover:underline"
            >
              {community.name}
            </Link>
          </div>
        </div>

        {/* Post Content */}
        <article className="rounded-2xl border p-6 mb-6" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
          {/* Post Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-[var(--hover)] flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium text-sm">@{authorName}</p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                {new Date(post.created_at).toLocaleDateString()} at {new Date(post.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </p>
            </div>
          </div>

          {/* Post Content */}
          <div className="space-y-4">
            {post.title && (
              <h2 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>{post.title}</h2>
            )}
            
            {post.kind === 'text' && post.body && (
              <p className="text-base leading-relaxed" style={{ color: 'var(--text)' }}>{post.body}</p>
            )}
            
            {post.photo_id && photoUrl && (
              <div className="rounded-xl overflow-hidden">
                <img src={photoUrl} alt="post" className="w-full h-auto object-cover" />
              </div>
            )}
            
            {post.body && post.kind === 'photo' && (
              <p className="text-base leading-relaxed" style={{ color: 'var(--text)' }}>{post.body}</p>
            )}
            
            {post.link_url && (
              <a 
                href={post.link_url} 
                target="_blank" 
                rel="noreferrer" 
                className="inline-flex items-center gap-2 text-sm hover:underline p-3 rounded-lg bg-[var(--hover)] transition-colors"
                style={{ color: 'var(--primary)' }}
              >
                <ExternalLink className="w-4 h-4" />
                {post.link_url}
              </a>
            )}
          </div>

          {/* Post Actions */}
          <div className="flex items-center gap-6 pt-4 mt-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <button 
              onClick={toggleLike} 
              className="flex items-center gap-2 text-sm transition-colors hover:opacity-70"
              style={{ color: 'var(--muted)' }}
            >
              <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
              {likeCount}
            </button>
            
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--muted)' }}>
              <MessageSquare className="w-4 h-4" />
              {commentCount} comments
            </div>
          </div>
        </article>

        {/* Comments Section */}
        <div className="rounded-2xl border p-6" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
          <h3 className="text-lg font-semibold mb-4">Comments</h3>
          
          {/* Add new comment */}
          {joined && (
            <div className="flex gap-3 mb-6 pb-6 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="w-8 h-8 rounded-full bg-[var(--hover)] flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="flex-1 flex gap-2">
                <input 
                  value={newComment} 
                  onChange={(e) => setNewComment(e.target.value)} 
                  placeholder="Write a comment..." 
                  className="flex-1 rounded-lg bg-[var(--hover)] px-3 py-2 text-sm outline-none border border-transparent focus:border-[var(--primary)] transition-colors"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      addComment(post.id);
                    }
                  }}
                />
                <Button 
                  size="sm" 
                  onClick={() => addComment(post.id)} 
                  disabled={!newComment.trim()}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Comments list */}
          {commentsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--primary)]"></div>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-[var(--muted)]">No comments yet. Be the first to start the conversation!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <ThreadedComment
                  key={comment.id}
                  comment={comment}
                  postId={post.id}
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
        </div>
      </main>
      
      <BottomNav active="communities" onNavigate={(p) => nav(p)} />
    </div>
  );
}
