import { useEffect, useRef, useState } from "react";
import Cropper from "react-easy-crop";
import { supabase } from "../lib/supabase";
import Button from "./Button";
import Label from "./Label";
import ErrorText from "./ErrorText";
import { makePhotoKey } from "../lib/storage";
import { getCroppedBlob } from "../lib/crop";

export default function UploadDialog({ open, onClose, onUploaded, embedded = false }) {
  const [file, setFile] = useState(null);
  const [fileForUpload, setFileForUpload] = useState(null);
  const [caption, setCaption] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);

  // steps: 0=select, 1=crop, 2=confirm
  const [step, setStep] = useState(0);
  const [imageUrl, setImageUrl] = useState("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedPixels, setCroppedPixels] = useState(null);

  // natural + final dimensions for storage
  const [naturalW, setNaturalW] = useState(null);
  const [naturalH, setNaturalH] = useState(null);
  const [finalDims, setFinalDims] = useState(null);

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
      setImageUrl("");
      setNaturalW(null);
      setNaturalH(null);
      setFinalDims(null);
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
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Auto-advance to Crop step as soon as a file is selected and image is ready
  useEffect(() => {
    if (!file || !imageUrl) return;
    if (step !== 0) return;
    const img = new Image();
    img.onload = () => {
      setNaturalW(img.naturalWidth);
      setNaturalH(img.naturalHeight);
      setStep(1);
    };
    img.onerror = () => setStep(1);
    img.src = imageUrl;
  }, [file, imageUrl, step]);

  // Keyboard shortcuts: Esc to close, Enter to advance/post
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === 'Escape') { onClose?.(); }
      if (e.key === 'Enter') {
        if (step === 1) applyCrop();
        else if (step === 2 && !loading) handleUpload();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, step, loading]);

  function onCropComplete(_, areaPixels) {
    setCroppedPixels(areaPixels);
  }

  async function applyCrop() {
    try {
      setErr("");
      if (!croppedPixels || !file) {
        setFileForUpload(file);
        setStep(2);
        return;
      }

      const blob = await getCroppedBlob(imageUrl, croppedPixels);
      if (!blob) throw new Error("Failed to crop image");

      const croppedFile = new File([blob], file.name, { type: file.type });
      setFileForUpload(croppedFile);
      setFinalDims({ w: Math.round(croppedPixels.width), h: Math.round(croppedPixels.height) });
      setStep(2);
    } catch (error) {
      console.error("Crop error:", error);
      setErr("Failed to crop image");
    }
  }

  function ensureExt(name, fallbackExt = "jpg") {
    return /\.[a-z0-9]+$/i.test(name) ? name : `${name}.${fallbackExt}`;
  }

  async function handleUpload() {
    setErr("");
    const f = fileForUpload || file;
    if (!f) { setErr("No file to upload."); return; }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setErr("Please sign in to upload."); return; }

    try {
      setLoading(true);
      const key = makePhotoKey(user.id, f);

      // Simple metadata
      const dims = finalDims ?? (croppedPixels
        ? { w: Math.round(croppedPixels.width), h: Math.round(croppedPixels.height) }
        : { w: naturalW ?? 0, h: naturalH ?? 0 });

      const aspectNum = dims.w && dims.h ? +(dims.w / dims.h).toFixed(6) : null;
      
      // Extract hashtags from caption
      const captionTags = Array.from((caption.match(/#([A-Za-z0-9_]+)/g) || []).map((m) => m.slice(1).toLowerCase()));

      const exif = {
        crop_preset: "Square",
        width: dims.w,
        height: dims.h,
        aspect: aspectNum,
        tags: captionTags,
      };

      // Upload file
      const up = await supabase.storage.from("photos").upload(key, f, {
        cacheControl: "3600",
        upsert: false,
      });
      if (up.error) throw up.error;

      // Insert DB row
      const ins = await supabase.from("photos").insert({
        user_id: user.id,
        storage_path: key,
        caption: caption,
        exif: exif,
      });
      if (ins.error) throw ins.error;

      onUploaded?.();
      onClose?.();
    } catch (error) {
      console.error("Upload error:", error);
      setErr(error.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  const content = (
      <div className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-lg shadow-xl overflow-hidden" style={{ background: "var(--card-bg)", border: `1px solid var(--border)` }}>
        {/* Minimal Header */}
        <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <h2 className="text-lg font-medium" style={{ color: "var(--text)" }}>Share Photo</h2>
        </div>

        {/* Simplified Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {step === 0 && (
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
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition ${dragging ? "border-[var(--ring)] bg-[var(--hover)]" : "border-[var(--border)]"}`}
            >
              <div className="text-4xl mb-2">📷</div>
              <p className="text-sm" style={{ color: "var(--text)" }}>Choose photo</p>
              <p className="text-xs text-[var(--muted)] mt-1">Drag & drop or click to select</p>
              {file && (
                <p className="mt-2 text-xs font-medium" style={{ color: "var(--text)" }}>{file.name}</p>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <div className="relative w-full h-[300px] rounded-lg overflow-hidden" style={{ background: "var(--hover)" }}>
                {imageUrl && (
                  <Cropper
                    image={imageUrl}
                    crop={crop}
                    zoom={zoom}
                    aspect={1}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onCropComplete={onCropComplete}
                    objectFit="contain"
                  />
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--muted)]">Zoom:</span>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="flex-1"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="rounded-lg overflow-hidden border" style={{ borderColor: "var(--border)" }}>
                <img
                  alt="preview"
                  className="w-full h-[200px] object-cover"
                  style={{ background: "var(--hover)" }}
                  src={fileForUpload ? URL.createObjectURL(fileForUpload) : imageUrl}
                />
              </div>
              
              <div>
                <Label htmlFor="caption">Caption</Label>
                <textarea
                  id="caption"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Write a caption..."
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-[var(--ring)] min-h-[80px] resize-none"
                />
              </div>
            </div>
          )}

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="hidden"
          />

          {err && <ErrorText>{err}</ErrorText>}
        </div>

        {/* Simple Footer */}
        <div className="px-4 py-3 border-t flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          
          <div className="flex gap-2">
            {step === 1 && (
              <Button variant="outline" onClick={() => setStep(0)}>Back</Button>
            )}
            {step === 2 && (
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
            )}
            
            {step === 1 && (
              <Button onClick={applyCrop}>Next</Button>
            )}
            {step === 2 && (
              <Button onClick={handleUpload} disabled={loading}>
                {loading ? "Posting..." : "Post"}
              </Button>
            )}
          </div>
        </div>
      </div>
  );

  if (embedded) {
    return (
      <div className="min-h-screen bg-[var(--app-bg)] flex items-center justify-center p-4">
        {content}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      {content}
    </div>
  );
}
