// AI Price Suggester
// Calculates Premium Price, Competitive Price, Discount Price, and Psychological Price based on category.

export type PriceSuggestionResult = {
  premiumPriceINR: number;
  competitivePriceINR: number;
  discountPriceINR: number;
  psychologicalPriceINR: number; // e.g. ₹499, ₹799
  marginEstimatePct: number;
  recommendation: string;
};

export function calculatePriceSuggestions(
  baseEstimateINR: number = 599,
  category: string = "apparel",
  qualityScore: number = 90,
): PriceSuggestionResult {
  const multiplier = qualityScore >= 90 ? 1.15 : 1.0;

  const rawComp = Math.round(baseEstimateINR * multiplier);
  const rawPrem = Math.round(rawComp * 1.35);
  const rawDisc = Math.round(rawComp * 0.85);

  // Apply Indian e-commerce psychological pricing rules (ending in 99, 49, 9)
  const toPsych = (val: number) => {
    const floor100 = Math.floor(val / 100) * 100;
    return floor100 + 99;
  };

  const comp = toPsych(rawComp);
  const prem = toPsych(rawPrem);
  const disc = toPsych(rawDisc);

  return {
    premiumPriceINR: prem,
    competitivePriceINR: comp,
    discountPriceINR: disc,
    psychologicalPriceINR: comp,
    marginEstimatePct: Math.round(38 + (qualityScore > 85 ? 7 : 0)),
    recommendation: `List at ₹${comp} for optimal conversion on Meesho & Flipkart. Use ₹${disc} during flash sales.`,
  };
}
