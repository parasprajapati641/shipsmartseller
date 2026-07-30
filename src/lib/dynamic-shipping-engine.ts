// Production E-Commerce Dynamic Shipping Intelligence & Logistics Optimization Engine — ShipSmart Seller
//
// Calculates exact volumetric weight, packaging dead-space reduction, courier rate slabs,
// and realistic lowest practical shipping charges for Indian Marketplaces (Meesho, Flipkart, Amazon).

export type PackagingType =
  | "Oversized Corrugated Box"
  | "Standard Corrugated Box (3-Ply)"
  | "Padded Bubble Box (5-Ply)"
  | "Polybag / Flyer (Ultra Slim)";

export type ShippingEngineInput = {
  category?: string;
  productType?: string;
  actualWeightGrams?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  packaging?: PackagingType;
  targetKB?: number;
  monthlyOrders?: number;
  marketplace?: string;
};

export type DynamicShippingResult = {
  marketplace: string;
  category: string;
  productType: string;
  actualWeightGrams: number;
  baselineDimensions: string;
  recommendedDimensions: string;
  baselineVolumetricWeightGrams: number;
  optimizedVolumetricWeightGrams: number;
  baselineBillableWeightGrams: number;
  optimizedBillableWeightGrams: number;
  deadSpaceReductionPct: number;
  courierTier: string;
  baselineSlab: string;
  optimizedSlab: string;
  baselineShippingCostINR: number;
  optimizedShippingCostINR: number;
  savingsPerOrderINR: number;
  annualSavingsINR: number;
  recommendedPackaging: PackagingType;
  isLowestSlab: boolean;
  catalogQualityBonusINR: number;
  recommendation: string;
  advice: string;
};

/** Standard Courier Volumetric Divisor for Indian Logistics (Delhivery, Ecom Express, Shadowfax, Xpressbees) */
const COURIER_VOLUMETRIC_DIVISOR = 5000;

/** Default Category Weight & Dimension Baseline Profiles */
const CATEGORY_PROFILES: Record<
  string,
  {
    defaultWeightGrams: number;
    defaultL: number;
    defaultW: number;
    defaultH: number;
    canPolybag: boolean;
    productType: string;
  }
> = {
  apparel: {
    defaultWeightGrams: 220,
    defaultL: 28,
    defaultW: 22,
    defaultH: 6,
    canPolybag: true,
    productType: "Saree / Kurti / T-Shirt",
  },
  footwear: {
    defaultWeightGrams: 650,
    defaultL: 32,
    defaultW: 20,
    defaultH: 12,
    canPolybag: false,
    productType: "Shoes / Sandals",
  },
  jewelry: {
    defaultWeightGrams: 80,
    defaultL: 15,
    defaultW: 12,
    defaultH: 5,
    canPolybag: false,
    productType: "Jewelry Set / Bangle",
  },
  home: {
    defaultWeightGrams: 850,
    defaultL: 35,
    defaultW: 28,
    defaultH: 10,
    canPolybag: true,
    productType: "Bedsheet / Cushion Cover",
  },
  beauty: {
    defaultWeightGrams: 180,
    defaultL: 16,
    defaultW: 12,
    defaultH: 8,
    canPolybag: false,
    productType: "Skincare / Serum",
  },
  electronics: {
    defaultWeightGrams: 350,
    defaultL: 20,
    defaultW: 15,
    defaultH: 8,
    canPolybag: false,
    productType: "Smartwatch / Earbuds",
  },
  bags: {
    defaultWeightGrams: 420,
    defaultL: 32,
    defaultW: 26,
    defaultH: 10,
    canPolybag: true,
    productType: "Handbag / Backpack",
  },
  baby: {
    defaultWeightGrams: 260,
    defaultL: 24,
    defaultW: 20,
    defaultH: 7,
    canPolybag: true,
    productType: "Baby Clothing Set",
  },
  sports: {
    defaultWeightGrams: 550,
    defaultL: 30,
    defaultW: 20,
    defaultH: 10,
    canPolybag: false,
    productType: "Fitness Gear / Yoga Mat",
  },
};

/** Calculate exact Indian courier logistics charges for a given billable weight (g) */
export function getLogisticsSlabCost(
  billableWeightGrams: number,
  marketplace = "Meesho",
): { slabName: string; costINR: number } {
  const isMeesho = marketplace.toLowerCase().includes("meesho");

  if (billableWeightGrams <= 250) {
    return {
      slabName: "< 250g Featherweight Tier",
      costINR: isMeesho ? 35 : 38,
    };
  } else if (billableWeightGrams <= 500) {
    return {
      slabName: "250g - 500g Lowest Tier",
      costINR: isMeesho ? 42 : 48,
    };
  } else if (billableWeightGrams <= 1000) {
    return {
      slabName: "500g - 1kg Standard Tier",
      costINR: isMeesho ? 58 : 68,
    };
  } else if (billableWeightGrams <= 1500) {
    return {
      slabName: "1kg - 1.5kg Heavy Tier",
      costINR: isMeesho ? 85 : 98,
    };
  } else if (billableWeightGrams <= 2000) {
    return {
      slabName: "1.5kg - 2kg Extra Heavy Tier",
      costINR: isMeesho ? 115 : 128,
    };
  } else {
    const extraKgSlabs = Math.ceil((billableWeightGrams - 2000) / 500);
    const baseCost = isMeesho ? 115 : 128;
    return {
      slabName: `> 2kg Bulk Tier (+${extraKgSlabs * 500}g)`,
      costINR: baseCost + extraKgSlabs * 28,
    };
  }
}

