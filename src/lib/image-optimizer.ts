// Production-Grade Meesho Image Optimization Engine for Ship Smart
//
// Pipeline Architecture:
//  1. Single-Pass Image Decoding: Decode raw input file (JPG, PNG, WEBP) exactly once via createImageBitmap.
//  2. Border Background Sampling & Computer Vision: Sample outer edge pixels to detect subject bounding box.
//  3. Deterministic Tight Cropping (88%-92% Frame Occupancy): Crop tightly around subject with 2%-4% margins.
//  4. Independent Compression Pipeline: Multi-resolution scale search to hit exact target preset size (±0.5 KB).
//  5. Scale-Factor Aware Sharpening: Unsharp masking pass to preserve fine facial & fabric textures.

import Pica from "pica";
import {
  selectAdaptiveStrategiesForCategory,
  type OptimizationStrategy,
} from "./adaptive-learning-store.js";
import {
  rankAndScoreVariants,
  type VariantRecommendation,
} from "./recommendation-engine.js";

const pica = Pica({ features: ["js", "wasm"] });

export type ImageOrientation = "square" | "portrait" | "landscape";

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
  orientation?: ImageOrientation;
  score?: number;
  strategy?: OptimizationStrategy;
  recommendation?: VariantRecommendation;
  debugInfo?: {
    bbox: SubjectBoundingBox;
    cropRect: { left: number; top: number; width: number; height: number };
    frameOccupancyPct: number;
    outputDim: { width: number; height: number };
  };
};

export const TARGET_SIZES = [5, 10, 15, 20, 25, 30, 40, 50];

type SubjectBoundingBox = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
};

type MasterContext = {
  masterCanvas: HTMLCanvasElement;
  masterSize: number;
  fileSize: number;
  orientation: ImageOrientation;
  aspectRatio: number;
  bbox: SubjectBoundingBox;
  bgSample: { r: number; g: number; b: number };
  nativeCanvas: HTMLCanvasElement;
  resizeCache: Map<string, HTMLCanvasElement>;
};

// ---------------------------------------------------------------------------
// 1. Validation
// ---------------------------------------------------------------------------

export function validateImageFile(file: File): { ok: true } | { ok: false; error: string } {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) {
    return { ok: false, error: "Only JPG, PNG, or WEBP files are supported." };
  }
  if (file.size > 20 * 1024 * 1024) {
    return { ok: false, error: "File size exceeds 20 MB limit." };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// 2. Canvas & Single Decode Utilities
// ---------------------------------------------------------------------------

async function decodeOnce(file: File | Blob): Promise<ImageBitmap> {
  return createImageBitmap(file, { imageOrientation: "from-image" });
}

function makeCanvas(width: number, height: number = width): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

// ---------------------------------------------------------------------------
// 3. Computer Vision: Border Sampling & Subject Bounding Box Detection
// ---------------------------------------------------------------------------

function detectSubjectBoundingBox(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): { bbox: SubjectBoundingBox; bgSample: { r: number; g: number; b: number } } {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // 1. Border Sampling: Calculate baseline background RGB from outer edges of photo
  let bgRSum = 0, bgGSum = 0, bgBSum = 0, bgCount = 0;
  const borderMargin = Math.max(3, Math.floor(Math.min(width, height) * 0.03));

  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      if (y < borderMargin || y >= height - borderMargin || x < borderMargin || x >= width - borderMargin) {
        const idx = (y * width + x) * 4;
        const a = data[idx + 3];
        if (a > 30) {
          bgRSum += data[idx];
          bgGSum += data[idx + 1];
          bgBSum += data[idx + 2];
          bgCount++;
        }
      }
    }
  }

  const bgR = bgCount > 0 ? bgRSum / bgCount : 255;
  const bgG = bgCount > 0 ? bgGSum / bgCount : 255;
  const bgB = bgCount > 0 ? bgBSum / bgCount : 255;

  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let found = false;

  const step = Math.max(1, Math.floor(Math.min(width, height) / 500));

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      if (a < 30) continue; // Transparent

      const brightness = (r + g + b) / 3;
      const colorDiff = Math.max(r, g, b) - Math.min(r, g, b);
      const distToBg = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);

      const isBackground =
        (distToBg < 45 && brightness > 150) ||
        (brightness > 230 && colorDiff < 20) ||
        (brightness > 245);

      if (!isBackground) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        found = true;
      }
    }
  }

  // Deterministic Fallback: Center saliency crop
  if (!found || maxX <= minX || maxY <= minY || (maxX - minX < width * 0.1) || (maxY - minY < height * 0.1)) {
    const cropMarginX = Math.round(width * 0.12);
    const cropMarginY = Math.round(height * 0.08);
    return {
      bbox: {
        minX: cropMarginX,
        minY: cropMarginY,
        maxX: width - cropMarginX,
        maxY: height - cropMarginY,
        width: width - cropMarginX * 2,
        height: height - cropMarginY * 2,
      },
      bgSample: { r: Math.round(bgR), g: Math.round(bgG), b: Math.round(bgB) },
    };
  }

  let bWidth = maxX - minX;
  let bHeight = maxY - minY;

  // Deterministic Guard: If detected bounding box covers >82% of full canvas, trim outer background margins
  if (bWidth / width > 0.82 || bHeight / height > 0.82) {
    const trimX = Math.round(width * 0.10);
    const trimY = Math.round(height * 0.06);
    minX = Math.min(width / 2 - 10, minX + trimX);
    maxX = Math.max(width / 2 + 10, maxX - trimX);
    minY = Math.min(height / 2 - 10, minY + trimY);
    maxY = Math.max(height / 2 + 10, maxY - trimY);
    bWidth = maxX - minX;
    bHeight = maxY - minY;
  }

  return {
    bbox: {
      minX,
      minY,
      maxX,
      maxY,
      width: bWidth,
      height: bHeight,
    },
    bgSample: { r: Math.round(bgR), g: Math.round(bgG), b: Math.round(bgB) },
  };
}

