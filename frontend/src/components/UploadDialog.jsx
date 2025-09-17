import { useEffect, useRef, useState } from "react";
import Cropper from "react-easy-crop";
import { supabase } from "../lib/supabase";
import Button from "./Button";
import Label from "./Label";
import ErrorText from "./ErrorText";
import { makePhotoKey } from "../lib/storage";
import { getCroppedBlob } from "../lib/crop";
import { extractPhotoExif } from "../lib/exif";

export default function UploadDialog({ open, onClose, onUploaded, embedded = false }) {
  const [file, setFile] = useState(null);
  const [fileForUpload, setFileForUpload] = useState(null);
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [collabTags, setCollabTags] = useState("");
  const [extractedExif, setExtractedExif] = useState(null);
  const [editableExif, setEditableExif] = useState({
    camera_make: "",
    camera_model: "",
    lens_model: "",
    f_number: "",
    exposure_time_str: "",
    iso: "",
    focal_length: "",
    focal_length_35mm: ""
  });
  const [showExifEditor, setShowExifEditor] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);

  // steps: 0=select, 1=crop, 2=confirm
  const [step, setStep] = useState(0);
  const [imageUrl, setImageUrl] = useState("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedPixels, setCroppedPixels] = useState(null);
  
  // Aspect ratio selection
  const [selectedAspect, setSelectedAspect] = useState("1:1");
  const [useOriginalSize, setUseOriginalSize] = useState(false);

  // natural + final dimensions for storage
  const [naturalW, setNaturalW] = useState(null);
  const [naturalH, setNaturalH] = useState(null);
  const [finalDims, setFinalDims] = useState(null);

  const inputRef = useRef(null);
  const dropRef = useRef(null);

  // Aspect ratio options
  const aspectRatios = {
    "1:1": { value: 1, label: "Square (1:1)" },
    "4:3": { value: 4/3, label: "Classic (4:3)" },
    "3:4": { value: 3/4, label: "Portrait (3:4)" },
    "16:9": { value: 16/9, label: "Wide (16:9)" },
    "9:16": { value: 9/16, label: "Story (9:16)" },
    "original": { value: null, label: "Original" }
  };

  useEffect(() => {
    if (open) {
      setFile(null);
      setFileForUpload(null);
      setCaption("");
      setLocation("");
      setCollabTags("");
      setExtractedExif(null);
      setEditableExif({
        camera_make: "",
        camera_model: "",
        lens_model: "",
        f_number: "",
        exposure_time_str: "",
        iso: "",
        focal_length: "",
        focal_length_35mm: ""
      });
      setShowExifEditor(false);
      setErr("");
      setLoading(false);
      setStep(0);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setImageUrl("");
      setNaturalW(null);
      setNaturalH(null);
      setFinalDims(null);
      setSelectedAspect("1:1");
      setUseOriginalSize(false);
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
    img.onload = async () => {
      setNaturalW(img.naturalWidth);
      setNaturalH(img.naturalHeight);
      
      // Extract EXIF data
      try {
        const exifData = await extractPhotoExif(file);
        setExtractedExif(exifData);
        
        // Populate editable EXIF with extracted data
        setEditableExif({
          camera_make: exifData.camera_make || "",
          camera_model: exifData.camera_model || "",
          lens_model: exifData.lens_model || "",
          f_number: exifData.f_number ? String(exifData.f_number) : "",
          exposure_time_str: exifData.exposure_time_str || "",
          iso: exifData.iso ? String(exifData.iso) : "",
          focal_length: exifData.focal_length ? String(exifData.focal_length) : "",
          focal_length_35mm: exifData.focal_length_35mm ? String(exifData.focal_length_35mm) : ""
        });
      } catch (error) {
        console.warn("EXIF extraction failed:", error);
        setExtractedExif({});
      }
      
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
      
      // If using original size, skip cropping
      if (useOriginalSize || selectedAspect === "original") {
        setFileForUpload(file);
        setFinalDims({ w: naturalW, h: naturalH });
        setStep(2);
        return;
      }

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
      
      // Extract hashtags from caption and collab tags
      const captionTags = Array.from((caption.match(/#([A-Za-z0-9_]+)/g) || []).map((m) => m.slice(1).toLowerCase()));
      const collaborators = collabTags.split(',').map(tag => tag.trim().replace(/^@/, '')).filter(Boolean);
      
      const exif = {
        crop_preset: useOriginalSize || selectedAspect === "original" ? "Original" : selectedAspect,
        width: dims.w,
        height: dims.h,
        aspect: aspectNum,
        tags: captionTags,
        collaborators: collaborators,
        location: location.trim() || null,
        // Use editable EXIF data (which may include user modifications)
        camera_make: editableExif.camera_make || null,
        camera_model: editableExif.camera_model || null,
        lens_model: editableExif.lens_model || null,
        f_number: editableExif.f_number ? parseFloat(editableExif.f_number) : null,
        exposure_time_str: editableExif.exposure_time_str || null,
        iso: editableExif.iso ? parseInt(editableExif.iso) : null,
        focal_length: editableExif.focal_length ? parseFloat(editableExif.focal_length) : null,
        focal_length_35mm: editableExif.focal_length_35mm ? parseFloat(editableExif.focal_length_35mm) : null,
        captured_at: extractedExif?.captured_at || null,
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
        context: 'post' // Regular post upload, will appear in main feed
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
            <div className="space-y-4">
              {/* Aspect Ratio Selection */}
              <div>
                <Label>Aspect Ratio</Label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {Object.entries(aspectRatios).map(([key, ratio]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setSelectedAspect(key);
                        setUseOriginalSize(key === "original");
                        if (key === "original") {
                          setCrop({ x: 0, y: 0 });
                          setZoom(1);
                        }
                      }}
                      className={`px-3 py-2 text-sm rounded-lg border transition ${
                        selectedAspect === key
                          ? "border-[var(--ring)] bg-[var(--ring)]/10 text-[var(--text)]"
                          : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--ring)]/50"
                      }`}
                    >
                      {ratio.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cropper or Original Preview */}
              {!useOriginalSize && selectedAspect !== "original" ? (
                <div className="space-y-3">
                  <div className="relative w-full h-[300px] rounded-lg overflow-hidden" style={{ background: "var(--hover)" }}>
                    {imageUrl && (
                      <Cropper
                        image={imageUrl}
                        crop={crop}
                        zoom={zoom}
                        aspect={aspectRatios[selectedAspect].value}
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
              ) : (
                <div className="space-y-3">
                  <div className="w-full h-80 flex items-center justify-center rounded-lg overflow-hidden border bg-[var(--hover)]" style={{ borderColor: "var(--border)" }}>
                    {imageUrl && (
                      <img
                        src={imageUrl}
                        alt="Original"
                        className="max-w-full max-h-full object-contain"
                      />
                    )}
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-[var(--muted)]">
                      Using original size: {naturalW} × {naturalH}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              {/* Enhanced Preview */}
              <div className="rounded-lg overflow-hidden border bg-[var(--card-bg)]" style={{ borderColor: "var(--border)" }}>
                <div className="w-full h-80 flex items-center justify-center bg-[var(--hover)]">
                  <img
                    alt="preview"
                    className="max-w-full max-h-full object-contain rounded"
                    src={fileForUpload ? URL.createObjectURL(fileForUpload) : imageUrl}
                  />
                </div>
                
                {/* EXIF Data Display */}
                <div className="p-3 border-t bg-[var(--hover)]" style={{ borderColor: "var(--border)" }}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-medium text-[var(--text)]">Camera Info</h4>
                    <button
                      onClick={() => setShowExifEditor(!showExifEditor)}
                      className="text-xs text-[var(--ring)] hover:text-[var(--ring)]/80 transition"
                    >
                      {showExifEditor ? "Hide Editor" : "Edit"}
                    </button>
                  </div>
                  
                  {!showExifEditor ? (
                    // Display mode
                    <div className="grid grid-cols-2 gap-2 text-xs text-[var(--muted)]">
                      {editableExif.camera_make && editableExif.camera_model && (
                        <div>
                          <span className="font-medium">Camera:</span> {editableExif.camera_make} {editableExif.camera_model}
                        </div>
                      )}
                      {editableExif.lens_model && (
                        <div>
                          <span className="font-medium">Lens:</span> {editableExif.lens_model}
                        </div>
                      )}
                      {editableExif.f_number && (
                        <div>
                          <span className="font-medium">Aperture:</span> f/{editableExif.f_number}
                        </div>
                      )}
                      {editableExif.exposure_time_str && (
                        <div>
                          <span className="font-medium">Shutter:</span> {editableExif.exposure_time_str}
                        </div>
                      )}
                      {editableExif.iso && (
                        <div>
                          <span className="font-medium">ISO:</span> {editableExif.iso}
                        </div>
                      )}
                      {editableExif.focal_length && (
                        <div>
                          <span className="font-medium">Focal Length:</span> {editableExif.focal_length}mm
                          {editableExif.focal_length_35mm && editableExif.focal_length_35mm !== editableExif.focal_length && 
                            ` (${editableExif.focal_length_35mm}mm equiv.)`
                          }
                        </div>
                      )}
                    </div>
                  ) : (
                    // Edit mode
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-[var(--muted)] block mb-1">Camera Make</label>
                          <input
                            type="text"
                            value={editableExif.camera_make}
                            onChange={(e) => setEditableExif(prev => ({ ...prev, camera_make: e.target.value }))}
                            placeholder="Canon, Nikon, Sony..."
                            className="w-full text-xs px-2 py-1 rounded border border-[var(--border)] bg-[var(--card-bg)] text-[var(--text)] outline-none focus:ring-1 focus:ring-[var(--ring)]"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-[var(--muted)] block mb-1">Camera Model</label>
                          <input
                            type="text"
                            value={editableExif.camera_model}
                            onChange={(e) => setEditableExif(prev => ({ ...prev, camera_model: e.target.value }))}
                            placeholder="EOS R5, D850, A7R IV..."
                            className="w-full text-xs px-2 py-1 rounded border border-[var(--border)] bg-[var(--card-bg)] text-[var(--text)] outline-none focus:ring-1 focus:ring-[var(--ring)]"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-xs text-[var(--muted)] block mb-1">Lens</label>
                        <input
                          type="text"
                          value={editableExif.lens_model}
                          onChange={(e) => setEditableExif(prev => ({ ...prev, lens_model: e.target.value }))}
                          placeholder="24-70mm f/2.8, 50mm f/1.4..."
                          className="w-full text-xs px-2 py-1 rounded border border-[var(--border)] bg-[var(--card-bg)] text-[var(--text)] outline-none focus:ring-1 focus:ring-[var(--ring)]"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-[var(--muted)] block mb-1">Aperture (f/)</label>
                          <input
                            type="text"
                            value={editableExif.f_number}
                            onChange={(e) => setEditableExif(prev => ({ ...prev, f_number: e.target.value }))}
                            placeholder="1.4, 2.8, 5.6..."
                            className="w-full text-xs px-2 py-1 rounded border border-[var(--border)] bg-[var(--card-bg)] text-[var(--text)] outline-none focus:ring-1 focus:ring-[var(--ring)]"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-[var(--muted)] block mb-1">Shutter Speed</label>
                          <input
                            type="text"
                            value={editableExif.exposure_time_str}
                            onChange={(e) => setEditableExif(prev => ({ ...prev, exposure_time_str: e.target.value }))}
                            placeholder="1/125s, 2s..."
                            className="w-full text-xs px-2 py-1 rounded border border-[var(--border)] bg-[var(--card-bg)] text-[var(--text)] outline-none focus:ring-1 focus:ring-[var(--ring)]"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-[var(--muted)] block mb-1">ISO</label>
                          <input
                            type="text"
                            value={editableExif.iso}
                            onChange={(e) => setEditableExif(prev => ({ ...prev, iso: e.target.value }))}
                            placeholder="100, 400, 1600..."
                            className="w-full text-xs px-2 py-1 rounded border border-[var(--border)] bg-[var(--card-bg)] text-[var(--text)] outline-none focus:ring-1 focus:ring-[var(--ring)]"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-[var(--muted)] block mb-1">Focal Length (mm)</label>
                          <input
                            type="text"
                            value={editableExif.focal_length}
                            onChange={(e) => setEditableExif(prev => ({ ...prev, focal_length: e.target.value }))}
                            placeholder="24, 50, 85..."
                            className="w-full text-xs px-2 py-1 rounded border border-[var(--border)] bg-[var(--card-bg)] text-[var(--text)] outline-none focus:ring-1 focus:ring-[var(--ring)]"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-xs text-[var(--muted)] block mb-1">35mm Equivalent (mm)</label>
                        <input
                          type="text"
                          value={editableExif.focal_length_35mm}
                          onChange={(e) => setEditableExif(prev => ({ ...prev, focal_length_35mm: e.target.value }))}
                          placeholder="75, 135... (for crop sensors)"
                          className="w-full text-xs px-2 py-1 rounded border border-[var(--border)] bg-[var(--card-bg)] text-[var(--text)] outline-none focus:ring-1 focus:ring-[var(--ring)]"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Caption */}
              <div>
                <Label htmlFor="caption">Caption</Label>
                <textarea
                  id="caption"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Write a caption... Use #hashtags to categorize your photo"
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-[var(--ring)] min-h-[80px] resize-none"
                />
              </div>

              {/* Location */}
              <div>
                <Label htmlFor="location">Location</Label>
                <input
                  id="location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Where was this taken?"
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-[var(--ring)]"
                />
              </div>

              {/* Collaboration Tags */}
              <div>
                <Label htmlFor="collabTags">Collaborators</Label>
                <input
                  id="collabTags"
                  type="text"
                  value={collabTags}
                  onChange={(e) => setCollabTags(e.target.value)}
                  placeholder="Tag collaborators: @username1, @username2"
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-[var(--ring)]"
                />
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Separate multiple collaborators with commas
                </p>
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
