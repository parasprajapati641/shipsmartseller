import React from "react";
import { Camera, Sun, Crop, Aperture, CheckCircle2, ChevronRight } from "lucide-react";
import { getPhotoDirectorGuidance } from "@/lib/ai-photo-director";
import { PRODUCT_CATEGORIES } from "@/lib/adaptive-learning-store";

interface PhotoDirectorWidgetProps {
  category: string;
  onCategoryChange?: (category: string) => void;
}

export function PhotoDirectorWidget({ category, onCategoryChange }: PhotoDirectorWidgetProps) {
  const guidance = getPhotoDirectorGuidance(category);

  return (
    <div className="surface rounded-2xl p-5 border border-[#2A3658] bg-[#121826] shadow-2xl space-y-4 text-white">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2A3658] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#6C63FF]/20 text-[#6C63FF] border border-[#6C63FF]/30">
            <Camera className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
              AI Product Photo Director <span className="text-[10px] px-2 py-0.5 rounded bg-[#00D4AA]/20 text-[#00D4AA] border border-[#00D4AA]/30">Live Guide</span>
            </h4>
            <p className="text-[11px] text-slate-400">Pre-upload camera setup guidance for {category}</p>
          </div>
        </div>

        {onCategoryChange && (
          <select
            value={category}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="rounded-xl border border-[#2A3658] bg-[#1A2235] px-3 py-1.5 text-xs font-semibold text-white focus:outline-none focus:border-[#6C63FF]"
          >
            {PRODUCT_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div className="rounded-xl border border-[#2A3658] bg-[#1A2235]/90 p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-[#6C63FF] font-semibold">
            <Camera className="h-3.5 w-3.5" /> Camera Angle
          </div>
          <p className="text-white font-bold">{guidance.recommendedAngle}</p>
        </div>

        <div className="rounded-xl border border-[#2A3658] bg-[#1A2235]/90 p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-[#FFB020] font-semibold">
            <Sun className="h-3.5 w-3.5" /> Lighting Setup
          </div>
          <p className="text-white font-bold">{guidance.lightingSetup}</p>
        </div>

        <div className="rounded-xl border border-[#2A3658] bg-[#1A2235]/90 p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-[#00D4AA] font-semibold">
            <Crop className="h-3.5 w-3.5" /> Target Margin
          </div>
          <p className="text-white font-bold">{guidance.framingMarginPct}</p>
        </div>

        <div className="rounded-xl border border-[#2A3658] bg-[#1A2235]/90 p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-indigo-400 font-semibold">
            <Aperture className="h-3.5 w-3.5" /> Recommended Lens
          </div>
          <p className="text-white font-bold">{guidance.lensRecommendation}</p>
        </div>
      </div>
    </div>
  );
}
