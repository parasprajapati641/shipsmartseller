import React, { useState } from "react";
import {
  DollarSign,
  TrendingUp,
  Sparkles,
  PieChart,
  ShieldCheck,
  ArrowUpRight,
} from "lucide-react";
import { calculateSmartProfit } from "@/lib/smart-profit-engine";

export function SmartProfitCalculator() {
  const [sellingPrice, setSellingPrice] = useState(699);
  const [costPrice, setCostPrice] = useState(240);
  const [packaging, setPackaging] = useState(25);
  const [shipping, setShipping] = useState(38);
  const [commissionPct, setCommissionPct] = useState(8);
  const [gstPct, setGstPct] = useState(18);
  const [adSpendPct, setAdSpendPct] = useState(5);
  const [returnRatePct, setReturnRatePct] = useState(10);
  const [units, setUnits] = useState(150);

  const profit = calculateSmartProfit({
    sellingPriceINR: sellingPrice,
    costPriceINR: costPrice,
    packagingCostINR: packaging,
    shippingCostINR: shipping,
    commissionPct,
    gstPct,
    adSpendPct,
    returnRatePct,
    monthlyUnits: units,
  });

  return (
    <div className="surface rounded-2xl p-6 space-y-6 text-white border border-[#2A3658] shadow-2xl bg-[#121826]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2A3658] pb-5">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#6C63FF] to-[#00D4AA] text-white font-bold shadow-lg shadow-[#6C63FF]/20">
            <DollarSign className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              AI Seller Profit Engine{" "}
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#00D4AA]/20 text-[#00D4AA] font-extrabold border border-[#00D4AA]/30">
                Dynamic
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Live breakdown of marketplace commission, GST, ad spend & net profit margins
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#00D4AA]/10 px-3 py-1 text-xs font-bold text-[#00D4AA] border border-[#00D4AA]/20">
          <Sparkles className="h-3.5 w-3.5" /> 100% Calculated Live
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sliders & Inputs */}
        <div className="lg:col-span-7 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="text-slate-300 font-semibold">Selling Price (₹)</label>
              <input
                type="number"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(Number(e.target.value))}
                className="mt-1.5 w-full rounded-xl border border-[#2A3658] bg-[#1A2235] px-3.5 py-2 font-bold text-white focus:outline-none focus:border-[#6C63FF]"
              />
            </div>

            <div>
              <label className="text-slate-300 font-semibold">Cost Price / COGS (₹)</label>
              <input
                type="number"
                value={costPrice}
                onChange={(e) => setCostPrice(Number(e.target.value))}
                className="mt-1.5 w-full rounded-xl border border-[#2A3658] bg-[#1A2235] px-3.5 py-2 font-bold text-white focus:outline-none focus:border-[#6C63FF]"
              />
            </div>

            <div>
              <label className="text-slate-300 font-semibold">Packaging & Labeling (₹)</label>
              <input
                type="number"
                value={packaging}
                onChange={(e) => setPackaging(Number(e.target.value))}
                className="mt-1.5 w-full rounded-xl border border-[#2A3658] bg-[#1A2235] px-3.5 py-2 font-semibold text-white focus:outline-none focus:border-[#6C63FF]"
              />
            </div>

            <div>
              <label className="text-slate-300 font-semibold">Shipping Charge (₹)</label>
              <input
                type="number"
                value={shipping}
                onChange={(e) => setShipping(Number(e.target.value))}
                className="mt-1.5 w-full rounded-xl border border-[#2A3658] bg-[#1A2235] px-3.5 py-2 font-semibold text-white focus:outline-none focus:border-[#6C63FF]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2">
            <div>
              <label className="text-slate-400 font-medium">Commission %</label>
              <input
                type="number"
                value={commissionPct}
                onChange={(e) => setCommissionPct(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-[#2A3658] bg-[#1A2235] px-2.5 py-1.5 font-bold text-[#00D4AA]"
              />
            </div>

            <div>
              <label className="text-slate-400 font-medium">GST %</label>
              <input
                type="number"
                value={gstPct}
                onChange={(e) => setGstPct(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-[#2A3658] bg-[#1A2235] px-2.5 py-1.5 font-bold text-[#00D4AA]"
              />
            </div>

            <div>
              <label className="text-slate-400 font-medium">Ad Spend %</label>
              <input
                type="number"
                value={adSpendPct}
                onChange={(e) => setAdSpendPct(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-[#2A3658] bg-[#1A2235] px-2.5 py-1.5 font-bold text-[#00D4AA]"
              />
            </div>

            <div>
              <label className="text-slate-400 font-medium">Return Rate %</label>
              <input
                type="number"
                value={returnRatePct}
                onChange={(e) => setReturnRatePct(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-[#2A3658] bg-[#1A2235] px-2.5 py-1.5 font-bold text-[#00D4AA]"
              />
            </div>
          </div>

          <div className="pt-2">
            <div className="flex justify-between text-xs text-slate-300 font-semibold mb-1">
              <span>Monthly Volume ({units} units/mo)</span>
              <span className="text-slate-400">1,000 units max</span>
            </div>
            <input
              type="range"
              min={10}
              max={1000}
              step={10}
              value={units}
              onChange={(e) => setUnits(Number(e.target.value))}
              className="w-full accent-[#6C63FF] bg-slate-800"
            />
          </div>
        </div>

        {/* Live Calculation Output Panel */}
        <div className="lg:col-span-5 space-y-4 rounded-2xl border border-[#2A3658] bg-[#1A2235]/90 p-5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Live Financial Output
              </span>
              <span className="text-xs font-extrabold text-[#00D4AA] bg-[#00D4AA]/20 px-2.5 py-0.5 rounded-full border border-[#00D4AA]/30">
                {profit.profitMarginPct}% Net Margin
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-[#00D4AA]/30 bg-[#00D4AA]/10 p-3">
                <div className="text-[11px] text-[#00D4AA] font-semibold">Net Profit / Order</div>
                <div className="text-2xl font-extrabold text-[#00D4AA]">₹{profit.netProfitINR}</div>
              </div>

              <div className="rounded-xl border border-[#6C63FF]/30 bg-[#6C63FF]/10 p-3">
                <div className="text-[11px] text-[#6C63FF] font-semibold">
                  Est. Monthly Net Profit
                </div>
                <div className="text-2xl font-extrabold text-[#6C63FF]">
                  ₹{profit.monthlyProfitINR.toLocaleString("en-IN")}
                </div>
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-slate-300 border-t border-[#2A3658] pt-3">
              <div className="flex justify-between">
                <span className="text-slate-400">Gross Profit (before fees):</span>
                <span className="font-bold text-white">₹{profit.grossProfitINR}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Costs & Marketplace Fees:</span>
                <span className="font-bold text-white">₹{profit.totalCostsINR}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Breakeven Selling Price:</span>
                <span className="font-bold text-[#FFB020]">₹{profit.breakevenPriceINR}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Recommended Listing Price:</span>
                <span className="font-bold text-[#00D4AA]">₹{profit.recommendedPriceINR}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#00D4AA]/30 bg-[#00D4AA]/10 p-3 text-xs text-emerald-200 flex items-center gap-2">
            <ArrowUpRight className="h-4 w-4 shrink-0 text-[#00D4AA]" />
            <span>
              Annual profit forecast at current volume:{" "}
              <strong className="text-white">
                ₹{profit.annualProfitINR.toLocaleString("en-IN")}
              </strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
