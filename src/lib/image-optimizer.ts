// High-quality client-side image optimizer for marketplace listings.
//
// Pipeline:
//  1. Decode with createImageBitmap (respects EXIF orientation).
//  2. Render onto a square white canvas with padding, aspect preserved.
//  3. Downscale with pica (Lanczos3 + unsharp mask) — dramatically sharper
//     than the browser's default bilinear canvas scaling.
//  4. Encode JPEG with a binary-searched quality to hit the target KB.
//  5. If even min-quality at min-size still exceeds target, return the
//     smallest achievable variant rather than a corrupted output.

import Pica from "pica";

const pica = Pica({ features: ["js", "wasm"] });

export type OptimizedResult = {
  targetKB: number;
  blob: Blob;
  url: string;
  width: number;
  height: number;
  sizeKB: number;
  format: "image/jpeg";
  quality: number;
  compressionPct: number; // vs original bytes
};

export const TARGET_SIZES = [5, 10, 15, 20, 25, 30, 40, 50];

export function validateImageFile(
  file: File,
): { ok: true } | { ok: false; error: string } {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) {
    return { ok: false, error: "Only JPG, PNG, or WEBP files are supported." };
  }
  if (file.size > 20 * 1024 * 1024) {
    return { ok: false, error: "File is over 20 MB." };
  }
  return { ok: true };
}

async function decode(file: File | Blob): Promise<ImageBitmap> {
  // imageOrientation "from-image" honors EXIF so portrait phone photos are upright.
  return createImageBitmap(file, { imageOrientation: "from-image" });
}

function makeCanvas(size: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  return c;
}

function drawSquarePadded(bmp: ImageBitmap, size: number): HTMLCanvasElement {
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);

  const pad = size * 0.04;
  const inner = size - pad * 2;
  const ratio = Math.min(inner / bmp.width, inner / bmp.height);
  const w = Math.round(bmp.width * ratio);
  const h = Math.round(bmp.height * ratio);
  const x = Math.round((size - w) / 2);
  const y = Math.round((size - h) / 2);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bmp, x, y, w, h);
  return canvas;
}

async function resampleWithPica(
  source: HTMLCanvasElement,
  targetSize: number,
): Promise<HTMLCanvasElement> {
  if (source.width === targetSize && source.height === targetSize) return source;
  const dest = makeCanvas(targetSize);
  // Fill background white first so any semi-transparent pixels compose correctly.
  const dctx = dest.getContext("2d")!;
  dctx.fillStyle = "#ffffff";
  dctx.fillRect(0, 0, targetSize, targetSize);
  await pica.resize(source, dest, {
    filter: "lanczos3",
    unsharpAmount: 80,
    unsharpRadius: 0.6,
    unsharpThreshold: 2,
  });
  return dest;
}

async function encodeJpeg(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob> {
  const blob = await pica.toBlob(canvas, "image/jpeg", quality);
  return blob;
}

/**
 * Binary-search JPEG quality at a given dimension for the target size.
 * Returns the largest blob that still fits under targetBytes, or null.
 */
async function bestQualityUnder(
  canvas: HTMLCanvasElement,
  targetBytes: number,
): Promise<{ blob: Blob; quality: number } | null> {
  let lo = 0.35;
  let hi = 0.95;
  let best: { blob: Blob; quality: number } | null = null;
  for (let i = 0; i < 8; i++) {
    const q = (lo + hi) / 2;
    const blob = await encodeJpeg(canvas, q);
    if (blob.size <= targetBytes) {
      best = { blob, quality: q };
      lo = q;
    } else {
      hi = q;
    }
  }
  return best;
}

export async function optimizeToTarget(
  file: File,
  targetKB: number,
): Promise<OptimizedResult> {
  const targetBytes = targetKB * 1024;
  const bmp = await decode(file);

  // Render a large square master (2x max target dim) so pica downscales
  // for maximum sharpness rather than upscaling.
  const masterSize = 1600;
  const master = drawSquarePadded(bmp, masterSize);
  bmp.close?.();

  // Candidate dimensions — smaller targets need smaller pixels to hit KB
  // without crushing quality. We try a few and pick the best.
  const dims =
    targetKB <= 8
      ? [400, 340, 280, 240, 200]
      : targetKB <= 15
        ? [600, 520, 460, 400, 340]
        : targetKB <= 25
          ? [800, 700, 620, 540, 460]
          : targetKB <= 40
            ? [1000, 900, 800, 700]
            : [1200, 1080, 960, 840];

  let best: {
    blob: Blob;
    quality: number;
    dim: number;
  } | null = null;

  for (const dim of dims) {
    const scaled = await resampleWithPica(master, dim);
    const attempt = await bestQualityUnder(scaled, targetBytes);
    if (attempt) {
      // Prefer the biggest dimension whose quality is still >= 0.55; that
      // reads sharpest. Otherwise fall back to the largest byte fit.
      if (!best || attempt.quality >= 0.6) {
        best = { ...attempt, dim };
      } else if (attempt.blob.size > best.blob.size) {
        best = { ...attempt, dim };
      }
      if (attempt.quality >= 0.7) break; // good enough, stop trying smaller dims
    }
  }

  if (!best) {
    // Even 200px @ q=0.35 wouldn't fit — return that as the closest possible.
    const tiny = await resampleWithPica(master, 200);
    const blob = await encodeJpeg(tiny, 0.35);
    best = { blob, quality: 0.35, dim: 200 };
  }

  return {
    targetKB,
    blob: best.blob,
    url: URL.createObjectURL(best.blob),
    width: best.dim,
    height: best.dim,
    sizeKB: Math.round((best.blob.size / 1024) * 10) / 10,
    format: "image/jpeg",
    quality: Math.round(best.quality * 100) / 100,
    compressionPct: Math.max(
      0,
      Math.round((1 - best.blob.size / file.size) * 1000) / 10,
    ),
  };
}
