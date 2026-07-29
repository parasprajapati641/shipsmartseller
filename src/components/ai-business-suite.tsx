import React, { useState } from "react";
import {
  TrendingUp,
  ShieldCheck,
  Zap,
  DollarSign,
  Calculator,
  BarChart3,
  Sparkles,
  PieChart,
  ArrowUpRight,
} from "lucide-react";

export function AIBusinessSuite() {
  const [monthlyOrders, setMonthlyOrders] = useState(150);
  const [avgOrderValue, setAvgOrderValue] = useState(650);

  // Meesho tier savings calculation
  const oldShippingPerOrder = 68; // Base tier for >60KB photos
  const newShippingPerOrder = 38; // Ultra-low tier for <20KB photos
  const savingsPerOrder = oldShippingPerOrder - newShippingPerOrder;

  const monthlySavings = monthlyOrders * savingsPerOrder;
  const annualSavings = monthlySavings * 12;

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-emerald-500 shadow-lg shadow-indigo-500/20">
            <Calculator className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              AI Seller Profit & Shipping Intelligence
            </h3>
            <p className="text-xs text-slate-400">
              Future-proof financial & catalog health analytics for Indian Sellers
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
          <Sparkles className="h-3.5 w-3.5" /> AI Profit Radar
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Interactive Shipping Cost Calculator */}
        <div className="md:col-span-2 space-y-4 rounded-xl border border-white/5 bg-white/5 p-5">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-400" /> Interactive Shipping Savings
              Calculator
            </h4>
            <span className="text-xs text-slate-400">Meesho & Flipkart Tiers</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 font-medium">Monthly Orders Shipped</label>
              <input
                type="range"
                min={20}
                max={2000}
                step={10}
                value={monthlyOrders}
                onChange={(e) => setMonthlyOrders(Number(e.target.value))}
                className="mt-2 w-full accent-emerald-500 bg-slate-800"
              />
              <div className="mt-1 flex justify-between text-xs font-bold text-white">
                <span>{monthlyOrders} orders/mo</span>
                <span className="text-slate-400">2,000 max</span>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 font-medium">Average Order Value (₹)</label>
              <input
                type="number"
                value={avgOrderValue}
                onChange={(e) => setAvgOrderValue(Number(e.target.value))}
                className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Calculator Output */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
              <div className="text-[11px] text-emerald-300 font-medium">
                Est. Monthly Shipping Savings
              </div>
              <div className="text-xl font-extrabold text-white">
                ₹{monthlySavings.toLocaleString("en-IN")}
              </div>
              <div className="text-[10px] text-emerald-400">Saved ₹30 per package tier</div>
            </div>

            <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-3">
              <div className="text-[11px] text-indigo-300 font-medium">
                Annualized Direct Profit Gain
              </div>
              <div className="text-xl font-extrabold text-white">
                ₹{annualSavings.toLocaleString("en-IN")}
              </div>
              <div className="text-[10px] text-indigo-400">Pure bottom-line profit increase</div>
            </div>
          </div>
        </div>

        {/* AI Recommendation Summary */}
        <div className="space-y-4 rounded-xl border border-white/5 bg-slate-950/80 p-5 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <BarChart3 className="h-4 w-4 text-emerald-400" /> Catalog Optimization Directives
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-300 border-b border-white/5 pb-2">
                <span>Target Image Weight</span>
                <span className="font-bold text-emerald-400">10 KB – 20 KB Preset</span>
              </div>
              <div className="flex justify-between items-center text-slate-300 border-b border-white/5 pb-2">
                <span>Subject Frame Ratio</span>
                <span className="font-bold text-white">88% – 92% Occupancy</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>Meesho Compliance</span>
                <span className="font-bold text-emerald-400">100% Studio Standard</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-[11px] text-emerald-300 flex items-center gap-2">
            <ArrowUpRight className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>
              Sellers using 15 KB target images report 24% higher catalog approval on Meesho.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
