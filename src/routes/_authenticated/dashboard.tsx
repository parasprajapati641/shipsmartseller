import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Sparkles,
  Upload,
  Loader2,
  Download,
  LogOut,
  ImageIcon,
  X,
  History as HistoryIcon,
  Trash2,
  User as UserIcon,
  Shirt,
  Footprints,
  Gem,
  Home as HomeIcon,
  Sparkles as BeautyIcon,
  Smartphone,
  Package,
  ShoppingBag,
  Baby,
  Dumbbell,
  BrainCircuit,
  TrendingDown,
  Layers,
  Zap,
  BarChart3,
  Bot,
  Play,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  generateAdaptiveVariants,
  validateImageFile,
  type OptimizedResult,
} from "@/lib/image-optimizer";
import { MeeshoComparison } from "@/components/meesho-comparison";
import { PlatformAnalyticsModal } from "@/components/platform-analytics-modal";
import { ConversionSimulatorModal } from "@/components/conversion-simulator-modal";
import {
  analyzeListingConversion,
  type ConversionSimulationResult,
} from "@/lib/conversion-simulator";
import { BeforeAfterSlider } from "@/components/before-after-slider";
import { AIBusinessSuite } from "@/components/ai-business-suite";
import { calculateAIListingScore, type DetailedListingScore } from "@/lib/ai-listing-score";
import { generateVisualHeatmap, type HeatmapAnalysisResult } from "@/lib/ai-heatmap-generator";
import { scoreAllMarketplaces, type MarketplacePlatformScore } from "@/lib/ai-marketplace-scorer";
import { calculatePriceSuggestions, type PriceSuggestionResult } from "@/lib/ai-price-suggester";
import { generateSEOPack, type GeneratedSEOPack } from "@/lib/ai-seo-generator";
import { checkForDuplicate, computePerceptualHash } from "@/lib/ai-duplicate-detector";
import { predictShippingCost, type ShippingPredictionResult } from "@/lib/ai-shipping-predictor";
import { SmartProfitCalculator } from "@/components/smart-profit-calculator";
import { calculateDynamicShipping } from "@/lib/dynamic-shipping-engine";
import { calculateAnalyticsSummary } from "@/lib/smart-analytics-engine";
import { OneClickStudioModal } from "@/components/one-click-studio-modal";
import { PhotoDirectorWidget } from "@/components/photo-director-widget";
import { WinnerSimulatorModal } from "@/components/winner-simulator-modal";
import {
  loadSubscriptionState,
  incrementFreeGenerations,
  type UserSubscriptionState,
} from "@/lib/subscription-store";
import {
  getSubscriptionServerStateFn,
  checkGenerationEntitlementFn,
  recordGenerationSuccessFn,
} from "@/lib/subscription-server-actions";
import { UpgradeModal } from "@/components/upgrade-modal";
import { createZipArchive, downloadZipFile } from "@/lib/zip-exporter";
import {
  PRODUCT_CATEGORIES,
  loadAllCategoryStats,
  type CategoryStats,
} from "@/lib/adaptive-learning-store";
import {
  runAutonomousOptimizationPipeline,
  calculateDynamicEpsilon,
} from "@/lib/autonomous-optimizer";

import {
  type HistoryEntry,
  loadHistoryFromStore,
  saveHistoryEntryToStore,
  removeHistoryEntryFromStore,
  clearHistoryFromStore,
} from "@/lib/history-store";

