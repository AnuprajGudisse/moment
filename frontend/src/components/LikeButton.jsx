import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { LikeIcon } from "./icons";

/**
 * Props:
 * - photoId (uuid)
 * - initialCount (number)
 * - initiallyLiked (boolean)
 */
export default function LikeButton({ photoId, initialCount = 0, initiallyLiked = false }) {
  const [count, setCount] = useState(initialCount);
  const [liked, setLiked] = useState(initiallyLiked);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setCount(initialCount); }, [initialCount]);
  useEffect(() => { setLiked(initiallyLiked); }, [initiallyLiked]);

  async function toggle() {
    if (busy) return;
    setBusy(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setBusy(false); return; }

    try {
      if (!liked) {
        // optimistic
        setLiked(true); setCount((c) => c + 1);
        const { error } = await supabase.from("likes").insert({
          user_id: user.id,
          photo_id: photoId,
        });
        if (error) throw error;
      } else {
        setLiked(false); setCount((c) => Math.max(0, c - 1));
        const { error } = await supabase.from("likes")
          .delete()
          .eq("user_id", user.id)
          .eq("photo_id", photoId);
        if (error) throw error;
      }
    } catch (e) {
      // revert on failure
      setLiked((v) => !v);
      setCount((c) => (liked ? c + 1 : Math.max(0, c - 1)));
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      className={`inline-flex items-center gap-1 hover-surface rounded-lg px-2 py-1 ${liked ? "text-rose-600" : ""} btn-focus`}
      onClick={toggle}
      disabled={busy}
      title={liked ? "Unlike" : "Like"}
      aria-pressed={liked}
      aria-label={liked ? "Unlike" : "Like"}
    >
      <LikeIcon filled={liked} size={18} className={`transition-transform ${liked ? "scale-110" : ""}`} />
      <span>{count}</span>
    </button>
  );
}
