// Production-grade client-side image optimizer for Meesho marketplace listings.
//
// Pipeline:
//  1. Single decode via createImageBitmap (EXIF orientation "from-image").
//  2. Flatten PNG/WebP transparency onto white at native resolution.
//  3. Build one high-res square master (1200–2048 px) via Pica Lanczos3 only.
//  4. Adaptive padding by aspect ratio; adaptive unsharp mask by scale factor.
//  5. Multi-resolution cache shared across all targets in optimizeAllSizes().
//  6. Binary-search JPEG quality (16 iterations) per target KB.
//  7. Progressive dimension fallback before crushing quality.

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
  compressionPct: number;
};

export const TARGET_SIZES = [5, 10, 15, 20, 25, 30, 40, 50];

const MIN_QUALITY = 0.5;
const MAX_QUALITY = 0.98;
const BINARY_SEARCH_ITERATIONS = 16;

type MasterContext = {
  masterCanvas: HTMLCanvasElement;
  masterSize: number;
  fileSize: number;
  resizeCache: Map<number, HTMLCanvasElement>;
};

type EncodeAttempt = {
  blob: Blob;
  quality: number;
  dim: number;
};

type UnsharpSettings = {
  unsharpAmount: number;
  unsharpRadius: number;
  unsharpThreshold: number;
};

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export function validateImageFile(file: File): { ok: true } | { ok: false; error: string } {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) {
    return { ok: false, error: "Only JPG, PNG, or WEBP files are supported." };
  }
  if (file.size > 20 * 1024 * 1024) {
    return { ok: false, error: "File is over 20 MB." };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Canvas / decode helpers
// ---------------------------------------------------------------------------

async function decode(file: File | Blob): Promise<ImageBitmap> {
  return createImageBitmap(file, { imageOrientation: "from-image" });
}

function makeCanvas(width: number, height: number = width): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function flattenOnWhite(bmp: ImageBitmap): HTMLCanvasElement {
  const canvas = makeCanvas(bmp.width, bmp.height);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, bmp.width, bmp.height);
  ctx.drawImage(bmp, 0, 0);
  return canvas;
}

// ---------------------------------------------------------------------------
// Adaptive heuristics
// ---------------------------------------------------------------------------

/** Master canvas edge length derived from source resolution (1200–2048 px). */
function computeMasterSize(srcW: number, srcH: number): number {
  const maxDim = Math.max(srcW, srcH);
  if (maxDim <= 1200) return 1200;
  if (maxDim <= 1600) return 1600;
  return 2048;
}

/** Tighter padding for square products; slightly more for tall/wide items. */
function computeAdaptivePadding(aspect: number): number {
  if (aspect >= 0.9 && aspect <= 1.1) return 0.015;
  if (aspect < 0.55 || aspect > 1.8) return 0.025;
  return 0.02;
}

/**
 * Reduce unsharp strength on aggressive downscales to prevent halos
 * and ringing around product edges.
 */
function computeUnsharp(scaleFactor: number): UnsharpSettings {
  if (scaleFactor >= 0.65) {
    return { unsharpAmount: 130, unsharpRadius: 0.85, unsharpThreshold: 2 };
  }
  if (scaleFactor >= 0.4) {
    return { unsharpAmount: 90, unsharpRadius: 0.65, unsharpThreshold: 3 };
  }
  if (scaleFactor >= 0.2) {
    return { unsharpAmount: 55, unsharpRadius: 0.55, unsharpThreshold: 4 };
  }
  return { unsharpAmount: 25, unsharpRadius: 0.5, unsharpThreshold: 6 };
}

/** Candidate output dimensions per target KB, largest first for quality preference. */
function getCandidateDimensions(targetKB: number, masterSize: number): number[] {
  let base: number[];
  if (targetKB <= 5) {
    base = [420, 380, 340, 300, 260];
  } else if (targetKB <= 10) {
    base = [580, 540, 500, 460, 420];
  } else if (targetKB <= 15) {
    base = [820, 780, 740, 700, 660];
  } else if (targetKB <= 20) {
    base = [980, 940, 900, 860, 820];
  } else if (targetKB <= 25) {
    base = [1120, 1080, 1040, 1000, 960];
  } else if (targetKB <= 30) {
    base = [1240, 1200, 1160, 1120, 1080];
  } else if (targetKB <= 40) {
    base = [1420, 1380, 1340, 1300, 1260];
  } else {
    base = [1620, 1580, 1540, 1500, 1460];
  }
  return base.map((d) => Math.min(d, masterSize));
}

// ---------------------------------------------------------------------------
// Pica resize (Lanczos3 only — never browser bilinear scaling)
// ---------------------------------------------------------------------------

async function picaResize(
  source: HTMLCanvasElement,
  destW: number,
  destH: number,
  sourceMaxDim: number,
): Promise<HTMLCanvasElement> {
  if (source.width === destW && source.height === destH) return source;

  const dest = makeCanvas(destW, destH);
  const dctx = dest.getContext("2d")!;
  dctx.fillStyle = "#ffffff";
  dctx.fillRect(0, 0, destW, destH);

  const scaleFactor = Math.min(destW / source.width, destH / source.height);
  const unsharp = computeUnsharp(scaleFactor * (destW / sourceMaxDim));

  await pica.resize(source, dest, {
    filter: "lanczos3",
    ...unsharp,
  });
  return dest;
}

async function picaResizeSquare(
  source: HTMLCanvasElement,
  targetSize: number,
  masterSize: number,
): Promise<HTMLCanvasElement> {
  return picaResize(source, targetSize, targetSize, masterSize);
}

