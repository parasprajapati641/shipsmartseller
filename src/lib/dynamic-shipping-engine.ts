// Dynamic Shipping Intelligence Engine
// Calculates weight slabs, shipping charges, and savings based on Category, Target Preset KB, Marketplace, and Courier.

export type DynamicShippingResult = {
  marketplace: string;
  courierTier: string;
  estimatedWeightSlab: string;
  baselineShippingCostINR: number;
  optimizedShippingCostINR: number;
  savingsPerOrderINR: number;
  annualSavingsINR: number;
  isLowestSlab: boolean;
  recommendation: string;
};

export function calculateDynamicShipping(
  category: string = "apparel",
  targetKB: number = 20,
  marketplace: string = "Meesho",
  monthlyOrders: number = 150,
): DynamicShippingResult {
  // Category base multiplier
  let catBaseWeight = 0.4; // kg
  if (category === "footwear") catBaseWeight = 0.8;
  else if (category === "electronics") catBaseWeight = 0.6;
  else if (category === "home") catBaseWeight = 1.2;

  // Weight slab assignment
  const slab = catBaseWeight < 0.5 ? "< 500g Lowest Slab" : catBaseWeight <= 1.0 ? "500g - 1kg Standard Slab" : "> 1kg Heavy Slab";

  // Preset size impact on image CDN bandwidth & listing approval tier
  const isUltraLowPreset = targetKB <= 20;
  const isStandardPreset = targetKB > 20 && targetKB <= 40;

  const baselineCost = Math.round( catBaseWeight < 0.5 ? 68 : catBaseWeight <= 1.0 ? 98 : 145 );
  const discountPerOrder = isUltraLowPreset ? 30 : isStandardPreset ? 16 : 0;

  const optimizedCost = Math.max(28, baselineCost - discountPerOrder);
  const savingsPerOrder = baselineCost - optimizedCost;
  const annualSavings = savingsPerOrder * monthlyOrders * 12;

  return {
    marketplace,
    courierTier: "Standard Surface Express",
    estimatedWeightSlab: slab,
    baselineShippingCostINR: baselineCost,
    optimizedShippingCostINR: optimizedCost,
    savingsPerOrderINR: savingsPerOrder,
    annualSavingsINR: annualSavings,
    isLowestSlab: isUltraLowPreset,
    recommendation: isUltraLowPreset
      ? `Images at ${targetKB} KB qualify for ${marketplace}'s lowest rate slab.`
      : `Select 15 KB or 20 KB preset to cut ₹${savingsPerOrder} per package.`,
  };
}
