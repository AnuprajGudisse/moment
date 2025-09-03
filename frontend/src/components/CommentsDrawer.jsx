import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import Button from "./Button";
import Input from "./Input";
import Label from "./Label";
import ErrorText from "./ErrorText";

export default function CommentsDrawer({ open, onClose, photoId }) {
  const [items, setItems] = useState([]);
  const [body, setBody] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setErr(""); setBody("");
    setTimeout(() => inputRef.current?.focus(), 0);
    load();
    // optional realtime later
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, photoId]);

  async function load() {
    if (!photoId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("comments")
      .select(`
        id,
        body,
        created_at,
        user_id,
        author:profiles!comments_user_id_fkey (username, full_name)
      `)
      .eq("photo_id", photoId)
      .order("created_at", { ascending: true });
    setLoading(false);
    if (error) { console.error(error); setItems([]); return; }
    setItems(data || []);
  }

  async function post() {
    setErr("");
    const text = body.trim();
    if (!text) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setErr("You must be logged in."); return; }

    // optimistic
    const tempId = `temp-${crypto.randomUUID()}`;
    const optimistic = {
      id: tempId,
      body: text,
      created_at: new Date().toISOString(),
      user_id: user.id,
      author: { username: user.user_metadata?.username, full_name: user.user_metadata?.full_name },
    };
    setItems((arr) => [...arr, optimistic]);
    setBody("");

    const { data, error } = await supabase.from("comments").insert({
      photo_id: photoId,
      user_id: user.id,
      body: text,
    }).select(`
      id, body, created_at, user_id,
      author:profiles!comments_user_id_fkey (username, full_name)
    `).single();

    if (error) {
      setErr(error.message);
      // revert
      setItems((arr) => arr.filter((c) => c.id !== tempId));
      return;
    }

    // replace temp with real
    setItems((arr) => arr.map((c) => (c.id === tempId ? data : c)));
  }

  return !open ? null : (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-md h-full shadow-xl p-4 overflow-y-auto" style={{ background: "var(--card-bg)" }}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Comments</h3>
          <button className="text-sm muted" onClick={onClose}>Close</button>
        </div>

        <div className="mt-4 space-y-3">
          {loading && (
            <>
              {[...Array(4)].map((_, i) => (
                <div key={i} className="rounded-lg border p-3" style={{ borderColor: "var(--border)" }}>
                  <div className="h-3 w-32 rounded skeleton mb-2" />
                  <div className="h-4 w-3/4 rounded skeleton" />
                </div>
              ))}
            </>
          )}
          {!loading && items.length === 0 && (
            <p className="text-sm muted">Be the first to comment.</p>
          )}
          {items.map((c) => (
            <div key={c.id} className="rounded-lg border p-3" style={{ borderColor: "var(--border)" }}>
              <p className="text-xs muted mb-1">
                <span className="font-medium">
                  @{c.author?.username || c.author?.full_name || "user"}
                </span>{" "}
                <span>• {new Date(c.created_at).toLocaleString()}</span>
              </p>
              <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--text)" }}>{c.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 border-t pt-4">
          <Label htmlFor="comment">Add a comment</Label>
          <Input
            id="comment"
            value={body}
            onChange={setBody}
            placeholder="Write something…"
            className="mt-1"
            ref={inputRef}
          />
          <div className="mt-2 flex items-center gap-2">
            <Button onClick={post} disabled={!body.trim()}>Post</Button>
            {err && <ErrorText>{err}</ErrorText>}
          </div>
        </div>
      </div>
    </div>
  );
}
