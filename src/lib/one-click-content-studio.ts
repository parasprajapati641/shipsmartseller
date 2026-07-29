// One-Click Content Studio Engine
// Generates 10 marketplace & social media marketing formats from a single product canvas.

export type StudioFormatKey =
  | "meesho_square"
  | "amazon_main"
  | "flipkart_catalog"
  | "instagram_post"
  | "instagram_story"
  | "facebook_marketplace"
  | "whatsapp_product"
  | "product_banner"
  | "white_bg_product"
  | "premium_hd_catalog";

export type StudioAssetResult = {
  key: StudioFormatKey;
  label: string;
  width: number;
  height: number;
  aspectLabel: string;
  blob: Blob;
  url: string;
  description: string;
};

export const STUDIO_FORMAT_SPECS: {
  key: StudioFormatKey;
  label: string;
  w: number;
  h: number;
  aspect: string;
  bg: string;
  desc: string;
}[] = [
  { key: "meesho_square", label: "1. Meesho Square", w: 1000, h: 1000, aspect: "1:1 Square", bg: "#FFFFFF", desc: "Optimized for Meesho logistics rate slabs" },
  { key: "amazon_main", label: "2. Amazon Main", w: 1600, h: 1600, aspect: "1:1 Square", bg: "#FFFFFF", desc: "RGB 255 pure white studio requirement" },
  { key: "flipkart_catalog", label: "3. Flipkart Catalog", w: 1100, h: 1466, aspect: "3:4 Portrait", bg: "#FFFFFF", desc: "High-res Flipkart catalog asset" },
  { key: "instagram_post", label: "4. Instagram Post", w: 1080, h: 1080, aspect: "1:1 Square", bg: "#FFFFFF", desc: "Social feed product post" },
  { key: "instagram_story", label: "5. Instagram Story", w: 1080, h: 1920, aspect: "9:16 Portrait", bg: "#090B14", desc: "Full-screen mobile story format" },
  { key: "facebook_marketplace", label: "6. Facebook Marketplace", w: 1200, h: 1200, aspect: "1:1 Square", bg: "#FFFFFF", desc: "Facebook catalog listing format" },
  { key: "whatsapp_product", label: "7. WhatsApp Product", w: 800, h: 800, aspect: "1:1 Square", bg: "#FFFFFF", desc: "Mobile instant catalog preview" },
  { key: "product_banner", label: "8. Product Banner", w: 1920, h: 1080, aspect: "16:9 Landscape", bg: "#090B14", desc: "Wide promotional store banner" },
  { key: "white_bg_product", label: "9. White Background Product", w: 1200, h: 1200, aspect: "1:1 Square", bg: "#FFFFFF", desc: "Isolated 100% white background asset" },
  { key: "premium_hd_catalog", label: "10. Premium HD Catalog", w: 2000, h: 2000, aspect: "1:1 Square", bg: "#FFFFFF", desc: "Ultra HD master catalog archive format" },
];

export async function generateOneClickStudioPack(
  sourceCanvas: HTMLCanvasElement,
): Promise<StudioAssetResult[]> {
  const results: StudioAssetResult[] = [];

  for (const spec of STUDIO_FORMAT_SPECS) {
    const canvas = document.createElement("canvas");
    canvas.width = spec.w;
    canvas.height = spec.h;
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;

    // Fill background
    ctx.fillStyle = spec.bg;
    ctx.fillRect(0, 0, spec.w, spec.h);

    // Calculate aspect-fit scaling and centering for product image
    const srcAspect = sourceCanvas.width / sourceCanvas.height;

    let drawW = spec.w * 0.85;
    let drawH = drawW / srcAspect;

    if (drawH > spec.h * 0.85) {
      drawH = spec.h * 0.85;
      drawW = drawH * srcAspect;
    }

    const drawX = (spec.w - drawW) / 2;
    const drawY = (spec.h - drawH) / 2;

    ctx.drawImage(sourceCanvas, drawX, drawY, drawW, drawH);

    // Convert to Blob
    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b ?? new Blob()), "image/jpeg", 0.9),
    );
    const url = URL.createObjectURL(blob);

    results.push({
      key: spec.key,
      label: spec.label,
      width: spec.w,
      height: spec.h,
      aspectLabel: spec.aspect,
      blob,
      url,
      description: spec.desc,
    });
  }

  return results;
}
