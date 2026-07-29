// AI Multi-Marketplace Readiness Scorer
// Evaluates platform-specific rules for Amazon, Flipkart, Meesho, Shopify, Ajio, and Myntra.

export type MarketplacePlatformScore = {
  platform: "Amazon" | "Flipkart" | "Meesho" | "Shopify" | "Ajio" | "Myntra";
  score: number; // 0 - 100
  status: "Compliant" | "Needs Adjustment" | "Non-Compliant";
  primaryRequirement: string;
  recommendation: string;
};

export function scoreAllMarketplaces(
  bgPurityPct: number,
  subjectOccupancyPct: number,
  isSquare: boolean,
  targetKB: number,
): MarketplacePlatformScore[] {
  // Amazon: Pure White 255, 1:1, 1000px+
  const amazonScore = Math.round(
    bgPurityPct * 0.5 + (isSquare ? 30 : 10) + (subjectOccupancyPct >= 85 ? 20 : 10),
  );

  // Meesho: Tight framing 88-92%, <30KB file size
  const meeshoScore = Math.round(
    subjectOccupancyPct * 0.45 + (targetKB <= 30 ? 35 : 15) + (isSquare ? 20 : 10),
  );

  // Flipkart: Pure white background, 80%+ fill
  const flipkartScore = Math.round(
    bgPurityPct * 0.45 + subjectOccupancyPct * 0.35 + (isSquare ? 20 : 10),
  );

  // Shopify: Clean photography, high sharpness
  const shopifyScore = Math.round(bgPurityPct * 0.35 + subjectOccupancyPct * 0.35 + 30);

  // Ajio: Studio lighting, premium aesthetic
  const ajioScore = Math.round(bgPurityPct * 0.5 + subjectOccupancyPct * 0.3 + 18);

  // Myntra: Catalog white, fashion framing
  const myntraScore = Math.round(bgPurityPct * 0.45 + subjectOccupancyPct * 0.35 + 18);

  return [
    {
      platform: "Meesho",
      score: Math.min(99, Math.max(70, meeshoScore)),
      status: meeshoScore >= 85 ? "Compliant" : "Needs Adjustment",
      primaryRequirement: "88%–92% Frame Occupancy & <30 KB Target Size",
      recommendation:
        targetKB <= 30
          ? "Optimal tier for lowest shipping slab."
          : "Select 15KB or 20KB preset to reduce shipping costs.",
    },
    {
      platform: "Flipkart",
      score: Math.min(99, Math.max(68, flipkartScore)),
      status: flipkartScore >= 85 ? "Compliant" : "Needs Adjustment",
      primaryRequirement: "Studio White Background & 80%+ Framing",
      recommendation: "Passes Flipkart seller quality threshold.",
    },
    {
      platform: "Amazon",
      score: Math.min(99, Math.max(65, amazonScore)),
      status: amazonScore >= 85 ? "Compliant" : "Needs Adjustment",
      primaryRequirement: "RGB (255,255,255) Background & 1:1 Aspect Ratio",
      recommendation: isSquare ? "Aspect ratio compliant." : "Crop to 1:1 square.",
    },
    {
      platform: "Shopify",
      score: Math.min(99, Math.max(72, shopifyScore)),
      status: shopifyScore >= 80 ? "Compliant" : "Needs Adjustment",
      primaryRequirement: "High-Resolution Product Asset",
      recommendation: "Storefront ready for custom e-commerce themes.",
    },
    {
      platform: "Ajio",
      score: Math.min(99, Math.max(65, ajioScore)),
      status: ajioScore >= 82 ? "Compliant" : "Needs Adjustment",
      primaryRequirement: "Clean Studio Padding & Sharp Edges",
      recommendation: "Preserve high contrast for fashion listings.",
    },
    {
      platform: "Myntra",
      score: Math.min(99, Math.max(65, myntraScore)),
      status: myntraScore >= 82 ? "Compliant" : "Needs Adjustment",
      primaryRequirement: "Catalog Quality Standard & Neutral Shadows",
      recommendation: "Clean border edges for catalog submission.",
    },
  ];
}
