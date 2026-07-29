import React, { useState } from "react";
import { X, Smartphone, Sparkles, Trophy, ShoppingBag, Eye, TrendingUp } from "lucide-react";
import type { ConversionSimulationResult } from "@/lib/conversion-simulator";

interface ConversionSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  filename: string;
  targetKB: number;
  simulation: ConversionSimulationResult;
}

export function ConversionSimulatorModal({
  isOpen,
  onClose,
  imageUrl,
  filename,
  targetKB,
  simulation,
}: ConversionSimulatorModalProps) {
  const [showHeatmap, setShowHeatmap] = useState(true);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-6 text-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                AI Mobile Conversion & Visual Feed Simulator
              </h2>
              <p className="text-xs text-slate-500">
                Predictive Marketplace Feed & Heatmap for{" "}
                <span className="font-semibold text-slate-900">{filename}</span> ({targetKB} KB)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Mobile Screen Mockup */}
          <div className="md:col-span-5 flex flex-col items-center">
            <div className="relative w-full max-w-[280px] rounded-[36px] border-4 border-slate-900 bg-slate-900 p-3 shadow-2xl">
              <div className="mx-auto mb-2 h-4 w-24 rounded-full bg-slate-800" />
              <div className="overflow-hidden rounded-[26px] bg-slate-100 p-2 space-y-2">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 px-1">
                  <span>Meesho Feed</span>
                  <span>4G LTE</span>
                </div>

                <div className="relative aspect-square rounded-xl bg-white overflow-hidden border border-slate-200">
                  <img src={imageUrl} alt="Product" className="w-full h-full object-contain" />

                  {showHeatmap && (
                    <div className="absolute inset-0 pointer-events-none opacity-50 bg-gradient-radial from-red-500/60 via-amber-400/40 to-transparent mix-blend-multiply" />
                  )}
                </div>

                <div className="space-y-1 p-1 text-[11px]">
                  <div className="font-bold truncate">Premium Product Package</div>
                  <div className="text-emerald-700 font-extrabold flex items-center justify-between">
                    <span>₹499</span>
                    <span className="text-[9px] bg-emerald-100 px-1.5 py-0.5 rounded text-emerald-800">
                      4.8 ★
                    </span>
                  </div>
                  <button className="w-full rounded-lg bg-pink-600 text-white py-1 font-bold text-[10px]">
                    Buy Now
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowHeatmap(!showHeatmap)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Toggle AI Visual Focus Heatmap
            </button>
          </div>

          {/* Predictive Metrics */}
          <div className="md:col-span-7 space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
                <div className="text-slate-600 font-medium">Estimated CTR %</div>
                <div className="text-2xl font-extrabold text-emerald-700">
                  {simulation.optimizedListingCTR}%
                </div>
              </div>

              <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3">
                <div className="text-slate-600 font-medium">Estimated CTR Boost</div>
                <div className="text-2xl font-extrabold text-blue-700">
                  +{simulation.health.predictedCTRBoostPct}%
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs">
              <div className="font-bold text-slate-900">
                Visual Focus Points (Highest Attention)
              </div>
              <ul className="space-y-1 text-slate-600">
                {simulation.heatmapPoints.map((pt, i) => (
                  <li key={i} className="flex justify-between border-b border-slate-200/60 pb-1">
                    <span>
                      Focus Region #{i + 1} ({Math.round(pt.xPct)}%, {Math.round(pt.yPct)}%)
                    </span>
                    <span className="font-bold text-slate-900">
                      {Math.round(pt.intensity * 100)}% Focus Intensity
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-100 pt-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
          >
            Close Simulator
          </button>
        </div>
      </div>
    </div>
  );
}
