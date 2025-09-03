import { useEffect, useMemo, useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import Button from "./Button";
import Input from "./Input";
import Label from "./Label";
import ErrorText from "./ErrorText";

export default function EditPostDialog({ open, photoId, onClose, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [caption, setCaption] = useState("");
  const [exif, setExif] = useState({});
  const [tagsText, setTagsText] = useState("");
  const [locationText, setLocationText] = useState("");
  const [geo, setGeo] = useState({ lat: null, lng: null });
  const [peopleQuery, setPeopleQuery] = useState("");
  const [peopleResults, setPeopleResults] = useState([]);
  const [tagged, setTagged] = useState([]); // [{ id, username, full_name }]

  // Prefill on open
  useEffect(() => {
    if (!open || !photoId) return;
    setErr(""); setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from("photos")
        .select("id, caption, exif")
        .eq("id", photoId)
        .single();
      setLoading(false);
      if (error) { setErr(error.message); return; }
      setCaption(data.caption || "");
      const e = data.exif || {};
      setExif(e);
      setLocationText(e.location_text || "");
      setGeo({ lat: e.latitude ?? null, lng: e.longitude ?? null });
      const tags = Array.isArray(e.tags) ? e.tags : [];
      setTagsText(tags.join(", "));
      const ids = Array.isArray(e.tagged_user_ids) ? e.tagged_user_ids : [];
      const handles = Array.isArray(e.tagged_user_handles) ? e.tagged_user_handles : [];
      setTagged(ids.map((id, i) => ({ id, username: handles[i] || undefined })));
    })();
  }, [open, photoId]);

  // People search (debounced)
  useEffect(() => {
    if (!open) return;
    const q = peopleQuery.trim();
    const t = setTimeout(async () => {
      if (q.length < 2) { setPeopleResults([]); return; }
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name')
        .or(`username.ilike.%${q}%,full_name.ilike.%${q}%`)
        .limit(5);
      if (error) { setPeopleResults([]); return; }
      setPeopleResults((data || []).filter((u) => !tagged.some((t) => t.id === u.id)));
    }, 250);
    return () => clearTimeout(t);
  }, [peopleQuery, open, tagged]);

  const canSave = useMemo(() => !loading && photoId, [loading, photoId]);

  async function save() {
    if (!photoId) return;
    setErr(""); setLoading(true);
    try {
      // Build updated exif: keep immutable fields (width/height/aspect/crop_preset) intact
      const nextExif = { ...exif };
      // Update soft metadata
      nextExif.location_text = locationText || null;
      nextExif.latitude = geo.lat ?? null;
      nextExif.longitude = geo.lng ?? null;
      nextExif.tags = tagsText.split(',').map(t => t.trim()).filter(Boolean);
      nextExif.tagged_user_ids = tagged.map(t => t.id);
      nextExif.tagged_user_handles = tagged.map(t => t.username || t.full_name || "");

      // Persist
      const { error } = await supabase
        .from('photos')
        .update({ caption: caption || null, exif: nextExif })
        .eq('id', photoId);
      if (error) throw error;
      setLoading(false);
      onSaved?.({ id: photoId, caption: caption || "", exif: nextExif });
      onClose?.();
    } catch (e) {
      setLoading(false);
      setErr(e?.message || 'Failed to save');
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-3xl rounded-2xl shadow-xl overflow-hidden" style={{ background: "var(--card-bg)", border: `1px solid var(--border)` }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <h3 className="text-lg font-semibold">Edit Post</h3>
          <p className="text-xs muted mt-0.5">Update caption, tags, people, and details.</p>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_300px] gap-5">
          {/* Left: main fields */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="ep_caption">Caption</Label>
              <textarea
                id="ep_caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Say something about this photo (use #tags, e.g. #street)"
                className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2 text-sm shadow-sm outline-none transition focus:ring-2 focus:ring-[var(--ring)] min-h-[96px]"
              />
            </div>

            <div>
              <Label htmlFor="ep_tags">Tags</Label>
              <Input id="ep_tags" value={tagsText} onChange={setTagsText} placeholder="street,portraits,travel" />
            </div>

            <div>
              <Label htmlFor="ep_location">Location</Label>
              <Input id="ep_location" value={locationText} onChange={setLocationText} placeholder="City, Place, or Landmark" />
            </div>

            <div>
              <Label>EXIF</Label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Input id="ep_make" value={exif.camera_make || ""} onChange={(v) => setExif((e) => ({ ...e, camera_make: v }))} placeholder="Camera make" />
                <Input id="ep_model" value={exif.camera_model || ""} onChange={(v) => setExif((e) => ({ ...e, camera_model: v }))} placeholder="Camera model" />
                <Input id="ep_lens" value={exif.lens_model || ""} onChange={(v) => setExif((e) => ({ ...e, lens_model: v }))} placeholder="Lens model" />
                <Input id="ep_aperture" value={(exif.f_number ?? "").toString()} onChange={(v) => setExif((e) => ({ ...e, f_number: v ? parseFloat(v) : null }))} placeholder="Aperture (e.g., 1.8)" />
                <Input id="ep_shutter" value={exif.exposure_time_str || ""} onChange={(v) => setExif((e) => ({ ...e, exposure_time_str: v }))} placeholder="Shutter (e.g., 1/250 or 0.5s)" />
                <Input id="ep_iso" value={(exif.iso ?? "").toString()} onChange={(v) => setExif((e) => ({ ...e, iso: v ? parseInt(v) : null }))} placeholder="ISO (e.g., 400)" />
                <Input id="ep_focal" value={(exif.focal_length ?? "").toString()} onChange={(v) => setExif((e) => ({ ...e, focal_length: v ? parseFloat(v) : null }))} placeholder="Focal length (mm)" />
              </div>
            </div>
          </div>

          {/* Right: people tagging */}
          <div className="space-y-3">
            <div>
              <Label htmlFor="ep_people">Tag people</Label>
              <Input id="ep_people" value={peopleQuery} onChange={setPeopleQuery} placeholder="Search users by name or @username" />
              {peopleResults.length > 0 && (
                <div className="mt-1 text-sm rounded-xl border" style={{ borderColor: "var(--border)" }}>
                  {peopleResults.map((u) => (
                    <button key={u.id} type="button" className="w-full text-left px-3 py-2 hover-surface btn-focus" onClick={() => { setTagged((arr) => [...arr, u]); setPeopleQuery(""); setPeopleResults([]); }}>
                      @{u.username || (u.full_name || 'user')}
                    </button>
                  ))}
                </div>
              )}
              {tagged.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {tagged.map((u) => (
                    <span key={u.id} className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs" style={{ background: "var(--hover)" }}>
                      @{u.username || (u.full_name || 'user')}
                      <button className="ml-1 text-xs muted" onClick={() => setTagged((arr) => arr.filter((x) => x.id !== u.id))}>×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {err && <ErrorText>{err}</ErrorText>}
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
              <Button onClick={save} loading={loading} disabled={!canSave}>Save changes</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

