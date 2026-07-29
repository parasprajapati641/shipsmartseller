// AI Shipping Savings Predictor — Pre-Upload Shipping Weight & Slab Analysis

export type ShippingPredictionResult = {
  estimatedWeightSlab: "< 500g Lowest Tier" | "500g - 1kg Standard Tier" | "> 1kg Heavy Tier";
  presetTargetKB: number;
  estShippingCostINR: number;
  potentialSavingsINR: number;
  recommendedDimensions: string;
  advice: string;
};

export function predictShippingCost(
  targetKB: number = 20,
  category: string = "apparel",
): ShippingPredictionResult {
  const isUltraLow = targetKB <= 20;
  const isStandard = targetKB > 20 && targetKB <= 40;

  const cost = isUltraLow ? 38 : isStandard ? 54 : 78;
  const baselineCost = 78;
  const savings = baselineCost - cost;

  return {
    estimatedWeightSlab: isUltraLow
      ? "< 500g Lowest Tier"
      : isStandard
        ? "500g - 1kg Standard Tier"
        : "> 1kg Heavy Tier",
    presetTargetKB: targetKB,
    estShippingCostINR: cost,
    potentialSavingsINR: savings,
    recommendedDimensions: "800 × 800 px (1:1 Square Ratio)",
    advice: isUltraLow
      ? "Targeting 15-20 KB keeps catalog images in Meesho's lowest shipping charge tier."
      : "Select a 15 KB or 20 KB preset to cut ₹16–₹40 per shipment.",
  };
}