async function getCachedSquare(
  ctx: MasterContext,
  targetDim: number,
): Promise<HTMLCanvasElement> {
  const cached = ctx.resizeCache.get(targetDim);
  if (cached) return cached;

  const scaled = await picaResizeSquare(ctx.masterCanvas, targetDim, ctx.masterSize);
  ctx.resizeCache.set(targetDim, scaled);
  return scaled;
}

// ---------------------------------------------------------------------------
// Master preparation (once per file)
// ---------------------------------------------------------------------------

async function prepareMaster(file: File): Promise<MasterContext> {
  const bmp = await decode(file);
  const srcW = bmp.width;
  const srcH = bmp.height;

  const native = flattenOnWhite(bmp);
  bmp.close?.();

  const masterSize = computeMasterSize(srcW, srcH);
  const aspect = srcW / srcH;
  const pad = Math.round(masterSize * computeAdaptivePadding(aspect));
  const inner = masterSize - pad * 2;

  const fitRatio = Math.min(inner / srcW, inner / srcH, 1);
  const fitW = Math.max(1, Math.round(srcW * fitRatio));
  const fitH = Math.max(1, Math.round(srcH * fitRatio));

  let productCanvas: HTMLCanvasElement;
  if (fitRatio < 1) {
    productCanvas = await picaResize(native, fitW, fitH, Math.max(srcW, srcH));
  } else {
    productCanvas = native;
  }

  const master = makeCanvas(masterSize, masterSize);
  const mctx = master.getContext("2d")!;
  mctx.fillStyle = "#ffffff";
  mctx.fillRect(0, 0, masterSize, masterSize);
  mctx.drawImage(
    productCanvas,
    Math.round((masterSize - productCanvas.width) / 2),
    Math.round((masterSize - productCanvas.height) / 2),
  );

  return {
    masterCanvas: master,
    masterSize,
    fileSize: file.size,
    resizeCache: new Map(),
  };
}

// ---------------------------------------------------------------------------
// JPEG encoding & quality search
// ---------------------------------------------------------------------------

async function encodeJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return pica.toBlob(canvas, "image/jpeg", quality);
}

/**
 * Binary-search the highest JPEG quality that still fits under targetBytes.
 * Runs exactly 16 iterations for predictable latency.
 */
async function bestQualityUnder(
  canvas: HTMLCanvasElement,
  targetBytes: number,
): Promise<{ blob: Blob; quality: number } | null> {
  let lo = MIN_QUALITY;
  let hi = MAX_QUALITY;
  let best: { blob: Blob; quality: number } | null = null;

  for (let i = 0; i < BINARY_SEARCH_ITERATIONS; i++) {
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

function toOptimizedResult(
  targetKB: number,
  attempt: EncodeAttempt,
  originalBytes: number,
): OptimizedResult {
  return {
    targetKB,
    blob: attempt.blob,
    url: URL.createObjectURL(attempt.blob),
    width: attempt.dim,
    height: attempt.dim,
    sizeKB: Math.round((attempt.blob.size / 1024) * 10) / 10,
    format: "image/jpeg",
    quality: Math.round(attempt.quality * 100) / 100,
    compressionPct: Math.max(0, Math.round((1 - attempt.blob.size / originalBytes) * 1000) / 10),
  };
}

// ---------------------------------------------------------------------------
// Per-target encoding
// ---------------------------------------------------------------------------

async function encodeTarget(
  ctx: MasterContext,
  targetKB: number,
): Promise<OptimizedResult> {
  const targetBytes = targetKB * 1024;
  const dims = getCandidateDimensions(targetKB, ctx.masterSize);

  let best: EncodeAttempt | null = null;

  for (const dim of dims) {
    const scaled = await getCachedSquare(ctx, dim);
    const attempt = await bestQualityUnder(scaled, targetBytes);
    if (!attempt) continue;

    const candidate: EncodeAttempt = { ...attempt, dim };

    if (
      !best ||
      candidate.quality > best.quality ||
      (candidate.quality === best.quality && candidate.dim > best.dim)
    ) {
      best = candidate;
    }

    if (attempt.quality >= 0.9) break;
  }

  if (!best) {
    const emergencyDims = [240, 200, 160];
    for (const dim of emergencyDims) {
      const scaled = await getCachedSquare(ctx, dim);
      const attempt = await bestQualityUnder(scaled, targetBytes);
      if (attempt) {
        best = { ...attempt, dim };
        break;
      }
    }
  }

  if (!best) {
    const dim = 160;
    const scaled = await getCachedSquare(ctx, dim);
    const quality = MIN_QUALITY;
    const blob = await encodeJpeg(scaled, quality);
    best = { blob, quality, dim };
  }

  return toOptimizedResult(targetKB, best, ctx.fileSize);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Optimize a single image into all standard marketplace target sizes.
 * Decodes once, builds one master canvas, and reuses the resize cache.
 */
export async function optimizeAllSizes(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<OptimizedResult[]> {
  const ctx = await prepareMaster(file);
  const results: OptimizedResult[] = [];

  for (let i = 0; i < TARGET_SIZES.length; i++) {
    const targetKB = TARGET_SIZES[i];
    results.push(await encodeTarget(ctx, targetKB));
    onProgress?.(Math.round(((i + 1) / TARGET_SIZES.length) * 100));
  }

  return results;
}

/** Optimize a single image to one target KB size. */
export async function optimizeToTarget(file: File, targetKB: number): Promise<OptimizedResult> {
  const ctx = await prepareMaster(file);
  return encodeTarget(ctx, targetKB);
}