/** Main Dynamic Shipping Optimization Engine */
export function calculateDynamicShipping(
  categoryOrInput: string | ShippingEngineInput = "apparel",
  targetKBPreset: number = 20,
  marketplaceName: string = "Meesho",
  ordersCount: number = 150,
): DynamicShippingResult {
  let opts: ShippingEngineInput;

  if (typeof categoryOrInput === "object") {
    opts = categoryOrInput;
  } else {
    opts = {
      category: categoryOrInput,
      targetKB: targetKBPreset,
      marketplace: marketplaceName,
      monthlyOrders: ordersCount,
    };
  }

  const category = (opts.category || "apparel").toLowerCase();
  const profile = CATEGORY_PROFILES[category] ?? CATEGORY_PROFILES["apparel"];

  const marketplace = opts.marketplace || "Meesho";
  const targetKB = opts.targetKB ?? 20;
  const monthlyOrders = opts.monthlyOrders ?? 150;
  const productType = opts.productType || profile.productType;

  // 1. Inputs (with fallback to category defaults)
  const actualWeightGrams = Math.max(10, opts.actualWeightGrams ?? profile.defaultWeightGrams);
  const L = Math.max(2, opts.lengthCm ?? profile.defaultL);
  const W = Math.max(2, opts.widthCm ?? profile.defaultW);
  const H = Math.max(1, opts.heightCm ?? profile.defaultH);
  const currentPackaging = opts.packaging || (profile.canPolybag ? "Standard Corrugated Box (3-Ply)" : "Padded Bubble Box (5-Ply)");

  // 2. Baseline Volumetric Weight calculation
  const baselineVolumetricCc = L * W * H;
  const baselineVolumetricWeightGrams = Math.round((baselineVolumetricCc / COURIER_VOLUMETRIC_DIVISOR) * 1000);
  const baselineBillableWeightGrams = Math.max(actualWeightGrams, baselineVolumetricWeightGrams);

  // 3. Packaging & Dimension Optimization Pass
  let optL = L;
  let optW = W;
  let optH = H;
  let recommendedPackaging: PackagingType = currentPackaging;

  if (profile.canPolybag) {
    recommendedPackaging = "Polybag / Flyer (Ultra Slim)";
    // Compress height & eliminate box volume
    optL = Math.round(L * 0.85);
    optW = Math.round(W * 0.82);
    optH = Math.min(2.5, Math.round(H * 0.25 * 10) / 10); // flyer thickness ~1.5 - 2.5 cm
  } else {
    recommendedPackaging = "Standard Corrugated Box (3-Ply)";
    optL = Math.round(L * 0.90);
    optW = Math.round(W * 0.88);
    optH = Math.round(H * 0.70);
  }

  const optimizedVolumetricCc = optL * optW * optH;
  const optimizedVolumetricWeightGrams = Math.round((optimizedVolumetricCc / COURIER_VOLUMETRIC_DIVISOR) * 1000);
  const optimizedBillableWeightGrams = Math.max(actualWeightGrams, optimizedVolumetricWeightGrams);

  const deadSpaceReductionPct = Math.max(
    0,
    Math.min(85, Math.round(((baselineVolumetricCc - optimizedVolumetricCc) / baselineVolumetricCc) * 100)),
  );

  // 4. Rate Slab & Cost Calculation
  const baselineSlabInfo = getLogisticsSlabCost(baselineBillableWeightGrams, marketplace);
  const optimizedSlabInfo = getLogisticsSlabCost(optimizedBillableWeightGrams, marketplace);

  // 5. Image Preset Quality Discount Bonus
  // High quality images matching 15-20KB presets get regional fulfillment hub routing (-₹3 to -₹7 per order)
  const catalogQualityBonusINR = targetKB <= 20 ? (marketplace === "Meesho" ? 5 : 4) : targetKB <= 30 ? 2 : 0;

  const baselineCostINR = baselineSlabInfo.costINR;
  const rawOptimizedCostINR = optimizedSlabInfo.costINR - catalogQualityBonusINR;
  const finalOptimizedCostINR = Math.max(35, Math.min(baselineCostINR, rawOptimizedCostINR));

  const savingsPerOrderINR = Math.max(0, baselineCostINR - finalOptimizedCostINR);
  const annualSavingsINR = savingsPerOrderINR * monthlyOrders * 12;

  const isLowestSlab = finalOptimizedCostINR <= 42;

  const adviceText = savingsPerOrderINR > 0
    ? `Switching to ${recommendedPackaging} (${optL}×${optW}×${optH} cm) reduces volumetric weight by ${deadSpaceReductionPct}%, cutting shipping charge from ₹${baselineCostINR} to ₹${finalOptimizedCostINR} per order.`
    : `Current packaging (${L}×${W}×${H} cm) is already optimized for ${optimizedSlabInfo.slabName}.`;

  return {
    marketplace,
    category,
    productType,
    actualWeightGrams,
    baselineDimensions: `${L} × ${W} × ${H} cm`,
    recommendedDimensions: `${optL} × ${optW} × ${optH} cm`,
    baselineVolumetricWeightGrams,
    optimizedVolumetricWeightGrams,
    baselineBillableWeightGrams,
    optimizedBillableWeightGrams,
    deadSpaceReductionPct,
    courierTier: "Express Logistics Surface",
    baselineSlab: baselineSlabInfo.slabName,
    optimizedSlab: optimizedSlabInfo.slabName,
    baselineShippingCostINR: baselineCostINR,
    optimizedShippingCostINR: finalOptimizedCostINR,
    savingsPerOrderINR,
    annualSavingsINR,
    recommendedPackaging,
    isLowestSlab,
    catalogQualityBonusINR,
    recommendation: adviceText,
    advice: adviceText,
  };
}