function classifyOrientation(aspectRatio: number): ImageOrientation {
  if (aspectRatio >= 0.9 && aspectRatio <= 1.1) return "square";
  if (aspectRatio < 0.9) return "portrait";
  return "landscape";
}

function computeMasterSize(srcW: number, srcH: number): number {
  const maxDim = Math.max(srcW, srcH);
  if (maxDim <= 1600) return 1600;
  if (maxDim <= 2048) return 2048;
  return Math.min(2400, maxDim);
}

async function prepareMaster(file: File): Promise<MasterContext> {
  const bmp = await decodeOnce(file);
  const srcW = bmp.width;
  const srcH = bmp.height;

  const nativeCanvas = makeCanvas(srcW, srcH);
  const nctx = nativeCanvas.getContext("2d")!;
  nctx.fillStyle = "#ffffff";
  nctx.fillRect(0, 0, srcW, srcH);
  nctx.drawImage(bmp, 0, 0);
  bmp.close?.();

  const { bbox, bgSample } = detectSubjectBoundingBox(nctx, srcW, srcH);
  const bboxAspect = bbox.width / bbox.height;
  const orientation = classifyOrientation(bboxAspect);
  const masterSize = computeMasterSize(srcW, srcH);

  return {
    masterCanvas: nativeCanvas,
    masterSize,
    fileSize: file.size,
    orientation,
    aspectRatio: bboxAspect,
    bbox,
    bgSample,
    nativeCanvas,
    resizeCache: new Map(),
  };
}

// ---------------------------------------------------------------------------
// 4. Custom Strategy Master Composition & Tight Subject Cropping (88%-92%)
// ---------------------------------------------------------------------------

