type CanvasToBlobType = "image/webp" | "image/jpeg";

function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: CanvasToBlobType,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error("Failed to encode image"));
        resolve(blob);
      },
      type,
      quality,
    );
  });
}

async function toSupportedOutputType(prefer: CanvasToBlobType): Promise<CanvasToBlobType> {
  // Safari can sometimes return null for unsupported types.
  const test = document.createElement("canvas");
  try {
    await canvasToBlob(test, prefer, 0.8);
    return prefer;
  } catch {
    return "image/jpeg";
  }
}

/**
 * Resize an image Blob to a max width, preserving aspect ratio.
 * Returns the original blob if no resize is needed.
 */
export async function resizeImage(
  blob: Blob,
  maxWidth: number,
): Promise<{ blob: Blob; didResize: boolean }> {
  const img = await loadImageFromBlob(blob);

  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;

  if (!width || !height || width <= maxWidth) {
    return { blob, didResize: false };
  }

  const scale = maxWidth / width;
  const targetWidth = Math.round(width * scale);
  const targetHeight = Math.round(height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get canvas context");

  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  const type = await toSupportedOutputType("image/webp");
  const outBlob = await canvasToBlob(canvas, type, 0.9);

  return { blob: outBlob, didResize: true };
}

/**
 * Compress an image blob to be under maxBytes. Uses WebP when possible, falls back to JPEG.
 * Throws if it cannot get under the limit within reasonable bounds.
 */
export async function compressImage(
  blob: Blob,
  maxBytes: number,
): Promise<{ blob: Blob; type: CanvasToBlobType; quality: number }> {
  // Non-static formats (like GIF) shouldn't be re-encoded here.
  if (blob.type === "image/gif") {
    if (blob.size <= maxBytes) {
      return { blob, type: "image/jpeg", quality: 1 };
    }
    throw new Error("Animated GIFs must be under the size limit");
  }

  const img = await loadImageFromBlob(blob);
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  if (!width || !height) throw new Error("Invalid image");

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get canvas context");
  ctx.drawImage(img, 0, 0, width, height);

  const type = await toSupportedOutputType("image/webp");

  // Start high quality, then step down until it fits.
  let quality = 0.9;
  let out = await canvasToBlob(canvas, type, quality);
  while (out.size > maxBytes && quality > 0.5) {
    quality = Math.round((quality - 0.1) * 10) / 10;
    out = await canvasToBlob(canvas, type, quality);
  }

  if (out.size > maxBytes) {
    throw new Error("Image is too large after compression");
  }

  return { blob: out, type, quality };
}

