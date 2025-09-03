import { supabase } from "./supabase";

/** Build a public URL from a storage path (bucket: 'photos') */
export function publicPhotoUrl(path) {
  const { data, error } = supabase.storage.from("photos").getPublicUrl(path);
  if (error) {
    console.warn("getPublicUrl error:", error, "for path:", path);
    return null;
  }
  return data?.publicUrl || null;
}

/** Generate a per-user object key like: <uid>/<uuid>-filename.ext */
export function makePhotoKey(userId, file) {
  const safeName = file.name?.replace(/\s+/g, "_") || "upload.jpg";
  const id = crypto.randomUUID();
  return `${userId}/${id}-${safeName}`;
}
