import { useEffect, useMemo, useRef, useState } from "react";
import Cropper from "react-easy-crop";
import { supabase } from "../lib/supabase";
import Button from "./Button";
import Input from "./Input";
import Label from "./Label";
import ErrorText from "./ErrorText";
import { makePhotoKey } from "../lib/storage";
import { extractPhotoExif } from "../lib/exif";
import { getCroppedBlob } from "../lib/crop";

const PRESETS = [
  { label: "Square", value: 1 / 1 },
  { label: "Portrait 4:5", value: 4 / 5 },
  { label: "Landscape 16:9", value: 16 / 9 },
  { label: "Original", value: "original" },
];

export default function UploadDialog({ open, onClose, onUploaded, embedded = false }) {
  const [file, setFile] = useState(null);                 // original file
  const [fileForUpload, setFileForUpload] = useState(null); // cropped or original
  const [caption, setCaption] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [tagsText, setTagsText] = useState("");
  const [exifMeta, setExifMeta] = useState(null);
  // Editable EXIF form fields
  const [exifForm, setExifForm] = useState({
    camera_make: "",
    camera_model: "",
    lens_model: "",
    f_number: "",
    shutter_text: "", // e.g. 1/250 or 0.5s
    iso: "",
    focal_length: "",
  });
  // Location
  const [locationText, setLocationText] = useState("");
  const [geo, setGeo] = useState({ lat: null, lng: null });
  // Tag people
  const [peopleQuery, setPeopleQuery] = useState("");
  const [peopleResults, setPeopleResults] = useState([]);
  const [tagged, setTagged] = useState([]); // [{ id, username, full_name }]

  // steps: 0=select, 1=crop, 2=confirm
  const [step, setStep] = useState(0);
  const [imageUrl, setImageUrl] = useState("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspectPreset, setAspectPreset] = useState(PRESETS[0].value);
  const [originalAspect, setOriginalAspect] = useState(1);
  const [croppedPixels, setCroppedPixels] = useState(null);

  // natural + final dimensions for exif/aspect storage
  const [naturalW, setNaturalW] = useState(null);
  const [naturalH, setNaturalH] = useState(null);
  const [finalDims, setFinalDims] = useState(null); // { w, h }

  const inputRef = useRef(null);
  const dropRef = useRef(null);

  useEffect(() => {
    if (open) {
      setFile(null);
      setFileForUpload(null);
      setCaption("");
      setErr("");
      setLoading(false);
      setStep(0);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setAspectPreset(PRESETS[0].value);
      setImageUrl("");
      setNaturalW(null);
      setNaturalH(null);
      setFinalDims(null);
      setTagsText("");
      setExifForm({ camera_make: "", camera_model: "", lens_model: "", f_number: "", shutter_text: "", iso: "", focal_length: "" });
      setLocationText("");
      setGeo({ lat: null, lng: null });
      setPeopleQuery("");
      setPeopleResults([]);
      setTagged([]);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  // Paste-to-upload when dialog is open
  useEffect(() => {
    if (!open) return;
    function onPaste(e) {
      const items = e.clipboardData?.items || [];
      for (const it of items) {
        if (it.type?.startsWith("image/")) {
          const f = it.getAsFile();
          if (f) {
            setFile(f);
            setErr("");
            setStep(0);
            break;
          }
        }
      }
    }
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [open]);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    // Try to extract EXIF from the original file in background
    extractPhotoExif(file).then((m) => setExifMeta(m)).catch(() => setExifMeta(null));
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Auto-advance to Crop step as soon as a file is selected and image is ready
  useEffect(() => {
    if (!file || !imageUrl) return;
    if (step !== 0) return;
    const img = new Image();
    img.onload = () => {
      setOriginalAspect(img.naturalWidth / img.naturalHeight || 1);
      setNaturalW(img.naturalWidth);
      setNaturalH(img.naturalHeight);
      setStep(1);
    };
    img.onerror = () => setStep(1);
    img.src = imageUrl;
  }, [file, imageUrl, step]);

  // Prefill form from detected EXIF when available
  useEffect(() => {
    if (!exifMeta) return;
    setExifForm((prev) => ({
      camera_make: prev.camera_make || exifMeta.camera_make || "",
      camera_model: prev.camera_model || exifMeta.camera_model || "",
      lens_model: prev.lens_model || exifMeta.lens_model || "",
      f_number: prev.f_number || (exifMeta.f_number ? String(exifMeta.f_number) : ""),
      shutter_text: prev.shutter_text || exifMeta.exposure_time_str || (typeof exifMeta.exposure_time === 'number' ? (exifMeta.exposure_time >= 1 ? `${exifMeta.exposure_time.toFixed(1)}s` : `1/${Math.round(1/exifMeta.exposure_time)}s`) : ""),
      iso: prev.iso || (exifMeta.iso ? String(exifMeta.iso) : ""),
      focal_length: prev.focal_length || (exifMeta.focal_length ? String(exifMeta.focal_length) : ""),
    }));
  }, [exifMeta]);

  // People search (simple debounce)
  useEffect(() => {
    const q = peopleQuery.trim();
    if (!open) return;
    const t = setTimeout(async () => {
      if (q.length < 2) { setPeopleResults([]); return; }
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, full_name')
          .or(`username.ilike.%${q}%,full_name.ilike.%${q}%`)
          .limit(5);
        if (error) { setPeopleResults([]); return; }
        setPeopleResults((data || []).filter((u) => !tagged.some((t) => t.id === u.id)));
      } catch {
        setPeopleResults([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [peopleQuery, open, tagged]);

  // Keyboard shortcuts: Esc to close, Enter to advance/post
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === 'Escape') { onClose?.(); }
      if (e.key === 'Enter') {
        if (step === 0) goToCrop();
        else if (step === 1) applyCrop();
        else if (step === 2 && !loading) handleUpload();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, step, loading]);

  const aspect = useMemo(() => {
    if (aspectPreset === "original") return originalAspect || 1;
    return aspectPreset;
  }, [aspectPreset, originalAspect]);

  function onCropComplete(_, areaPixels) {
    setCroppedPixels(areaPixels);
  }

  async function goToCrop() {
    if (!file) { setErr("Choose an image to upload."); return; }
    const img = new Image();
    img.onload = () => {
      setOriginalAspect(img.naturalWidth / img.naturalHeight || 1);
      setNaturalW(img.naturalWidth);
      setNaturalH(img.naturalHeight);
      setStep(1);
    };
    img.onerror = () => setStep(1);
    img.src = imageUrl;
  }

  async function applyCrop() {
    try {
      setErr("");
      // If no crop box (or user chose Original but moved nothing), just use original file
      if (!imageUrl || !croppedPixels) {
        setFileForUpload(file);
        setFinalDims({ w: naturalW ?? 0, h: naturalH ?? 0 });
        setStep(2);
        return;
      }

      const ext = (file?.name || "").split(".").pop()?.toLowerCase() || "jpg";
      const mime = file?.type || (ext === "png" ? "image/png" : "image/jpeg");

      const blob = await getCroppedBlob(imageUrl, croppedPixels, mime);
      const croppedFile = new File([blob], ensureExt(file?.name, ext), { type: mime });
      setFileForUpload(croppedFile);
      setFinalDims({
        w: Math.round(croppedPixels.width),
        h: Math.round(croppedPixels.height),
      });
      setStep(2);
    } catch (e) {
      setErr(e?.message || "Cropping failed.");
    }
  }

  function ensureExt(name, fallbackExt = "jpg") {
    if (!name) return `upload.${fallbackExt}`;
    return /\.[a-z0-9]+$/i.test(name) ? name : `${name}.${fallbackExt}`;
  }

  function parseShutterText(s) {
    if (!s) return { exposure_time: null, exposure_time_str: null };
    const txt = String(s).trim().toLowerCase();
    let val = null;
    if (/^\d+\s*\/\s*\d+$/.test(txt)) {
      const [a, b] = txt.split('/').map((x) => parseFloat(x));
      if (a && b) val = a / b;
    } else if (/^\d*\.?\d+\s*s?$/.test(txt)) {
      const num = parseFloat(txt.replace('s',''));
      if (!isNaN(num)) val = num;
    }
    if (val == null || !isFinite(val) || val < 0) return { exposure_time: null, exposure_time_str: null };
    let str = null;
    if (val >= 1) str = `${val.toFixed(1)}s`;
    else str = `1/${Math.round(1/val)}s`;
    return { exposure_time: val, exposure_time_str: str };
  }

  async function handleUpload() {
    setErr("");
    const f = fileForUpload || file;
    if (!f) { setErr("Choose an image to upload."); return; }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setErr("Not authenticated."); return; }

    try {
      setLoading(true);
      const key = makePhotoKey(user.id, f);

      // compute exif/crop metadata to store
      const dims = finalDims ?? (croppedPixels
        ? { w: Math.round(croppedPixels.width), h: Math.round(croppedPixels.height) }
        : { w: naturalW ?? 0, h: naturalH ?? 0 });

      const aspectNum = dims.w && dims.h ? +(dims.w / dims.h).toFixed(6) : null;
      // Merge caption hashtags with manual tags
      const captionTags = Array.from((caption.match(/#([A-Za-z0-9_]+)/g) || []).map((m) => m.slice(1).toLowerCase()));
      const tagsSet = new Set([...captionTags]);

      // Build edited EXIF from form overrides
      const edited = { ...(exifMeta || {}) };
      if (exifForm.camera_make) edited.camera_make = exifForm.camera_make;
      if (exifForm.camera_model) edited.camera_model = exifForm.camera_model;
      if (exifForm.lens_model) edited.lens_model = exifForm.lens_model;
      if (exifForm.f_number) {
        const n = parseFloat(exifForm.f_number);
        if (!isNaN(n)) edited.f_number = n;
      }
      if (exifForm.iso) {
        const n = parseInt(exifForm.iso);
        if (!isNaN(n)) edited.iso = n;
      }
      if (exifForm.focal_length) {
        const n = parseFloat(exifForm.focal_length);
        if (!isNaN(n)) edited.focal_length = n;
      }
      if (exifForm.shutter_text) {
        const { exposure_time, exposure_time_str } = parseShutterText(exifForm.shutter_text);
        if (exposure_time) {
          edited.exposure_time = exposure_time;
          edited.exposure_time_str = exposure_time_str;
        }
      }

      const exif = {
        crop_preset: PRESETS.find(p => p.value === aspectPreset)?.label || "Original",
        width: dims.w,
        height: dims.h,
        aspect: aspectNum,
        tags: Array.from(tagsSet),
        location_text: locationText || null,
        latitude: geo.lat,
        longitude: geo.lng,
        tagged_user_ids: tagged.map((t) => t.id),
        tagged_user_handles: tagged.map((t) => t.username || t.full_name),
        ...edited,
      };

      // 1) upload
      const up = await supabase.storage.from("photos").upload(key, f, {
        cacheControl: "3600",
        upsert: false,
        contentType: f.type || "image/jpeg",
      });
      if (up.error) throw up.error;

      // 2) insert DB row
      const ins = await supabase.from("photos").insert({
        user_id: user.id,
        storage_path: key,
        caption: caption || null,
        exif,
      });
      if (ins.error) throw ins.error;

      setLoading(false);
      onUploaded?.();
      onClose?.();
    } catch (e) {
      setLoading(false);
      setErr(e?.message || "Upload failed.");
    }
  }

  if (!open) return null;

  const content = (
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl shadow-xl overflow-hidden" style={{ background: "var(--card-bg)", border: `1px solid var(--border)` }}>
        {/* Header */}
        <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>New Post</h2>
          <p className="text-xs muted mt-0.5">Choose an image, crop it, then add details.</p>
          <div className="mt-3 h-1.5 w-full rounded-full" style={{ background: "var(--hover)" }}>
            <div className="h-full rounded-full bg-[var(--brand)]" style={{ width: `${Math.round(((step + 1) / 3) * 100)}%` }} />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_340px] gap-6">
          {/* Main pane */}
          <div>
            {step === 0 && (
              <div className="space-y-4">
                <div
                  ref={dropRef}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    const f = e.dataTransfer?.files?.[0];
                    if (f) { setFile(f); setErr(""); }
                  }}
                  onClick={() => inputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition ${dragging ? "border-[var(--ring)] bg-[var(--hover)]" : "border-[var(--border)]"}`}
                >
                  <p className="text-sm" style={{ color: "var(--text)" }}>Drag & drop an image here</p>
                  <p className="text-xs muted mt-1">or click to choose a file · paste with ⌘V/Ctrl+V</p>
                  {file && (
                    <p className="mt-2 text-xs" style={{ color: "var(--text)" }}>Selected: {file.name}</p>
                  )}
                </div>
                <input
                  id="file"
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </div>
            )}

            {step === 1 && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      className={`rounded-full border px-3 py-1 text-xs ${aspectPreset === p.value ? "border-[var(--ring)] bg-[var(--hover)]" : "border-[var(--border)] hover-surface"}`}
                      onClick={() => setAspectPreset(p.value)}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="relative w-full h-[46vh] rounded-xl overflow-hidden" style={{ background: "var(--hover)" }}>
                  {imageUrl && (
                    <Cropper
                      image={imageUrl}
                      crop={crop}
                      zoom={zoom}
                      aspect={aspect}
                      onCropChange={setCrop}
                      onZoomChange={setZoom}
                      onCropComplete={onCropComplete}
                      objectFit="contain"
                    />
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Label htmlFor="zoom">Zoom</Label>
                  <input
                    id="zoom"
                    type="range"
                    min={1}
                    max={3}
                    step={0.01}
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <p className="text-sm" style={{ color: "var(--text)" }}>Preview</p>
                <div className="rounded-xl overflow-hidden border" style={{ borderColor: "var(--border)" }}>
                  <img
                    alt="preview"
                    className="w-full max-h-[50vh] object-contain"
                    style={{ background: "var(--hover)" }}
                    src={fileForUpload ? URL.createObjectURL(fileForUpload) : imageUrl}
                  />
                </div>
                
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="caption">Caption</Label>
              <textarea
                id="caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Say something about this photo (use #tags, e.g. #street)"
                className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2 text-sm shadow-sm outline-none transition focus:ring-2 focus:ring-[var(--ring)] min-h-[96px]"
              />
            </div>

            <div>
              <Label htmlFor="people">Tag people</Label>
              <Input id="people" value={peopleQuery} onChange={setPeopleQuery} placeholder="Search users by name or @username" />
              {peopleResults.length > 0 && (
                <div className="mt-1 text-sm">
                  {peopleResults.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      className="w-full text-left px-3 py-2 hover-surface btn-focus rounded-xl"
                      onClick={() => { setTagged((arr) => [...arr, u]); setPeopleQuery(""); setPeopleResults([]); }}
                    >
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

            <div>
              <Label htmlFor="location">Location</Label>
              <Input id="location" value={locationText} onChange={setLocationText} placeholder="City, Place, or Landmark" />
            </div>

            <div>
              <Label>EXIF</Label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Input id="cameraMake" value={exifForm.camera_make} onChange={(v) => setExifForm((f) => ({ ...f, camera_make: v }))} placeholder="Camera make (e.g., Fujifilm)" />
                <Input id="cameraModel" value={exifForm.camera_model} onChange={(v) => setExifForm((f) => ({ ...f, camera_model: v }))} placeholder="Camera model (e.g., X-T4)" />
                <Input id="lensModel" value={exifForm.lens_model} onChange={(v) => setExifForm((f) => ({ ...f, lens_model: v }))} placeholder="Lens (e.g., XF 23mm f/1.4)" />
                <Input id="aperture" value={exifForm.f_number} onChange={(v) => setExifForm((f) => ({ ...f, f_number: v }))} placeholder="Aperture (e.g., 1.8)" />
                <Input id="shutter" value={exifForm.shutter_text} onChange={(v) => setExifForm((f) => ({ ...f, shutter_text: v }))} placeholder="Shutter (e.g., 1/250 or 0.5s)" />
                <Input id="iso" value={exifForm.iso} onChange={(v) => setExifForm((f) => ({ ...f, iso: v }))} placeholder="ISO (e.g., 400)" />
                <Input id="focal" value={exifForm.focal_length} onChange={(v) => setExifForm((f) => ({ ...f, focal_length: v }))} placeholder="Focal length (e.g., 35)" />
              </div>
            </div>

            {err && <ErrorText>{err}</ErrorText>}
          </div>
        </div>
        {/* Footer actions */}
        <div className="px-4 py-3 border-t flex items-center justify-end gap-2" style={{ borderColor: "var(--border)" }}>
          {step === 0 && (
            <>
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              <Button onClick={goToCrop} disabled={!file}>Next</Button>
            </>
          )}
          {step === 1 && (
            <>
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              <Button variant="outline" onClick={() => setStep(0)}>Back</Button>
              <Button onClick={applyCrop}>Next</Button>
            </>
          )}
          {step === 2 && (
            <>
              <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
              <Button variant="outline" onClick={() => setStep(1)} disabled={loading}>Back</Button>
              <Button onClick={handleUpload} disabled={loading}>{loading ? "Uploading…" : "Post"}</Button>
            </>
          )}
        </div>
      </div>
  );

  if (embedded) {
    return (
      <div className="mx-auto max-w-4xl w-full px-4 py-6">{content}</div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4 py-10">{content}</div>
  );
}