export const Route = createFileRoute("/_authenticated/dashboard")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Dashboard — Autonomous AI Optimization Platform" },
      {
        name: "description",
        content: "Upload and optimize your Meesho product images with autonomous AI strategies.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

const ICON_MAP = {
  Shirt,
  Footprints,
  Gem,
  Home: HomeIcon,
  Sparkles: BeautyIcon,
  Smartphone,
  ShoppingBag,
  Baby,
  Dumbbell,
  Package,
};

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

function formatExpiryDate(expiresAt: number | null): string {
  if (!expiresAt || typeof expiresAt !== "number") return "30 Days";
  try {
    return new Date(expiresAt).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "30 Days";
  }
}

function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<string>("apparel");
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [results, setResults] = useState<OptimizedResult[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [categoryStats, setCategoryStats] = useState<Record<string, CategoryStats>>({});
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [showSimulatorModal, setShowSimulatorModal] = useState(false);
  const [showStudioModal, setShowStudioModal] = useState(false);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [subState, setSubState] = useState<UserSubscriptionState>(() =>
    loadSubscriptionState(user?.email),
  );

  useEffect(() => {
    setSubState(loadSubscriptionState(user?.email));
    getSubscriptionServerStateFn({ data: { userEmail: user?.email } })
      .then((res) => {
        if (res.success && res.state) {
          setSubState(res.state as any);
        }
      })
      .catch(() => { });
  }, [user?.email]);

  const refreshSubState = useCallback(() => {
    getSubscriptionServerStateFn({ data: { userEmail: user?.email } })
      .then((res) => {
        if (res.success && res.state) {
          setSubState(res.state as any);
        } else {
          setSubState(loadSubscriptionState(user?.email));
        }
      })
      .catch(() => {
        setSubState(loadSubscriptionState(user?.email));
      });
  }, [user?.email]);
  const [simulatorData, setSimulatorData] = useState<{
    url: string;
    targetKB: number;
    result: ConversionSimulationResult;
  } | null>(null);
  const [isAutonomousMode, setIsAutonomousMode] = useState(false);
  const [sourceCanvas, setSourceCanvas] = useState<HTMLCanvasElement | null>(null);
  const [listingScore, setListingScore] = useState<DetailedListingScore | null>(null);
  const [heatmapData, setHeatmapData] = useState<HeatmapAnalysisResult | null>(null);
  const [marketplaceScores, setMarketplaceScores] = useState<MarketplacePlatformScore[]>([]);
  const [priceSuggestions, setPriceSuggestions] = useState<PriceSuggestionResult | null>(null);
  const [seoPack, setSeoPack] = useState<GeneratedSEOPack | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [shippingPrediction, setShippingPrediction] = useState<ShippingPredictionResult | null>(
    null,
  );
  const [historyQuery, setHistoryQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleOpenSimulator(resultItem: OptimizedResult) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const cvs = document.createElement("canvas");
      cvs.width = img.width;
      cvs.height = img.height;
      const ctx = cvs.getContext("2d");
      ctx?.drawImage(img, 0, 0);
      const sim = analyzeListingConversion(cvs, category, resultItem.targetKB);
      setSimulatorData({
        url: resultItem.url,
        targetKB: resultItem.targetKB,
        result: sim,
      });
      setShowSimulatorModal(true);
    };
    img.src = resultItem.url;
  }

  useEffect(() => {
    loadHistoryFromStore(user?.email).then((items) => setHistory(items)).catch(() => { });
    setCategoryStats(loadAllCategoryStats());
  }, [user?.email]);

  const handleGenerationCompleted = useCallback(
    async (payload: {
      generationType: string;
      filename: string;
      category: string;
      thumb: string;
      originalUrl?: string;
      variants: Array<{
        targetKB: number;
        sizeKB: number;
        url: string;
        strategyName?: string;
      }>;
      targetKB?: number;
    }) => {
      const { handleGenerationCompleted: runLifecycle } = await import("@/lib/generation-lifecycle");
      const completionRes = await runLifecycle({
        userEmail: user?.email,
        generationType: payload.generationType,
        filename: payload.filename,
        category: payload.category,
        thumb: payload.thumb,
        originalUrl: payload.originalUrl,
        variants: payload.variants,
        targetKB: payload.targetKB,
      });

      if (completionRes.subState) {
        setSubState(completionRes.subState);
      }
      const updatedHistory = await loadHistoryFromStore(user?.email);
      setHistory(updatedHistory);
      setCategoryStats(loadAllCategoryStats());
      return completionRes;
    },
    [user?.email],
  );

  const handleGenerationSuccess = handleGenerationCompleted;

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      results.forEach((r) => URL.revokeObjectURL(r.url));
    };
  }, []);

  const onFile = useCallback(
    (f: File) => {
      const v = validateImageFile(f);
      if (!v.ok) {
        toast.error(v.error);
        return;
      }

      // Immediately revoke previous blob URLs & reset all image-related states
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      results.forEach((r) => URL.revokeObjectURL(r.url));

      setFile(f);
      setResults([]);
      setCurrentRound(1);
      setSourceCanvas(null);
      setListingScore(null);
      setHeatmapData(null);
      setMarketplaceScores([]);
      setPriceSuggestions(null);
      setSeoPack(null);
      setShippingPrediction(null);
      setDuplicateWarning(null);

      const newUrl = URL.createObjectURL(f);
      setPreviewUrl(newUrl);

      // Run computer vision analysis on image bitmap
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const cvs = document.createElement("canvas");
        cvs.width = img.width;
        cvs.height = img.height;
        const ctx = cvs.getContext("2d");
        ctx?.drawImage(img, 0, 0);
        setSourceCanvas(cvs);

        const score = calculateAIListingScore(cvs, 20);
        setListingScore(score);

        const hData = generateVisualHeatmap(cvs);
        setHeatmapData(hData);

        const mpScores = scoreAllMarketplaces(
          score.metrics.backgroundPurityScore,
          score.metrics.objectFramingScore,
          true,
          20,
        );
        setMarketplaceScores(mpScores);

        const pSug = calculatePriceSuggestions(699, category, score.overallScore);
        setPriceSuggestions(pSug);

        const sPack = generateSEOPack(f.name, category);
        setSeoPack(sPack);

        const dup = checkForDuplicate(cvs, []);
        if (dup.isDuplicate) {
          setDuplicateWarning(dup.warningMessage ?? "Duplicate image detected.");
        } else {
          setDuplicateWarning(null);
        }

        const shipPred = predictShippingCost(20, category);
        setShippingPrediction(shipPred);
      };
      img.src = newUrl;
    },
    [previewUrl, results, category],
  );

  async function handleGenerate(roundToRun: number = 1) {
    if (!file) return;

    // 1. Server-Side Strict Entitlement Check
    try {
      const entitlement = await checkGenerationEntitlementFn({ data: { userEmail: user?.email } });
      if (!entitlement.allowed) {
        toast.info("You have used all 10 free generations. Upgrade to Premium to continue.");
        if (entitlement.state) {
          setSubState(entitlement.state as any);
        }
        setShowUpgradeModal(true);
        return;
      }
      if (entitlement.state) {
        setSubState(entitlement.state as any);
      }
    } catch {
      // Local fallback check
      if (!subState.isUnlimited && subState.remainingGenerations <= 0) {
        toast.info("You have used all 10 free generations. Upgrade to Premium to continue.");
        setShowUpgradeModal(true);
        return;
      }
    }

    setProcessing(true);
    setProgress(0);
    setStatusMessage(`Generating Round ${roundToRun} adaptive variants...`);
    setResults([]);
    setCurrentRound(roundToRun);

    let attempts = 0;
    let success = false;
    let out: OptimizedResult[] = [];

    while (attempts < 3 && !success) {
      attempts++;
      try {
        if (attempts > 1) {
          setStatusMessage(`Retrying variant generation (Attempt ${attempts}/3)...`);
        }
        out = await generateAdaptiveVariants(file, category, (pct) => {
          setProgress(pct);
        });
        if (out && out.length > 0) {
          success = true;
        }
      } catch (err) {
        console.warn(`[SHIP SMART] Optimization attempt ${attempts} failed:`, err);
        await new Promise((r) => setTimeout(r, 400));
      }
    }

    if (success && out.length > 0) {
      setResults(out);
      toast.success(
        roundToRun === 1
          ? `Generated ${out.length} adaptive strategy variants for ${category}`
          : `Generated ${out.length} Round ${roundToRun} Deep-Optimization variants!`,
      );

      try {
        const thumb = await blobToDataUrl(out[out.length - 1].blob);
        const originalUrl = previewUrl ?? (await blobToDataUrl(file));
        const variantData = await Promise.all(
          out.map(async (r) => ({
            targetKB: r.targetKB,
            sizeKB: r.sizeKB,
            strategyName: r.strategy?.name ?? `${r.targetKB}KB Strategy`,
            url: await blobToDataUrl(r.blob),
          })),
        );

        await handleGenerationCompleted({
          generationType: "KB Presets",
          filename: `${file.name} (R${roundToRun})`,
          category,
          thumb,
          originalUrl,
          variants: variantData,
          targetKB: out[0]?.targetKB,
        });
      } catch (histErr) {
        console.warn("Generation completion warning:", histErr);
      }
    } else {
      toast.error("Failed to optimize image after retries. Counter unchanged.");
    }

    setProcessing(false);
    setStatusMessage("");
  }

  // Fully Autonomous Multi-Pass Pipeline Trigger
  async function handleAutonomousAutoPilot() {
    if (!file) return;

    try {
      const entitlement = await checkGenerationEntitlementFn({ data: { userEmail: user?.email } });
      if (!entitlement.allowed) {
        toast.info("You have used all 10 free generations. Upgrade to Premium to continue.");
        if (entitlement.state) {
          setSubState(entitlement.state as any);
        }
        setShowUpgradeModal(true);
        return;
      }
    } catch {
      if (!subState.isUnlimited && subState.remainingGenerations <= 0) {
        toast.info("You have used all 10 free generations. Upgrade to Premium to continue.");
        setShowUpgradeModal(true);
        return;
      }
    }

    setProcessing(true);
    setIsAutonomousMode(true);
    setProgress(5);
    setStatusMessage("Initializing Autonomous Auto-Pilot Pass...");
    setResults([]);

    let capturedVariants: OptimizedResult[] = [];
    try {
      const outcome = await runAutonomousOptimizationPipeline(
        file,
        category,
        3,
        async (genVariants) => {
          capturedVariants = genVariants;
          setResults(genVariants);
          const inputs = await Promise.all(
            genVariants.map(async (v) => ({
              sizeKB: v.targetKB,
              name: `${file.name.replace(/\.[^.]+$/, "")}_${v.targetKB}kb`,
              base64: await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(v.blob);
              }),
            })),
          );

          let res: any = null;
          try {
            const { compareVariantsFn } = await import("@/lib/meesho-actions");
            res = await compareVariantsFn({ data: { variants: inputs } });
          } catch (rpcErr) {
            console.warn(
              "[SHIP SMART] RPC compareVariantsFn fallback to dynamic calculator:",
              rpcErr,
            );
          }

          const lowestCharge =
            res?.success && res?.variants?.length > 0
              ? Math.min(...res.variants.map((v: any) => v.shippingCharge))
              : predictShippingCost(genVariants[0]?.targetKB ?? 20, category).estShippingCostINR;

          return { success: true, lowestCharge, variants: res?.variants ?? [] };
        },
        (stepMsg, pct) => {
          setStatusMessage(stepMsg);
          setProgress(pct);
        },
      );

      const variantsToSave =
        capturedVariants.length > 0
          ? capturedVariants
          : outcome.winningVariant
            ? [outcome.winningVariant]
            : [];

      if (variantsToSave.length > 0) {
        try {
          const thumb = await blobToDataUrl(variantsToSave[variantsToSave.length - 1].blob);
          const originalUrl = previewUrl ?? (await blobToDataUrl(file));
          const variantData = await Promise.all(
            variantsToSave.map(async (r) => ({
              targetKB: r.targetKB,
              sizeKB: r.sizeKB,
              strategyName: r.strategy?.name ?? `${r.targetKB}KB Strategy`,
              url: await blobToDataUrl(r.blob),
            })),
          );

          await handleGenerationCompleted({
            generationType: "AI Auto Pilot",
            filename: `${file.name} (Auto-Pilot)`,
            category,
            thumb,
            originalUrl,
            variants: variantData,
          });
        } catch (histErr) {
          console.warn("Auto-Pilot generation completion warning:", histErr);
        }
      }

      if (outcome.isRateReduced) {
        toast.success(
          `Autonomous Auto-Pilot Complete! Achieved ₹${outcome.lowestShippingCharge} rate slab.`,
        );
      } else {
        toast.info(
          `Autonomous evaluation complete. Best rate slab: ₹${outcome.lowestShippingCharge}.`,
        );
      }

      setCategoryStats(loadAllCategoryStats());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Autonomous auto-pilot failed");
    } finally {
      setProcessing(false);
      setIsAutonomousMode(false);
      setStatusMessage("");
    }
  }

  function downloadResult(url: string, targetKB: number, name = file?.name ?? "image") {
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name.replace(/\.[^/.]+$/, "")}_${targetKB}kb.jpg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function clearFile() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    results.forEach((r) => URL.revokeObjectURL(r.url));
    setFile(null);
    setPreviewUrl(null);
    setResults([]);
    setCurrentRound(1);
    setSourceCanvas(null);
    setListingScore(null);
    setHeatmapData(null);
    setMarketplaceScores([]);
    setPriceSuggestions(null);
    setSeoPack(null);
    setShippingPrediction(null);
    setDuplicateWarning(null);
    if (inputRef.current) inputRef.current.value = "";
    toast.info("Image cleared. Ready to upload a new product photo.");
  }

  async function handleSignOut() {
    await signOut();
    toast.success("Signed out");
    navigate({ to: "/", replace: true });
  }

  async function clearHistory() {
    await clearHistoryFromStore(user?.email);
    setHistory([]);
    toast.success("History cleared");
  }

  async function removeHistoryEntry(id: string) {
    const updated = await removeHistoryEntryFromStore(id, user?.email);
    setHistory(updated);
  }

  const currentCatStats = categoryStats[category];
  const activeCategoryObj =
    PRODUCT_CATEGORIES.find((c) => c.id === category) ?? PRODUCT_CATEGORIES[0];
  const dynamicEpsilon = Math.round(calculateDynamicEpsilon(category) * 100);

  return (
    <div className="min-h-screen bg-[#090B14] text-white">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-[#2A3658] bg-[#121826]/90 backdrop-blur-xl shadow-2xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-[#6C63FF] text-white font-bold shadow-lg shadow-[#6C63FF]/30">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">ShipSmart Seller</span>
          </Link>
          <div className="flex items-center gap-3">
            {/* Free Trial, Premium Active, or Expired Status Badges */}
            {subState.isUnlimited ? (
              <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-2 text-xs font-extrabold text-emerald-400">
                <Zap className="h-3.5 w-3.5 fill-emerald-400 shrink-0" />
                <span>Premium Active</span>
                {subState.expiresAt && (
                  <span className="text-[11px] text-emerald-300 font-semibold border-l border-emerald-500/30 pl-2">
                    Expires: {formatExpiryDate(subState.expiresAt)}
                  </span>
                )}
              </div>
            ) : subState.expiresAt !== null && Date.now() >= subState.expiresAt ? (
              <div className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2 text-xs font-extrabold text-rose-400">
                <X className="h-3.5 w-3.5" /> Your Premium subscription has expired. Renew Premium.
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 rounded-xl border border-[#6C63FF]/40 bg-[#6C63FF]/10 px-3.5 py-2 text-xs font-extrabold text-[#6C63FF]">
                <Sparkles className="h-3.5 w-3.5 text-[#00D4AA]" />
                <span className="text-slate-300 font-medium">Remaining Free Generations:</span>
                <span className="text-white font-extrabold">
                  {subState.remainingGenerations} / 10
                </span>
              </div>
            )}

            {!subState.isUnlimited && (
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#6C63FF] to-[#00D4AA] px-3.5 py-2 text-xs font-extrabold text-white shadow-lg shadow-[#6C63FF]/30 hover:opacity-95 transition-all"
              >
                <Zap className="h-3.5 w-3.5" />{" "}
                {subState.expiresAt !== null ? "Renew Premium Plus" : "Upgrade to Premium Plus"}
              </button>
            )}

            <button
              onClick={() => setShowAnalyticsModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#2A3658] bg-[#1A2235] px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-white/10 transition-colors"
            >
              <BarChart3 className="h-3.5 w-3.5 text-[#00D4AA]" /> AI Intelligence
            </button>
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-[#2A3658] bg-[#1A2235] px-3 py-1.5 text-slate-200">
              <div className="grid h-6 w-6 place-items-center rounded-full bg-[#6C63FF] text-white font-bold">
                <UserIcon className="h-3 w-3" />
              </div>
              <span className="text-xs font-semibold max-w-[180px] truncate">{user?.email}</span>
            </div>
            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#2A3658] bg-[#1A2235] px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Analytics Modal */}
      <PlatformAnalyticsModal
        isOpen={showAnalyticsModal}
        onClose={() => setShowAnalyticsModal(false)}
      />

      <main className="mx-auto max-w-7xl px-6 py-10 grid lg:grid-cols-[1fr_360px] gap-8">
        {/* Main column */}
        <div className="space-y-8">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#6C63FF]/15 px-3 py-1 text-xs font-bold text-[#6C63FF] border border-[#6C63FF]/30 mb-2">
              <Bot className="h-3.5 w-3.5 text-[#00D4AA]" /> Autonomous Multi-Pass Optimization
              Engine Active
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              Autonomous Product Image Optimizer
            </h1>
            <p className="mt-1 text-slate-400 text-sm">
              Select your product category below. ShipSmart dynamically balances exploration (
              {dynamicEpsilon}%) & exploitation to find the lowest shipping rate slab for your
              account.
            </p>
          </div>

          {/* Category Selector Pill Row */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-[#6C63FF]" /> Product Category (Scales Dynamic
              Exploration)
            </label>
            <div className="flex flex-wrap gap-2">
              {PRODUCT_CATEGORIES.map((cat) => {
                const IconComponent = ICON_MAP[cat.icon as keyof typeof ICON_MAP] ?? Package;
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setCategory(cat.id);
                      if (file) setResults([]);
                    }}
                    className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all border ${isSelected
                      ? "bg-[#6C63FF] text-white border-[#6C63FF] shadow-lg shadow-[#6C63FF]/30"
                      : "border-[#2A3658] bg-[#121826] text-slate-300 hover:border-[#6C63FF]/50 hover:text-white"
                      }`}
                  >
                    <IconComponent className="h-3.5 w-3.5" />
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Photo Director Pre-Upload Guidance */}
          <PhotoDirectorWidget category={category} onCategoryChange={(cat) => setCategory(cat)} />

          {/* AI Category Intelligence Summary Banner */}
          {currentCatStats && (
            <div className="rounded-xl surface p-4 border border-brand/20 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand/20 text-brand">
                  <BrainCircuit className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold">
                    Category Model: {activeCategoryObj.label}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Exploration Rate:{" "}
                    <span className="text-brand font-semibold">{dynamicEpsilon}%</span> · Top
                    Strategy:{" "}
                    <span className="text-foreground font-medium">
                      {currentCatStats.topStrategyId
                        ? currentCatStats.topStrategyId.replace(/_/g, " ")
                        : "Multi-Armed Bandit Routing"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowAnalyticsModal(true)}
                  className="text-xs font-medium text-brand hover:underline flex items-center gap-1"
                >
                  <BarChart3 className="h-3.5 w-3.5" /> View Analytics
                </button>
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                  <TrendingDown className="h-3.5 w-3.5" /> Total Category Savings: ₹
                  {currentCatStats.totalSavingsInr}
                </div>
              </div>
            </div>
          )}

          {/* Duplicate Alert Warning */}
          {duplicateWarning && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-300 flex items-center justify-between">
              <span>⚠️ {duplicateWarning}</span>
              <button onClick={() => setDuplicateWarning(null)} className="underline text-white">
                Dismiss
              </button>
            </div>
          )}

          {/* Uploader */}
          {!file ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const f = e.dataTransfer.files?.[0];
                if (f) onFile(f);
              }}
              onClick={() => inputRef.current?.click()}
              className={
                "cursor-pointer rounded-2xl border-2 border-dashed p-16 text-center transition-colors " +
                (dragging
                  ? "border-brand bg-brand/5"
                  : "border-border hover:border-brand/50 hover:bg-accent/30")
              }
            >
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-brand glow">
                <Upload className="h-6 w-6 text-brand-foreground" />
              </div>
              <h3 className="mt-5 text-lg font-semibold">Drag & drop your product image</h3>
              <p className="mt-1 text-sm text-muted-foreground">JPG, PNG, or WEBP · up to 20 MB</p>
              <button
                type="button"
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-gradient-brand px-4 py-2 text-sm font-medium text-brand-foreground"
              >
                Browse files
              </button>
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onFile(f);
                }}
              />
            </div>
          ) : (
            <div className="rounded-2xl surface p-6 space-y-6">
              <div className="flex items-start gap-4">
                <img
                  src={previewUrl!}
                  alt="Preview"
                  className="h-28 w-28 rounded-xl object-cover border border-border bg-white"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{file.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB ·{" "}
                        {file.type.replace("image/", "").toUpperCase()} · Category:{" "}
                        {activeCategoryObj.label}
                      </div>
                    </div>
                    <button
                      onClick={clearFile}
                      disabled={processing}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#FF5C7C]/40 bg-[#FF5C7C]/10 px-3.5 py-2 text-xs font-bold text-[#FF5C7C] hover:bg-[#FF5C7C]/20 transition-all disabled:opacity-50"
                    >
                      <X className="h-3.5 w-3.5" /> Replace Image
                    </button>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {/* Autonomous Auto-Pilot Trigger */}
                    <button
                      onClick={handleAutonomousAutoPilot}
                      disabled={processing}
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2 text-sm font-bold text-black hover:bg-emerald-400 transition-all shadow-md disabled:opacity-60"
                    >
                      {processing && isAutonomousMode ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Autonomous Auto-Pilot...
                        </>
                      ) : (
                        <>
                          <Bot className="h-4 w-4" /> Run Autonomous AI Auto-Pilot
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleGenerate(1)}
                      disabled={processing}
                      className="inline-flex items-center gap-2 rounded-lg bg-gradient-brand px-4 py-2 text-sm font-medium text-brand-foreground disabled:opacity-60"
                    >
                      <Sparkles className="h-4 w-4" /> Generate 5-50KB Presets
                    </button>

                    <button
                      onClick={() => setShowStudioModal(true)}
                      disabled={processing || !sourceCanvas}
                      className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/50 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-300 hover:bg-cyan-500/20"
                    >
                      <Layers className="h-4 w-4" /> One-Click Studio (10 Formats)
                    </button>

                    <button
                      onClick={() => setShowWinnerModal(true)}
                      disabled={processing || results.length === 0}
                      className="inline-flex items-center gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-300 hover:bg-amber-500/20"
                    >
                      <Zap className="h-4 w-4" /> Marketplace Winner Simulator
                    </button>
                  </div>
                </div>
              </div>

              {/* AI Listing Scorecard */}
              {listingScore && (
                <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      AI Computer Vision Quality Scorecard
                    </div>
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
                      Grade {listingScore.grade} ({listingScore.overallScore}/100)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="rounded-lg bg-white/5 p-2.5 space-y-1">
                      <div className="text-slate-400">CTR Score</div>
                      <div className="font-extrabold text-white text-base">
                        {listingScore.ctrScore}/100
                      </div>
                    </div>
                    <div className="rounded-lg bg-white/5 p-2.5 space-y-1">
                      <div className="text-slate-400">Background White Purity</div>
                      <div className="font-extrabold text-emerald-400 text-base">
                        {listingScore.metrics.backgroundPurityScore}%
                      </div>
                    </div>
                    <div className="rounded-lg bg-white/5 p-2.5 space-y-1">
                      <div className="text-slate-400">Object Framing</div>
                      <div className="font-extrabold text-cyan-400 text-base">
                        {listingScore.metrics.objectFramingScore}%
                      </div>
                    </div>
                    <div className="rounded-lg bg-white/5 p-2.5 space-y-1">
                      <div className="text-slate-400">Edge Sharpness</div>
                      <div className="font-extrabold text-amber-400 text-base">
                        {listingScore.metrics.edgeSharpnessScore}/100
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Before / After Slider */}
              {results.length > 0 && previewUrl && (
                <BeforeAfterSlider
                  originalUrl={previewUrl}
                  optimizedUrl={results[0].url}
                  originalSizeKB={Math.round(file.size / 1024)}
                  optimizedSizeKB={results[0].sizeKB}
                  filename={file.name}
                />
              )}

              {processing && (
                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{statusMessage || "Processing autonomous optimization..."}</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-gradient-brand transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-brand" /> Evaluated Predictive AI Variants (
                    {results.length})
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Variants scored with Win Probability % and AI Confidence. Run shipping
                    comparison to test rates on Meesho.
                  </p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {results.map((r, idx) => (
                  <div
                    key={idx}
                    className={`rounded-xl surface overflow-hidden group border transition-all ${r.recommendation?.isTopRecommendation
                      ? "border-brand ring-1 ring-brand/50 shadow-lg shadow-brand/10"
                      : "border-border/70 hover:border-brand/50"
                      }`}
                  >
                    <div className="aspect-square bg-white relative">
                      <img
                        src={r.url}
                        alt={`Variant ${idx + 1}`}
                        className="w-full h-full object-contain"
                      />
                      <span className="absolute top-2 left-2 rounded-md bg-black/75 backdrop-blur-sm px-2 py-0.5 text-[10px] font-semibold text-white">
                        {r.strategy?.name ?? `${r.targetKB}KB`}
                      </span>

                      {r.recommendation?.isTopRecommendation && (
                        <span className="absolute top-2 right-2 rounded-md bg-brand text-brand-foreground px-2 py-0.5 text-[9px] font-bold glow">
                          AI TOP PICK
                        </span>
                      )}

                      {r.recommendation?.winProbabilityPct && (
                        <div className="absolute bottom-2 left-2 rounded-md bg-emerald-950/80 backdrop-blur-sm border border-emerald-500/40 px-2 py-0.5 text-[9px] font-extrabold text-emerald-400">
                          {r.recommendation.winProbabilityPct}% Win Prob
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-semibold text-gradient">
                            {r.targetKB} KB Preset ({r.sizeKB} KB File)
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            Frame Occupancy: {r.debugInfo?.frameOccupancyPct ?? 90}% · {r.width}×
                            {r.height}px
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenSimulator(r)}
                            className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-amber-300 hover:bg-amber-500/20 transition-colors"
                            title="Run AI Mobile Conversion Simulator"
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => downloadResult(r.url, r.targetKB)}
                            className="rounded-lg bg-gradient-brand p-2 text-brand-foreground opacity-80 hover:opacity-100"
                            aria-label={`Download ${r.targetKB} KB`}
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Smart Profit Engine & Financial Calculator */}
          <SmartProfitCalculator />

          {/* Meesho Automation Section */}
          <MeeshoComparison
            optimizedVariants={results}
            filename={file?.name}
            category={category}
            currentRound={currentRound}
            onTriggerRound2={() => handleGenerate(2)}
          />

          {/* AI Profit & Future-Proof Business Intelligence Suite */}
          {/* <AIBusinessSuite /> */}

          {/* Conversion Simulator Modal */}
          {simulatorData && (
            <ConversionSimulatorModal
              isOpen={showSimulatorModal}
              onClose={() => setShowSimulatorModal(false)}
              imageUrl={simulatorData.url}
              filename={file?.name ?? "Product Image"}
              targetKB={simulatorData.targetKB}
              simulation={simulatorData.result}
            />
          )}

          {/* One Click Content Studio Modal */}
          <OneClickStudioModal
            isOpen={showStudioModal}
            onClose={() => setShowStudioModal(false)}
            sourceCanvas={sourceCanvas}
            filename={file?.name ?? "Product Image"}
            userEmail={user?.email}
            onRequireUpgrade={() => setShowUpgradeModal(true)}
            onSuccessfulGeneration={handleGenerationCompleted}
          />

          {/* Marketplace Winner Simulator Modal */}
          <WinnerSimulatorModal
            isOpen={showWinnerModal}
            onClose={() => setShowWinnerModal(false)}
            variants={results}
            filename={file?.name ?? "Product Image"}
          />
        </div>

        {/* History sidebar */}
        <aside className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold text-blue-600">
              <HistoryIcon className="h-4 w-4 text-blue-600" /> Optimization History (
              {history.length})
            </h2>
            {history.length > 0 && (
              <button
                onClick={clearHistory}
                className="text-xs font-semibold text-slate-400 hover:text-red-600"
              >
                Clear all
              </button>
            )}
          </div>

          {history.length > 0 && (
            <input
              type="text"
              placeholder="Search history by filename..."
              value={historyQuery}
              onChange={(e) => setHistoryQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          )}

          {(!Array.isArray(history) || history.length === 0) ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
              <div className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-400">
                <ImageIcon className="h-4 w-4" />
              </div>
              <p className="mt-3 text-xs font-medium text-slate-500">
                Your adaptive variant history will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {(Array.isArray(history) ? history : [])
                .filter((h) => h && typeof h.filename === "string" && h.filename.toLowerCase().includes((historyQuery || "").toLowerCase()))
                .map((h) => (
                  <div
                    key={h.id || Math.random()}
                    className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm space-y-2"
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={h.thumb || ""}
                        alt={h.filename || "Product Image"}
                        className="h-14 w-14 rounded-xl object-cover border border-slate-200 bg-slate-50"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {h.filename || "Product Image"}
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium">
                          {(h.generationType ?? h.category) || "Optimization"} · {h.createdAt ? new Date(h.createdAt).toLocaleTimeString() : ""}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {(Array.isArray(h.variants) ? h.variants : []).map((v, i) => (
                            <button
                              key={i}
                              onClick={() => downloadResult(v.url, v.targetKB, h.filename || "image")}
                              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600"
                              title={v.strategyName || ""}
                            >
                              {v.targetKB} KB
                            </button>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => removeHistoryEntry(h.id)}
                        className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        aria-label="Remove"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </aside>
      </main>

      {/* Free Trial Exhausted Upgrade Popup Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        userEmail={user?.email}
        isExpired={subState.status === "expired" && subState.expiresAt !== null}
        onUpgradeSuccess={() => refreshSubState()}
      />
    </div>
  );
}
