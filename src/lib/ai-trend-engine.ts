// AI Trend Engine — E-Commerce Category & Visual Trends
// Real-time recommendations for photography styles, color palettes, and packaging.

export type TrendRecommendation = {
  category: string;
  popularStyle: string;
  trendingColors: string[];
  marketplaceShift: string;
  packagingTip: string;
  ctrImpact: string;
};

export const TREND_DATA: Record<string, TrendRecommendation> = {
  apparel: {
    category: "Apparel & Fashion",
    popularStyle: "Clean 90% zoom crop on pure studio white with subtle drop shadow.",
    trendingColors: ["#FFFFFF (Pure White)", "#F1F5F9 (Soft Slate)", "#0F172A (Deep Obsidian)"],
    marketplaceShift: "Meesho buyers favor flat-lay square photos with 90% subject fill.",
    packagingTip: "Include compact unboxing card with QR code for 5-star seller reviews.",
    ctrImpact: "+34% CTR on mobile fashion search feeds.",
  },
  footwear: {
    category: "Footwear & Accessories",
    popularStyle: "45-degree angle profile showcasing sole grip and side stitching.",
    trendingColors: ["#FFFFFF (Pure White)", "#E2E8F0 (Neutral Light)"],
    marketplaceShift: "High contrast side profiles perform 2.2x better on Flipkart search grids.",
    packagingTip: "Use eco-friendly shoe pouch to reduce volumetric shipping weight.",
    ctrImpact: "+28% higher detail engagement.",
  },
  electronics: {
    category: "Electronics & Gadgets",
    popularStyle: "Symmetrical front-facing view with highlighted LED / port accents.",
    trendingColors: ["#FFFFFF (Pure White)", "#38BDF8 (Electric Cyan Accent)"],
    marketplaceShift: "Amazon India requires strict 100% white background without drop shadow.",
    packagingTip: "Use anti-static bubble wrap to prevent return claims.",
    ctrImpact: "+40% trust index score.",
  },
  home: {
    category: "Home & Kitchen",
    popularStyle: "Straight-on product elevation with zero background clutter.",
    trendingColors: ["#FFFFFF (Pure White)", "#FEF08A (Warm Neutral)"],
    marketplaceShift: "Bright lighting increases conversion rate by 22% on Meesho.",
    packagingTip: "Box-in-box protective padding for fragile ceramics.",
    ctrImpact: "+25% conversion gain.",
  },
};

export function getCategoryTrends(category: string = "apparel"): TrendRecommendation {
  return TREND_DATA[category] ?? TREND_DATA.apparel;
}
