// Smart Profit Engine — Live Financial Calculator for Indian Marketplace Sellers
// Calculates Marketplace Commission, GST, Shipping, Ad Spend, Returns, Margins, and Breakeven prices.

export type ProfitCalculatorInput = {
  sellingPriceINR: number;
  costPriceINR: number;
  packagingCostINR: number;
  shippingCostINR: number;
  commissionPct: number; // e.g. 8%
  gstPct: number; // e.g. 18%
  adSpendPct: number; // e.g. 5%
  returnRatePct: number; // e.g. 10%
  monthlyUnits: number;
};

export type ProfitCalculatorOutput = {
  grossProfitINR: number;
  netProfitINR: number;
  profitMarginPct: number;
  marketplaceFeeINR: number;
  gstAmountINR: number;
  adSpendINR: number;
  returnCostINR: number;
  totalCostsINR: number;
  breakevenPriceINR: number;
  recommendedPriceINR: number;
  monthlyProfitINR: number;
  annualProfitINR: number;
};

export function calculateSmartProfit(input: ProfitCalculatorInput): ProfitCalculatorOutput {
  const sellingPrice = Math.max(1, input.sellingPriceINR);
  const costPrice = Math.max(0, input.costPriceINR);
  const packaging = Math.max(0, input.packagingCostINR);
  const shipping = Math.max(0, input.shippingCostINR);
  const units = Math.max(1, input.monthlyUnits);

  const marketplaceFee = sellingPrice * (input.commissionPct / 100);
  const gstAmount = sellingPrice * (input.gstPct / 100);
  const adSpend = sellingPrice * (input.adSpendPct / 100);
  const returnCost = shipping * (input.returnRatePct / 100);

  const grossProfit = sellingPrice - costPrice - packaging - shipping;
  const totalCosts = costPrice + packaging + shipping + marketplaceFee + gstAmount + adSpend + returnCost;
  const netProfit = sellingPrice - totalCosts;
  const profitMarginPct = Number(((netProfit / sellingPrice) * 100).toFixed(1));

  // Breakeven price calculation
  const fixedCostPerUnit = costPrice + packaging + shipping;
  const variableFeePct = (input.commissionPct + input.gstPct + input.adSpendPct) / 100;
  const breakevenPrice = Math.round(fixedCostPerUnit / Math.max(0.1, 1 - variableFeePct));

  // Recommended price (30% target net margin)
  const recommendedPrice = Math.round(fixedCostPerUnit / Math.max(0.1, 1 - variableFeePct - 0.3));

  const monthlyProfit = Math.round(netProfit * units);
  const annualProfit = monthlyProfit * 12;

  return {
    grossProfitINR: Math.round(grossProfit),
    netProfitINR: Math.round(netProfit),
    profitMarginPct,
    marketplaceFeeINR: Math.round(marketplaceFee),
    gstAmountINR: Math.round(gstAmount),
    adSpendINR: Math.round(adSpend),
    returnCostINR: Math.round(returnCost),
    totalCostsINR: Math.round(totalCosts),
    breakevenPriceINR: Math.max(1, breakevenPrice),
    recommendedPriceINR: Math.max(1, recommendedPrice),
    monthlyProfitINR: monthlyProfit,
    annualProfitINR: annualProfit,
  };
}
