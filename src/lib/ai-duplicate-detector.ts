// AI Duplicate Detection Engine — Perceptual dHash Pixel Hash
// Computes 64-bit difference hash to detect duplicate uploads in batch catalogs.

export type DuplicateCheckResult = {
  isDuplicate: boolean;
  similarityPct: number;
  duplicateFileName?: string;
  warningMessage?: string;
};

/** Compute 8x8 gradient difference hash from HTMLCanvasElement */
export function computePerceptualHash(canvas: HTMLCanvasElement): string {
  const ctx = canvas.getContext("2d");
  if (!ctx) return "0000000000000000";

  // Downsample to 9x8 grayscale canvas
  const small = document.createElement("canvas");
  small.width = 9;
  small.height = 8;
  const sCtx = small.getContext("2d");
  if (!sCtx) return "0000000000000000";

  sCtx.drawImage(canvas, 0, 0, 9, 8);
  const imgData = sCtx.getImageData(0, 0, 9, 8);
  const data = imgData.data;

  let hashBitString = "";

  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const iLeft = (y * 9 + x) * 4;
      const iRight = (y * 9 + (x + 1)) * 4;

      const lumLeft = data[iLeft] * 0.299 + data[iLeft + 1] * 0.587 + data[iLeft + 2] * 0.114;
      const lumRight = data[iRight] * 0.299 + data[iRight + 1] * 0.587 + data[iRight + 2] * 0.114;

      hashBitString += lumLeft > lumRight ? "1" : "0";
    }
  }

  return hashBitString;
}

/** Calculate Hamming Distance between two 64-bit binary strings */
export function calculateHammingDistance(hashA: string, hashB: string): number {
  let diffCount = 0;
  const len = Math.min(hashA.length, hashB.length);
  for (let i = 0; i < len; i++) {
    if (hashA[i] !== hashB[i]) diffCount++;
  }
  return diffCount;
}

/** Check if current image canvas is duplicate of any existing catalog hash */
export function checkForDuplicate(
  currentCanvas: HTMLCanvasElement,
  existingHashes: { filename: string; hash: string }[],
): DuplicateCheckResult {
  const currentHash = computePerceptualHash(currentCanvas);

  for (const item of existingHashes) {
    const dist = calculateHammingDistance(currentHash, item.hash);
    const similarity = Math.round(((64 - dist) / 64) * 100);

    if (dist <= 6) {
      // 90%+ similarity threshold
      return {
        isDuplicate: true,
        similarityPct: similarity,
        duplicateFileName: item.filename,
        warningMessage: `Potential duplicate product detected (${similarity}% similarity with "${item.filename}"). Duplicate images lower seller rank on Meesho.`,
      };
    }
  }

  return {
    isDuplicate: false,
    similarityPct: 0,
  };
}
