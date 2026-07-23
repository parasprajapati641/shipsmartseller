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
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  optimizeToTarget,
  TARGET_SIZES,
  validateImageFile,
  type OptimizedResult,
} from "@/lib/image-optimizer";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Ship Smart" },
      { name: "description", content: "Upload and optimize your Meesho product images." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

type HistoryEntry = {
  id: string;
  filename: string;
  createdAt: number;
  thumb: string; // data URL preview
  variants: { targetKB: number; sizeKB: number; url: string }[];
};

const HISTORY_KEY = "ship-smart:history";

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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<OptimizedResult[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setHistory(loadHistory()), []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      results.forEach((r) => URL.revokeObjectURL(r.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onFile = useCallback((f: File) => {
    const v = validateImageFile(f);
    if (!v.ok) {
      toast.error(v.error);
      return;
    }
    setFile(f);
    setResults([]);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(f));
  }, [previewUrl]);

  async function handleGenerate() {
    if (!file) return;
    setProcessing(true);
    setProgress(0);
    setResults([]);
    const out: OptimizedResult[] = [];
    try {
      for (let i = 0; i < TARGET_SIZES.length; i++) {
        const kb = TARGET_SIZES[i];
        const r = await optimizeToTarget(file, kb);
        out.push(r);
        setResults([...out]);
        setProgress(Math.round(((i + 1) / TARGET_SIZES.length) * 100));
      }
      toast.success("Generated 10 optimized variants");

      // Save to history
      const thumb = await blobToDataUrl(out[out.length - 1].blob);
      const variantData = await Promise.all(
        out.map(async (r) => ({
          targetKB: r.targetKB,
          sizeKB: r.sizeKB,
          url: await blobToDataUrl(r.blob),
        })),
      );
      const entry: HistoryEntry = {
        id: crypto.randomUUID(),
        filename: file.name,
        createdAt: Date.now(),
        thumb,
        variants: variantData,
      };
      const next = [entry, ...history];
      setHistory(next);
      saveHistory(next);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setProcessing(false);
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

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-brand glow">
              <Sparkles className="h-4 w-4 text-brand-foreground" />
            </div>
            <span className="text-lg font-semibold">Ship Smart</span>
          </Link>
          <div className="flex items-center gap-3">
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

      <main className="mx-auto max-w-7xl px-6 py-10 grid lg:grid-cols-[1fr_360px] gap-8">
        {/* Main column */}
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Optimize a product image
            </h1>
            <p className="mt-1 text-muted-foreground text-sm">
              Drop a photo below. We'll generate 10 marketplace-ready variants — square, white background, and precise file sizes.
            </p>
          </div>

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
              <p className="mt-1 text-sm text-muted-foreground">
                JPG, PNG, or WEBP · up to 20 MB
              </p>
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
                        {(file.size / 1024).toFixed(1)} KB · {file.type.replace("image/", "").toUpperCase()}
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
                    <button
                      onClick={handleGenerate}
                      disabled={processing}
                      className="inline-flex items-center gap-2 rounded-lg bg-gradient-brand px-4 py-2 text-sm font-medium text-brand-foreground disabled:opacity-60"
                    >
                      {processing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Generating… {progress}%
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" /> Generate all sizes
                        </>
                      )}
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
                    <div className="mt-4 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-gradient-brand transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold">Generated variants</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Every variant is square, white-background, and marketplace-ready. Click download to save.
              </p>
              <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {results.map((r) => (
                  <div
                    key={r.targetKB}
                    className="rounded-xl surface overflow-hidden group"
                  >
                    <div className="aspect-square bg-white">
                      <img
                        src={r.url}
                        alt={`${r.targetKB} KB variant`}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold text-gradient">
                            {r.targetKB} KB
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {r.width}×{r.height} · JPG · {r.sizeKB} KB · −{r.compressionPct}%
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
        </div>

        {/* History sidebar */}
        <aside className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <HistoryIcon className="h-4 w-4" /> History
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
                Your generated images will appear here.
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
                        {new Date(h.createdAt).toLocaleString()}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {h.variants.map((v) => (
                          <button
                            key={v.targetKB}
                            onClick={() =>
                              downloadResult(v.url, v.targetKB, h.filename)
                            }
                            className="rounded-md border border-border bg-background/60 px-1.5 py-0.5 text-[10px] hover:border-brand/50"
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
