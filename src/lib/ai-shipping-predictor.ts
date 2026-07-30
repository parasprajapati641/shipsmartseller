// Production AI Shipping Savings Predictor — ShipSmart Seller
import { calculateDynamicShipping, type DynamicShippingResult } from "./dynamic-shipping-engine";

export type ShippingPredictionResult = {
  estimatedWeightSlab: string;
  presetTargetKB: number;
  estShippingCostINR: number;
  potentialSavingsINR: number;
  recommendedDimensions: string;
  advice: string;
  dynamicDetails: DynamicShippingResult;
};

export function predictShippingCost(
  targetKB: number = 20,
  category: string = "apparel",
): ShippingPredictionResult {
  const dynamic = calculateDynamicShipping({
    category,
    targetKB,
    marketplace: "Meesho",
  });

  return {
    estimatedWeightSlab: dynamic.optimizedSlab,
    presetTargetKB: targetKB,
    estShippingCostINR: dynamic.optimizedShippingCostINR,
    potentialSavingsINR: dynamic.savingsPerOrderINR,
    recommendedDimensions: dynamic.recommendedDimensions,
    advice: dynamic.advice,
    dynamicDetails: dynamic,
  };
}
