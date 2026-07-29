import React, { useState, useRef } from "react";
import { Maximize2, Minimize2, Eye, Sliders, Sparkles } from "lucide-react";

interface BeforeAfterSliderProps {
  originalUrl: string;
  optimizedUrl: string;
  originalSizeKB: number;
  optimizedSizeKB: number;
  filename: string;
}

export function BeforeAfterSlider({
  originalUrl,
  optimizedUrl,
  originalSizeKB,
  optimizedSizeKB,
  filename,
}: BeforeAfterSliderProps) {
  const [sliderPos, setSliderPos] = useState(50); // 0 - 100%
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showDifference, setShowDifference] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    setSliderPos((x / rect.width) * 100);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!containerRef.current || !e.touches[0]) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.touches[0].clientX - rect.left, rect.width));
    setSliderPos((x / rect.width) * 100);
  };

  const savingsPct = Math.round(((originalSizeKB - optimizedSizeKB) / Math.max(1, originalSizeKB)) * 100);

  return (
    <div className={`space-y-4 ${isFullscreen ? "fixed inset-0 z-50 bg-[#090B14]/95 p-6 overflow-y-auto backdrop-blur-xl" : ""}`}>
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#2A3658] bg-[#121826] p-3 text-xs shadow-xl">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white flex items-center gap-1.5">
            <Sliders className="h-4 w-4 text-[#6C63FF]" /> Interactive Split View
          </span>
          <span className="rounded-full bg-[#00D4AA]/20 px-2.5 py-0.5 font-extrabold text-[#00D4AA] border border-[#00D4AA]/30">
            {savingsPct}% Smaller ({optimizedSizeKB} KB vs {originalSizeKB} KB)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDifference(!showDifference)}
            className={`rounded-lg px-2.5 py-1 font-semibold border transition-all ${
              showDifference
                ? "border-[#6C63FF] bg-[#6C63FF]/20 text-white shadow-md shadow-[#6C63FF]/20"
                : "border-[#2A3658] bg-[#1A2235] text-slate-300 hover:text-white"
            }`}
          >
            <Eye className="h-3.5 w-3.5 inline mr-1" />
            {showDifference ? "Normal View" : "Difference Overlay"}
          </button>

          <button
            onClick={() => setZoomLevel(zoomLevel === 1 ? 2.5 : 1)}
            className="rounded-lg border border-[#2A3658] bg-[#1A2235] px-2.5 py-1 font-semibold text-slate-200 hover:bg-white/10"
          >
            {zoomLevel === 1 ? "2.5x Zoom Lens" : "Reset Zoom"}
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="rounded-lg border border-[#2A3658] bg-[#1A2235] p-1.5 text-slate-200 hover:bg-white/10"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Interactive Split Canvas Slider Container */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
        className="relative mx-auto aspect-square w-full max-w-xl select-none overflow-hidden rounded-2xl border border-[#2A3658] bg-[#1A2235] shadow-2xl cursor-col-resize"
      >
        {/* Optimized Image (Background Full View) */}
        <div
          className="absolute inset-0 transition-transform duration-200"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          <img
            src={optimizedUrl}
            alt="Optimized"
            className="h-full w-full object-contain"
            style={{ filter: showDifference ? "invert(1) hue-rotate(180deg)" : "none" }}
          />
          <span className="absolute bottom-3 right-3 rounded-lg bg-[#090B14]/90 px-3 py-1 text-xs font-bold text-[#00D4AA] border border-[#00D4AA]/30 backdrop-blur-md">
            AFTER: {optimizedSizeKB} KB (90% Framing)
          </span>
        </div>

        {/* Original Image (Clipped Left Layer) */}
        <div
          className="absolute inset-0 overflow-hidden border-r-2 border-[#6C63FF] shadow-2xl transition-transform duration-200"
          style={{ width: `${sliderPos}%`, transform: `scale(${zoomLevel})` }}
        >
          <img src={originalUrl} alt="Original" className="h-full w-full object-contain max-w-none" />
          <span className="absolute bottom-3 left-3 rounded-lg bg-[#090B14]/90 px-3 py-1 text-xs font-bold text-slate-300 border border-[#2A3658] backdrop-blur-md">
            BEFORE: {originalSizeKB} KB
          </span>
        </div>

        {/* Split Handle Bar */}
        <div
          className="pointer-events-none absolute top-0 bottom-0 z-10 w-0.5 bg-gradient-to-b from-[#6C63FF] to-[#00D4AA]"
          style={{ left: `${sliderPos}%` }}
        >
          <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 grid h-9 w-9 place-items-center rounded-full bg-[#090B14] text-[#6C63FF] shadow-2xl border-2 border-[#6C63FF]">
            <Sliders className="h-4 w-4 rotate-90" />
          </div>
        </div>
      </div>
    </div>
  );
}
