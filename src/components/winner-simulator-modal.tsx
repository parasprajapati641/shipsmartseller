import React, { useState } from "react";
import { X, Trophy, ShoppingBag, Eye, TrendingUp, ShieldCheck, Check } from "lucide-react";
import { scoreAllMarketplaces, type MarketplacePlatformScore } from "@/lib/ai-marketplace-scorer";
import { analyzeCompetitorVariants, type VariantCompetitorAnalysis } from "@/lib/ai-competitor-analyzer";

interface WinnerSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  variants: { targetKB: number; sizeKB: number; url: string; score?: number }[];
  filename: string;
}

export function WinnerSimulatorModal({
  isOpen,
  onClose,
  variants,
  filename,
}: WinnerSimulatorModalProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<
    "Amazon" | "Flipkart" | "Meesho" | "Shopify" | "Ajio" | "Myntra"
  >("Meesho");

  if (!isOpen) return null;

  const platformScores = scoreAllMarketplaces(96, 90, true, 20);
  const competitorAnalysis = analyzeCompetitorVariants(variants);

  const activePlatformInfo = platformScores.find((p) => p.platform === selectedPlatform) ?? platformScores[0];
  const winningVariant = competitorAnalysis.find((c) => c.isWinningVariant) ?? competitorAnalysis[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#090B14]/90 p-4 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[#2A3658] bg-[#121826] p-6 shadow-2xl space-y-6 text-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2A3658] pb-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#FFB020] text-slate-950 font-bold shadow-lg shadow-[#FFB020]/20">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white">AI Marketplace Winner Simulator</h2>
              <p className="text-xs text-slate-400">
                Multi-Platform Search Feed Simulation & CTR Predictor for <span className="text-[#6C63FF] font-semibold">{filename}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Platform Selector Buttons */}
        <div className="flex flex-wrap gap-2 rounded-xl bg-[#1A2235] p-2 border border-[#2A3658]">
          {(["Meesho", "Flipkart", "Amazon", "Shopify", "Ajio", "Myntra"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setSelectedPlatform(p)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                selectedPlatform === p
                  ? "bg-[#6C63FF] text-white shadow-md shadow-[#6C63FF]/30"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Platform Readiness Badge Banner */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#6C63FF]/30 bg-[#6C63FF]/10 p-4">
          <div>
            <div className="text-xs text-[#6C63FF] font-semibold">Readiness Score for {selectedPlatform}</div>
            <div className="text-3xl font-extrabold text-white flex items-baseline gap-2">
              <span>{activePlatformInfo.score} / 100</span>
              <span className="text-xs font-bold text-[#00D4AA] bg-[#00D4AA]/20 px-2 py-0.5 rounded border border-[#00D4AA]/30">
                {activePlatformInfo.status}
              </span>
            </div>
          </div>

          <div className="text-right text-xs space-y-0.5">
            <div className="text-slate-200 font-semibold">{activePlatformInfo.primaryRequirement}</div>
            <div className="text-slate-400">{activePlatformInfo.recommendation}</div>
          </div>
        </div>

        {/* Variant Comparison & Winner Declaration Grid */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Trophy className="h-4 w-4 text-[#FFB020]" /> Variant Search Grid Competitor Ranking
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {competitorAnalysis.map((item, idx) => (
              <div
                key={idx}
                className={`rounded-xl border p-4 transition-all ${
                  item.isWinningVariant
                    ? "border-[#FFB020]/60 bg-[#FFB020]/10 shadow-lg shadow-[#FFB020]/10"
                    : "border-[#2A3658] bg-[#1A2235]"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white">
                    {item.presetKB} KB Preset ({item.fileSizeKB} KB File)
                  </span>

                  {item.isWinningVariant && (
                    <span className="rounded bg-[#FFB020] px-2 py-0.5 text-[9px] font-extrabold text-slate-950">
                      WINNING VARIANT
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs mb-2">
                  <div className="rounded-lg bg-white/5 p-2">
                    <div className="text-slate-400 text-[10px]">Exp. CTR</div>
                    <div className="font-bold text-[#00D4AA]">{item.expectedCTR}%</div>
                  </div>
                  <div className="rounded-lg bg-white/5 p-2">
                    <div className="text-slate-400 text-[10px]">Conversion</div>
                    <div className="font-bold text-[#6C63FF]">{item.expectedConversionPct}%</div>
                  </div>
                  <div className="rounded-lg bg-white/5 p-2">
                    <div className="text-slate-400 text-[10px]">Grid Rank</div>
                    <div className="font-bold text-white">{item.expectedRankTier}</div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-300">{item.reason}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end border-t border-[#2A3658] pt-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-[#2A3658] bg-white/5 px-5 py-2 text-xs font-bold text-slate-300 hover:bg-white/10"
          >
            Close Simulator
          </button>
        </div>
      </div>
    </div>
  );
}
