import React, { useEffect, useState } from "react";
import { X, Layers, Download, Archive, Sparkles, Image as ImageIcon, Loader2 } from "lucide-react";
import { generateOneClickStudioPack, type StudioAssetResult } from "@/lib/one-click-content-studio";
import { createZipArchive, downloadZipFile } from "@/lib/zip-exporter";

interface OneClickStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceCanvas: HTMLCanvasElement | null;
  filename: string;
}

export function OneClickStudioModal({
  isOpen,
  onClose,
  sourceCanvas,
  filename,
}: OneClickStudioModalProps) {
  const [formats, setFormats] = useState<StudioAssetResult[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);

  // Invalidate and revoke all old format URLs whenever sourceCanvas, filename, or isOpen changes
  useEffect(() => {
    if (!isOpen) return;

    // Clear old blob URLs to prevent caching previous image assets
    setFormats((prev) => {
      prev.forEach((f) => URL.revokeObjectURL(f.url));
      return [];
    });

    // Auto-generate fresh 10 formats for the CURRENT sourceCanvas
    if (sourceCanvas) {
      setIsGenerating(true);
      generateOneClickStudioPack(sourceCanvas)
        .then((generated) => {
          setFormats(generated);
        })
        .finally(() => {
          setIsGenerating(false);
        });
    }
  }, [sourceCanvas, filename, isOpen]);

  if (!isOpen) return null;

  const handleGenerateFormats = async () => {
    if (!sourceCanvas) return;
    setIsGenerating(true);
    try {
      setFormats((prev) => {
        prev.forEach((f) => URL.revokeObjectURL(f.url));
        return [];
      });
      const generated = await generateOneClickStudioPack(sourceCanvas);
      setFormats(generated);
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
              <h2 className="text-xl font-bold tracking-tight text-white">
                One-Click Multi-Format Content Studio
              </h2>
              <p className="text-xs text-slate-400">
                Auto-generate 10 marketing & marketplace canvas sizes for{" "}
                <span className="text-[#00D4AA] font-bold">{filename}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#6C63FF]/30 bg-[#6C63FF]/10 p-4">
          <div className="text-xs text-slate-200">
            <strong>10 Formats Generated Live:</strong> Meesho Square, Amazon Main, Flipkart
            Catalog, Instagram Post, Instagram Story, Facebook Marketplace, WhatsApp Product,
            Product Banner, White Background Product, Premium HD Catalog.
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleGenerateFormats}
              disabled={isGenerating || !sourceCanvas}
              className="inline-flex items-center gap-2 rounded-xl bg-[#6C63FF] px-5 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-[#6C63FF]/30 hover:bg-[#5b52e0] disabled:opacity-50"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {isGenerating ? "Generating Fresh Formats..." : "Re-Generate 10 Formats"}
            </button>

            {formats.length > 0 && (
              <button
                onClick={handleDownloadAllZip}
                disabled={downloadingZip}
                className="inline-flex items-center gap-2 rounded-xl bg-[#00D4AA] px-5 py-2.5 text-xs font-extrabold text-[#090B14] shadow-lg shadow-[#00D4AA]/30 hover:bg-[#00b894] disabled:opacity-50"
              >
                {downloadingZip ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Archive className="h-4 w-4" />
                )}
                Download All as ZIP Archive
              </button>
            )}
          </div>
        </div>

        {/* Format Previews Grid */}
        {isGenerating ? (
          <div className="rounded-2xl border-2 border-dashed border-[#2A3658] p-12 text-center text-slate-400 bg-[#1A2235]/50 space-y-3">
            <Loader2 className="mx-auto h-8 w-8 text-[#6C63FF] animate-spin" />
            <p className="text-xs font-semibold text-slate-300">
              Rendering 10 multi-format assets for {filename}...
            </p>
          </div>
        ) : formats.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-[#2A3658] p-12 text-center text-slate-400 bg-[#1A2235]/50">
            <ImageIcon className="mx-auto h-10 w-10 text-[#6C63FF] mb-2" />
            <p className="text-xs font-semibold text-slate-300">
              Click "Re-Generate 10 Formats" to render fresh marketplace layouts.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {formats.map((f) => (
              <div
                key={f.key}
                className="rounded-xl border border-[#2A3658] bg-[#1A2235] overflow-hidden shadow-xl flex flex-col justify-between"
              >
                <div className="aspect-square bg-white relative border-b border-[#2A3658] p-2 flex items-center justify-center">
                  <img src={f.url} alt={f.label} className="max-h-full max-w-full object-contain" />
                </div>

                <div className="p-3 space-y-2">
                  <div>
                    <div className="text-xs font-bold text-white">{f.label}</div>
                    <div className="text-[10px] text-slate-400">
                      {f.width}×{f.height}px · {f.aspectLabel}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDownloadSingle(f)}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#2A3658] bg-white/5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10 hover:text-white"
                  >
                    <Download className="h-3.5 w-3.5" /> Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
