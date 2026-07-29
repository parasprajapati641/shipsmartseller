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
import { generateAdaptiveVariants, validateImageFile, type OptimizedResult } from "@/lib/image-optimizer";
import { MeeshoComparison } from "@/components/meesho-comparison";
import { PlatformAnalyticsModal } from "@/components/platform-analytics-modal";
import {
  PRODUCT_CATEGORIES,
  loadAllCategoryStats,
  type CategoryStats,
} from "@/lib/adaptive-learning-store";
import {
  runAutonomousOptimizationPipeline,
  calculateDynamicEpsilon,
} from "@/lib/autonomous-optimizer";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Autonomous AI Optimization Platform" },
      { name: "description", content: "Upload and optimize your Meesho product images with autonomous AI strategies." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

type HistoryEntry = {
  id: string;
  filename: string;
  category: string;
  createdAt: number;
  thumb: string;
  variants: { targetKB: number; sizeKB: number; url: string; strategyName?: string }[];
};

const HISTORY_KEY = "ship-smart:history";

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

function loadHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(items: HistoryEntry[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, 20)));
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
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
  const [isAutonomousMode, setIsAutonomousMode] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setHistory(loadHistory());
    setCategoryStats(loadAllCategoryStats());
  }, []);

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
      setFile(f);
      setResults([]);
      setCurrentRound(1);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(f));
    },
    [previewUrl],
  );

  async function handleGenerate(roundToRun: number = 1) {
    if (!file) return;
    setProcessing(true);
    setProgress(0);
    setStatusMessage(`Generating Round ${roundToRun} adaptive variants...`);
    setResults([]);
    setCurrentRound(roundToRun);
    try {
      const out = await generateAdaptiveVariants(file, category, (pct) => {
        setProgress(pct);
      });
      setResults(out);
      toast.success(
        roundToRun === 1
          ? `Generated ${out.length} adaptive strategy variants for ${category}`
          : `Generated ${out.length} Round ${roundToRun} Deep-Optimization variants!`,
      );

      const thumb = await blobToDataUrl(out[out.length - 1].blob);
      const variantData = await Promise.all(
        out.map(async (r) => ({
          targetKB: r.targetKB,
          sizeKB: r.sizeKB,
          strategyName: r.strategy?.name ?? `${r.targetKB}KB Strategy`,
          url: await blobToDataUrl(r.blob),
        })),
      );
      const entry: HistoryEntry = {
        id: crypto.randomUUID(),
        filename: `${file.name} (R${roundToRun})`,
        category,
        createdAt: Date.now(),
        thumb,
        variants: variantData,
      };
      const next = [entry, ...history];
      setHistory(next);
      saveHistory(next);

      setCategoryStats(loadAllCategoryStats());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setProcessing(false);
      setStatusMessage("");
    }
  }

  // Fully Autonomous Multi-Pass Pipeline Trigger
  async function handleAutonomousAutoPilot() {
    if (!file) return;
    setProcessing(true);
    setIsAutonomousMode(true);
    setProgress(5);
    setStatusMessage("Initializing Autonomous Auto-Pilot Pass...");
    setResults([]);

    try {
      const { compareVariantsFn } = await import("@/lib/meesho-actions");

      const outcome = await runAutonomousOptimizationPipeline(
        file,
        category,
        3,
        async (genVariants) => {
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
          const res = await compareVariantsFn({ data: { variants: inputs } });
          const lowestCharge = res?.success
            ? Math.min(...res.variants.map((v) => v.shippingCharge))
            : 49;
          return { success: res?.success ?? true, lowestCharge, variants: res?.variants ?? [] };
        },
        (stepMsg, pct) => {
          setStatusMessage(stepMsg);
          setProgress(pct);
        },
      );

      if (outcome.isRateReduced) {
        toast.success(`Autonomous Auto-Pilot Complete! Achieved ₹${outcome.lowestShippingCharge} rate slab.`);
      } else {
        toast.info(`Autonomous evaluation complete. Best rate slab: ₹${outcome.lowestShippingCharge}.`);
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
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setResults([]);
    setCurrentRound(1);
  }

  async function handleSignOut() {
    await signOut();
    toast.success("Signed out");
    navigate({ to: "/", replace: true });
  }

  function clearHistory() {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
    toast.success("History cleared");
  }

  function removeHistoryEntry(id: string) {
    const next = history.filter((h) => h.id !== id);
    setHistory(next);
    saveHistory(next);
  }

  const currentCatStats = categoryStats[category];
  const activeCategoryObj = PRODUCT_CATEGORIES.find((c) => c.id === category) ?? PRODUCT_CATEGORIES[0];
  const dynamicEpsilon = Math.round(calculateDynamicEpsilon(category) * 100);

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-brand glow">
              <Sparkles className="h-4 w-4 text-brand-foreground" />
            </div>
            <span className="text-lg font-semibold">Ship Smart Autonomous Platform</span>
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                import("@/lib/razorpay-checkout").then(({ openRazorpayCheckout }) => {
                  openRazorpayCheckout({
                    plan: "premium",
                    amountInRupees: 499,
                    userEmail: user?.email,
                  });
                });
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-brand px-3.5 py-1.5 text-xs font-semibold text-brand-foreground hover:opacity-90 transition-opacity glow shadow-sm"
            >
              <Zap className="h-3.5 w-3.5" /> Upgrade to Premium (₹499)
            </button>
            <button
              onClick={() => setShowAnalyticsModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-brand/40 bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand/20 transition-colors"
            >
              <BarChart3 className="h-3.5 w-3.5" /> AI Intelligence Dashboard
            </button>
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1.5">
              <div className="grid h-6 w-6 place-items-center rounded-full bg-gradient-brand">
                <UserIcon className="h-3 w-3 text-brand-foreground" />
              </div>
              <span className="text-xs text-muted-foreground max-w-[180px] truncate">
                {user?.email}
              </span>
            </div>
            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card/60 px-3 py-1.5 text-sm hover:bg-accent"
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
            <div className="inline-flex items-center gap-1.5 rounded-full bg-brand/15 px-3 py-1 text-xs font-semibold text-brand border border-brand/30 mb-2">
              <Bot className="h-3.5 w-3.5" /> Autonomous Multi-Pass Optimization Engine Active
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">Autonomous Product Image Optimizer</h1>
            <p className="mt-1 text-muted-foreground text-sm">
              Select your product category below. ShipSmart dynamically balances exploration ({dynamicEpsilon}%) & exploitation to find the lowest shipping rate slab for your account.
            </p>
          </div>

          {/* Category Selector Pill Row */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-brand" /> Product Category (Scales Dynamic Exploration)
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
                    className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition-all border ${
                      isSelected
                        ? "bg-gradient-brand text-brand-foreground border-transparent glow shadow-md"
                        : "surface hover:border-brand/40 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <IconComponent className="h-3.5 w-3.5" />
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* AI Category Intelligence Summary Banner */}
          {currentCatStats && (
            <div className="rounded-xl surface p-4 border border-brand/20 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand/20 text-brand">
                  <BrainCircuit className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold">Category Model: {activeCategoryObj.label}</div>
                  <div className="text-[11px] text-muted-foreground">
                    Exploration Rate: <span className="text-brand font-semibold">{dynamicEpsilon}%</span> · Top Strategy:{" "}
                    <span className="text-foreground font-medium">
                      {currentCatStats.topStrategyId ? currentCatStats.topStrategyId.replace(/_/g, " ") : "Multi-Armed Bandit Routing"}
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
                  <TrendingDown className="h-3.5 w-3.5" /> Total Category Savings: ₹{currentCatStats.totalSavingsInr}
                </div>
              </div>
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
            <div className="rounded-2xl surface p-6">
              <div className="flex items-start gap-4">
                <img
                  src={previewUrl!}
                  alt="Preview"
                  className="h-24 w-24 rounded-xl object-cover border border-border bg-white"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{file.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB ·{" "}
                        {file.type.replace("image/", "").toUpperCase()} · Category: {activeCategoryObj.label}
                      </div>
                    </div>
                    <button
                      onClick={clearFile}
                      disabled={processing}
                      className="rounded-lg p-2 hover:bg-accent"
                      aria-label="Remove"
                    >
                      <X className="h-4 w-4" />
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
                      <Sparkles className="h-4 w-4" /> Round 1 Variants
                    </button>

                    <button
                      onClick={() => handleGenerate(2)}
                      disabled={processing}
                      className="inline-flex items-center gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-400 hover:bg-amber-500/20"
                    >
                      <Zap className="h-4 w-4" /> Round 2 Deep
                    </button>

                    <button
                      onClick={() => inputRef.current?.click()}
                      disabled={processing}
                      className="inline-flex items-center gap-2 rounded-lg border border-border bg-card/60 px-4 py-2 text-sm font-medium hover:bg-accent"
                    >
                      Replace image
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
                  {processing && (
                    <div className="mt-4 space-y-1.5">
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
              </div>
            </div>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-brand" /> Evaluated Predictive AI Variants ({results.length})
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Variants scored with Win Probability % and AI Confidence. Run shipping comparison to test rates on Meesho.
                  </p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {results.map((r, idx) => (
                  <div
                    key={idx}
                    className={`rounded-xl surface overflow-hidden group border transition-all ${
                      r.recommendation?.isTopRecommendation
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
                          <div className="text-xs font-semibold text-gradient">{r.targetKB} KB Preset ({r.sizeKB} KB File)</div>
                          <div className="text-[10px] text-muted-foreground">
                            Frame Occupancy: {r.debugInfo?.frameOccupancyPct ?? 90}% · {r.width}×{r.height}px
                          </div>
                        </div>
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
                ))}
              </div>
            </div>
          )}

          {/* Meesho Automation Section */}
          <MeeshoComparison
            optimizedVariants={results}
            filename={file?.name}
            category={category}
            currentRound={currentRound}
            onTriggerRound2={() => handleGenerate(2)}
          />
        </div>

        {/* History sidebar */}
        <aside className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <HistoryIcon className="h-4 w-4" /> Optimization History
            </h2>
            {history.length > 0 && (
              <button
                onClick={clearHistory}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear all
              </button>
            )}
          </div>
          {history.length === 0 ? (
            <div className="rounded-xl surface p-6 text-center">
              <div className="mx-auto grid h-10 w-10 place-items-center rounded-lg bg-muted">
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Your adaptive variant history will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((h) => (
                <div key={h.id} className="rounded-xl surface p-3">
                  <div className="flex items-start gap-3">
                    <img
                      src={h.thumb}
                      alt={h.filename}
                      className="h-14 w-14 rounded-lg object-cover border border-border bg-white"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">{h.filename}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {h.category} · {new Date(h.createdAt).toLocaleTimeString()}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {h.variants.map((v, i) => (
                          <button
                            key={i}
                            onClick={() => downloadResult(v.url, v.targetKB, h.filename)}
                            className="rounded-md border border-border bg-background/60 px-1.5 py-0.5 text-[10px] hover:border-brand/50"
                            title={v.strategyName}
                          >
                            {v.targetKB} KB
                          </button>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => removeHistoryEntry(h.id)}
                      className="rounded-md p-1 text-muted-foreground hover:text-foreground"
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
    </div>
  );
}
