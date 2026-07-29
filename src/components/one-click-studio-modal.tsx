import React, { useEffect, useState } from "react";
import { X, Layers, Download, Archive, Sparkles, Image as ImageIcon, Loader2 } from "lucide-react";
import { generateOneClickStudioPack, type StudioAssetResult } from "@/lib/one-click-content-studio";
import { createZipArchive, downloadZipFile } from "@/lib/zip-exporter";
import {
  checkGenerationEntitlementFn,
  recordGenerationSuccessFn,
} from "@/lib/subscription-server-actions";

interface OneClickStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceCanvas: HTMLCanvasElement | null;
  filename: string;
  userEmail?: string | null;
  onRequireUpgrade?: () => void;
  onGenerationSuccess?: () => void;
}

export function OneClickStudioModal({
  isOpen,
  onClose,
  sourceCanvas,
  filename,
  userEmail,
  onRequireUpgrade,
  onGenerationSuccess,
}: OneClickStudioModalProps) {
  const [formats, setFormats] = useState<StudioAssetResult[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);

  // Invalidate and revoke all old format URLs whenever sourceCanvas, filename, or isOpen changes
  useEffect(() => {
    if (!isOpen) return;

    // Clear old blob URLs immediately to prevent caching previous image assets
    setFormats((prev) => {
      prev.forEach((f) => URL.revokeObjectURL(f.url));
      return [];
    });

    if (!sourceCanvas) return;

    let isSubscribed = true;

    async function runFormatGeneration() {
      // 1. Validate Entitlement on Server
      try {
        const entitlement = await checkGenerationEntitlementFn({ data: { userEmail } });
        if (!entitlement.allowed) {
          onRequireUpgrade?.();
          onClose();
          return;
        }
      } catch {
        // Fallback
      }

      setIsGenerating(true);
      try {
        const generated = await generateOneClickStudioPack(sourceCanvas!);
        if (isSubscribed && generated && generated.length > 0) {
          setFormats(generated);
          // 2. Record Generation Success on Server strictly after successful generation
          try {
            await recordGenerationSuccessFn({ data: { userEmail } });
            onGenerationSuccess?.();
          } catch (recErr) {
            console.warn("Failed to record One Click Studio generation success:", recErr);
          }
        }
      } catch (err) {
        console.error("One Click Studio format generation failed:", err);
      } finally {
        if (isSubscribed) {
          setIsGenerating(false);
        }
      }
    }

    runFormatGeneration();

    return () => {
      isSubscribed = false;
    };
  }, [sourceCanvas, filename, isOpen, userEmail]);

  if (!isOpen) return null;

  const handleGenerateFormats = async () => {
    if (!sourceCanvas) return;

    try {
      const entitlement = await checkGenerationEntitlementFn({ data: { userEmail } });
      if (!entitlement.allowed) {
        onRequireUpgrade?.();
        onClose();
        return;
      }
    } catch {
      // Fallback
    }

    setIsGenerating(true);
    try {
      setFormats((prev) => {
        prev.forEach((f) => URL.revokeObjectURL(f.url));
        return [];
      });
      const generated = await generateOneClickStudioPack(sourceCanvas);
      if (generated && generated.length > 0) {
        setFormats(generated);
        await recordGenerationSuccessFn({ data: { userEmail } });
        onGenerationSuccess?.();
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadSingle = (item: StudioAssetResult) => {
    const a = document.createElement("a");
    a.href = item.url;
    a.download = `${filename.replace(/\.[^/.]+$/, "")}_${item.key}.jpg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleDownloadAllZip = async () => {
    if (formats.length === 0) return;
    setDownloadingZip(true);
    try {
      const items = await Promise.all(
        formats.map(async (f) => {
          const res = await fetch(f.url);
          const blob = await res.blob();
          return {
            filename: `${f.key}_${f.width}x${f.height}.jpg`,
            blob,
          };
        }),
      );

      const zipBlob = await createZipArchive(items);
      downloadZipFile(zipBlob, `${filename.replace(/\.[^/.]+$/, "")}_all_10_formats.zip`);
    } finally {
      setDownloadingZip(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#090B14]/90 p-4 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[#2A3658] bg-[#121826] p-6 shadow-2xl space-y-6 text-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2A3658] pb-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#6C63FF] to-[#00D4AA] text-white font-bold shadow-lg shadow-[#6C63FF]/20">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                One-Click Content Studio (10 Formats)
              </h2>
              <p className="text-xs text-slate-400">
                Auto-generate marketplace and social media assets directly from your uploaded image.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between bg-[#1A2235] p-4 rounded-xl border border-[#2A3658]">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <ImageIcon className="h-4 w-4 text-[#00D4AA]" /> Source Image:{" "}
            <span className="text-white font-bold truncate max-w-[240px]">{filename}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleGenerateFormats}
              disabled={isGenerating || !sourceCanvas}
              className="inline-flex items-center gap-2 rounded-xl bg-[#2A3658] px-4 py-2 text-xs font-bold text-slate-200 hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              {isGenerating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 text-[#00D4AA]" />
              )}
              Regenerate All 10 Formats
            </button>

            <button
              onClick={handleDownloadAllZip}
              disabled={downloadingZip || formats.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#6C63FF] to-[#00D4AA] px-4 py-2 text-xs font-extrabold text-white shadow-lg shadow-[#6C63FF]/30 hover:opacity-95 disabled:opacity-50 transition-all"
            >
              {downloadingZip ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Archive className="h-3.5 w-3.5" />
              )}
              Download All 10 Formats (ZIP)
            </button>
          </div>
        </div>

        {/* Loading Spinner / Format Cards Grid */}
        {isGenerating && formats.length === 0 ? (
          <div className="py-20 text-center space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-[#6C63FF] mx-auto" />
            <p className="text-sm font-semibold text-slate-300">
              Generating 10 multi-marketplace formats from latest uploaded image...
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {formats.map((item) => (
              <div
                key={item.key}
                className="rounded-xl border border-[#2A3658] bg-[#1A2235] p-3 flex flex-col justify-between space-y-3 group hover:border-[#6C63FF] transition-all"
              >
                <div className="space-y-2">
                  <div className="aspect-square bg-white rounded-lg overflow-hidden relative border border-[#2A3658]">
                    <img src={item.url} alt={item.label} className="w-full h-full object-contain" />
                    <span className="absolute top-1.5 left-1.5 rounded bg-black/80 px-1.5 py-0.5 text-[9px] font-bold text-white uppercase">
                      {item.aspectLabel}
                    </span>
                  </div>

                  <div>
                    <div className="text-xs font-bold text-white truncate">{item.label}</div>
                    <div className="text-[10px] text-slate-400 font-medium truncate">
                      {item.width} × {item.height}px · {item.description}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleDownloadSingle(item)}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#2A3658] bg-[#121826] py-2 text-[11px] font-extrabold text-slate-200 hover:bg-[#6C63FF] hover:text-white transition-all"
                >
                  <Download className="h-3 w-3" /> Download
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
