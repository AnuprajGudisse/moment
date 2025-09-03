// Lightweight EXIF extraction wrapper. Attempts to parse common photo fields.
// Uses dynamic import so the app still builds if the dep isn't installed yet.

function fracToString(x) {
  if (!x || typeof x !== 'number' || !isFinite(x)) return null;
  if (x === 0) return '0s';
  if (x >= 1) return `${x.toFixed(1)}s`;
  const denom = Math.round(1 / x);
  return `1/${denom}s`;
}

export async function extractPhotoExif(file) {
  try {
    // Use CDN ESM to avoid bundler pre-bundling failures when exifr isn't installed locally
    const exifr = await import(/* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/exifr@7.1.3/dist/full.esm.js');
    const data = await exifr.parse(file, { tiff: true, ifd0: true, exif: true });
    if (!data) return {};
    const make = data.Make?.toString().trim() || null;
    const model = data.Model?.toString().trim() || null;
    const lens = (data.LensModel || data.LensMake)?.toString().trim() || null;
    const exposureTime = typeof data.ExposureTime === 'number' ? data.ExposureTime : null;
    const fNumber = typeof data.FNumber === 'number' ? data.FNumber : null;
    const iso = typeof data.ISO === 'number' ? data.ISO : null;
    const focalLength = typeof data.FocalLength === 'number' ? data.FocalLength : null;
    const focalLength35 = typeof data.FocalLengthIn35mmFormat === 'number' ? data.FocalLengthIn35mmFormat : null;
    const takenAt = data.DateTimeOriginal || data.CreateDate || null;

    return {
      camera_make: make,
      camera_model: model,
      lens_model: lens,
      exposure_time: exposureTime,           // seconds (number)
      exposure_time_str: fracToString(exposureTime),
      f_number: fNumber,                    // aperture
      iso,
      focal_length: focalLength,
      focal_length_35mm: focalLength35,
      captured_at: takenAt ? new Date(takenAt).toISOString() : null,
    };
  } catch (e) {
    // Swallow errors; return empty object so upload continues
    return {};
  }
}