/** High-Precision Edge Sharpening Pass (Unsharp Mask) to preserve fine facial & fabric textures. */
function applyAdaptiveSharpening(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  level: "none" | "balanced" | "high" = "high",
): void {
  if (level === "none") return;
  const amount = level === "high" ? 0.35 : 0.2;

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const copy = new Uint8ClampedArray(data);

  // 3x3 High-Frequency Detail Kernel
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      for (let c = 0; c < 3; c++) {
        const center = copy[idx + c];
        const top = copy[((y - 1) * width + x) * 4 + c];
        const bottom = copy[((y + 1) * width + x) * 4 + c];
        const left = copy[(y * width + (x - 1)) * 4 + c];
        const right = copy[(y * width + (x + 1)) * 4 + c];

        const laplacian = 4 * center - top - bottom - left - right;
        const sharpened = center + amount * laplacian;
        data[idx + c] = Math.min(255, Math.max(0, sharpened));
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

/**
 * Creates a tightly cropped canvas around the detected subject.
 * The subject fills 88%-92% of the final frame with minimal 2%-4% padding,
 * matching Amazon/Meesho listing aesthetics without excessive whitespace.
 */
async function createStrategyCanvas(
  ctx: MasterContext,
  strategy: OptimizationStrategy,
): Promise<{ croppedCanvas: HTMLCanvasElement; debugRect: { left: number; top: number; width: number; height: number }; occupancyPct: number }> {
  const { bbox, nativeCanvas } = ctx;

  // 1. Target aspect ratio (e.g. 3:4 -> 0.75, 1:1 -> 1.0)
  const targetAspect = strategy.aspectRatio === "3:4" ? 3 / 4 : 1 / 1;

  // 2. Target subject occupancy in final frame: 88%-92% (leaving 2%-4% margins)
  const fillRatio = Math.min(0.92, Math.max(0.86, strategy.fillRatio ?? 0.90));

  // 3. Calculate minimum frame dimensions to contain the subject at fillRatio
  const minFrameW = bbox.width / fillRatio;
  const minFrameH = bbox.height / fillRatio;

  let frameW: number;
  let frameH: number;

  if (minFrameW / minFrameH > targetAspect) {
    frameW = minFrameW;
    frameH = minFrameW / targetAspect;
  } else {
    frameH = minFrameH;
    frameW = minFrameH * targetAspect;
  }

  // 4. Center crop box around subject center
  const bboxCenterX = bbox.minX + bbox.width / 2;
  const bboxCenterY = bbox.minY + bbox.height / 2;

  const cropLeft = bboxCenterX - frameW / 2;
  const cropTop = bboxCenterY - frameH / 2;

  // 5. Construct high-resolution canvas matching target aspect ratio
  const renderW = Math.round(frameW);
  const renderH = Math.round(frameH);

  const croppedCanvas = makeCanvas(renderW, renderH);
  const cctx = croppedCanvas.getContext("2d")!;
  cctx.fillStyle = "#ffffff";
  cctx.fillRect(0, 0, renderW, renderH);

  // Source & dest coordinates
  const srcX = Math.round(cropLeft);
  const srcY = Math.round(cropTop);
  const srcW = renderW;
  const srcH = renderH;

  const drawX = Math.max(0, -srcX);
  const drawY = Math.max(0, -srcY);
  const realSrcX = Math.max(0, srcX);
  const realSrcY = Math.max(0, srcY);
  const realSrcW = Math.min(nativeCanvas.width - realSrcX, srcW - drawX);
  const realSrcH = Math.min(nativeCanvas.height - realSrcY, srcH - drawY);

  if (realSrcW > 0 && realSrcH > 0) {
    cctx.drawImage(
      nativeCanvas,
      realSrcX,
      realSrcY,
      realSrcW,
      realSrcH,
      drawX,
      drawY,
      realSrcW,
      realSrcH,
    );
  }

  // Apply high-clarity detail sharpening
  applyAdaptiveSharpening(cctx, renderW, renderH, strategy.sharpeningLevel ?? "high");

  const occupancyPct = Math.round(Math.max(bbox.width / renderW, bbox.height / renderH) * 100);

  return {
    croppedCanvas,
    debugRect: { left: Math.round(cropLeft), top: Math.round(cropTop), width: renderW, height: renderH },
    occupancyPct,
  };
}

/**
 * Encodes the strategy canvas to hit the exact target KB preset size within ±0.5 KB tolerance.
 */
async function encodeExactTargetKB(
  strategyCanvas: HTMLCanvasElement,
  targetKB: number,
  sharpeningLevel: "none" | "balanced" | "high" = "high",
): Promise<{ blob: Blob; width: number; height: number; quality: number }> {
  const targetBytes = targetKB * 1024;
  
  // Strict target bounds: ±0.45 KB of target (e.g. 5KB -> 4.55KB - 5.45KB, 50KB -> 49.55KB - 50.45KB)
  const minAcceptableBytes = Math.max(1024, Math.round((targetKB - 0.45) * 1024));
  const maxAcceptableBytes = Math.round((targetKB + 0.45) * 1024);

  // High-resolution multi-scale search array starting at full resolution (1.0)
  const scalesToTry = [1.0, 0.95, 0.90, 0.82, 0.75, 0.68, 0.60, 0.52, 0.45, 0.38, 0.30, 0.24, 0.18];

  let closestBlob: Blob | null = null;
  let closestW = strategyCanvas.width;
  let closestH = strategyCanvas.height;
  let closestQ = 0.70;
  let minDiff = Infinity;

  for (const scale of scalesToTry) {
    const nw = Math.max(180, Math.round(strategyCanvas.width * scale));
    const nh = Math.max(180, Math.round(strategyCanvas.height * scale));

    const candidateCanvas = makeCanvas(nw, nh);
    const sctx = candidateCanvas.getContext("2d")!;
    sctx.fillStyle = "#ffffff";
    sctx.fillRect(0, 0, nw, nh);
    sctx.drawImage(strategyCanvas, 0, 0, nw, nh);
    applyAdaptiveSharpening(sctx, nw, nh, sharpeningLevel);

    let lo = 0.20;
    let hi = 0.98;

    for (let iter = 0; iter < 18; iter++) {
      const q = (lo + hi) / 2;
      const blob = await pica.toBlob(candidateCanvas, "image/jpeg", q);
      const diff = Math.abs(blob.size - targetBytes);

      if (diff < minDiff) {
        minDiff = diff;
        closestBlob = blob;
        closestW = nw;
        closestH = nh;
        closestQ = q;
      }

      if (blob.size >= minAcceptableBytes && blob.size <= maxAcceptableBytes) {
        return { blob, width: nw, height: nh, quality: Math.round(q * 100) / 100 };
      }

      if (blob.size < minAcceptableBytes) {
        lo = q;
      } else {
        hi = q;
      }
    }
  }

  // Fallback to closest match if exact range not hit
  return {
    blob: closestBlob!,
    width: closestW,
    height: closestH,
    quality: Math.round(closestQ * 100) / 100,
  };
}

// ---------------------------------------------------------------------------
// 5. Adaptive Exploration & Optimization Pipeline
// ---------------------------------------------------------------------------

export async function generateAdaptiveVariants(
  file: File,
  category: string,
  onProgress?: (progress: number, message: string) => void,
): Promise<OptimizedResult[]> {
  onProgress?.(5, "Decoding input image...");
  const ctx = await prepareMaster(file);

  onProgress?.(15, `Categorizing ${category} dataset & selecting strategies...`);
  const selectedStrategies = selectAdaptiveStrategiesForCategory(category, 1);

  const total = selectedStrategies.length;
  const results: OptimizedResult[] = [];

  for (let i = 0; i < total; i++) {
    const strategy = selectedStrategies[i];
    const stepPct = Math.round(15 + ((i + 1) / total) * 75);
    onProgress?.(stepPct, `Tuning strategy: ${strategy.name} (${strategy.targetKB}KB target)...`);

    const { croppedCanvas, debugRect, occupancyPct } = await createStrategyCanvas(ctx, strategy);
    const encoded = await encodeExactTargetKB(
      croppedCanvas,
      strategy.targetKB,
      strategy.sharpeningLevel ?? "high",
    );

    const sizeKB = Math.round((encoded.blob.size / 1024) * 10) / 10;
    const compressionPct = Math.round(((file.size - encoded.blob.size) / file.size) * 100);
    const url = URL.createObjectURL(encoded.blob);

    const debugInfo = {
      bbox: ctx.bbox,
      cropRect: debugRect,
      frameOccupancyPct: occupancyPct,
      outputDim: { width: encoded.width, height: encoded.height },
    };

    console.log(`[SHIPS MART CROP DEBUG] Variant ${strategy.name} (${strategy.targetKB}KB):`, {
      detectedBoundingBox: `${ctx.bbox.width}x${ctx.bbox.height} at (${ctx.bbox.minX},${ctx.bbox.minY})`,
      bgSample: `rgb(${ctx.bgSample.r},${ctx.bgSample.g},${ctx.bgSample.b})`,
      cropRectangle: `${debugRect.width}x${debugRect.height} at (${debugRect.left},${debugRect.top})`,
      finalFrameOccupancyPct: `${occupancyPct}%`,
      outputDimensions: `${encoded.width}x${encoded.height}`,
      targetKB: strategy.targetKB,
      downloadedKB: sizeKB,
    });

    results.push({
      targetKB: strategy.targetKB,
      blob: encoded.blob,
      url,
      width: encoded.width,
      height: encoded.height,
      sizeKB,
      format: "image/jpeg",
      quality: encoded.quality,
      compressionPct,
      orientation: ctx.orientation,
      strategy,
      debugInfo,
    });
  }

  onProgress?.(95, "Calculating win probability scores & ranking variants...");
  const recMap = rankAndScoreVariants(
    selectedStrategies,
    category,
    { width: ctx.bbox.width, height: ctx.bbox.height, sizeKB: Math.round(file.size / 1024) },
  );

  for (const res of results) {
    if (res.strategy) {
      const rec = recMap.get(res.strategy.id);
      if (rec) {
        res.recommendation = rec;
        res.score = rec.winProbabilityPct;
      }
    }
  }

  onProgress?.(100, "Optimization pipeline complete.");
  return results;
}
