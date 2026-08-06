import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import {
  Sparkles,
  ChevronDown,
  Menu,
  X,
  ArrowRight,
  Zap,
  Layers,
  Box,
  Building2,
  RotateCcw,
  BarChart3,
  Link2,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

interface HeaderProps {
  onConnectStore?: () => void;
}

export function Header({ onConnectStore }: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [productsDesktopOpen, setProductsDesktopOpen] = useState(false);
  const [productsMobileOpen, setProductsMobileOpen] = useState(false);
  const { session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Close mobile drawer on route change or ESC
  useEffect(() => {
    setMobileOpen(false);
    setProductsMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileOpen(false);
        setProductsDesktopOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Prevent background scrolling when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const goDashboard = () => navigate({ to: "/dashboard" });
  const goSignIn = () => {
    if (session) navigate({ to: "/dashboard" });
    else navigate({ to: "/auth", search: { mode: "login" } });
  };
  const goStart = () => navigate({ to: "/auth", search: { mode: "signup" } });

  const products = [
    {
      name: "Shipping",
      href: "/#features",
      desc: "AI Image Optimizer & presets for Meesho, Amazon, Flipkart",
      icon: Zap,
      active: location.pathname === "/",
      badge: null,
    },
    {
      name: "ShipSmart OMS",
      href: "/oms",
      desc: "Unified multi-channel order, inventory & logistics engine",
      icon: Layers,
      active: location.pathname === "/oms",
      badge: "NEW",
    },
    {
      name: "Inventory",
      href: "#",
      desc: "Multi-warehouse real-time stock allocation",
      icon: Box,
      comingSoon: true,
    },
    {
      name: "Warehouse",
      href: "#",
      desc: "Smart pick-and-pack & bin routing",
      icon: Building2,
      comingSoon: true,
    },
    {
      name: "Returns",
      href: "#",
      desc: "Automated NDR & reverse pickup workflow",
      icon: RotateCcw,
      comingSoon: true,
    },
    {
      name: "Analytics",
      href: "#",
      desc: "Courier SLA & payout reconciliation BI",
      icon: BarChart3,
      comingSoon: true,
    },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0A1726]/90 backdrop-blur-xl transition-all">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          
          {/* Logo (Left) */}
          <a href="/" className="flex items-center gap-2 shrink-0 group py-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-400 text-slate-950 font-bold shadow-lg shadow-cyan-500/25 group-hover:scale-105 transition-transform">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white group-hover:text-cyan-300 transition-colors">
              ShipSmart <span className="text-cyan-400 font-extrabold">Seller</span>
            </span>
          </a>

          {/* Desktop Navigation (Center - 1200px+) / Tablet Navigation (768px - 1199px) */}
          <nav className="hidden md:flex items-center gap-3 lg:gap-6 xl:gap-8 font-medium">
            <a
              href="/"
              className={`text-xs lg:text-sm whitespace-nowrap transition-colors py-2 ${
                location.pathname === "/" ? "text-cyan-400 font-semibold" : "text-slate-300 hover:text-white"
              }`}
            >
              Home
            </a>

            {/* Desktop Products Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setProductsDesktopOpen(true)}
              onMouseLeave={() => setProductsDesktopOpen(false)}
            >
              <button
                onClick={() => setProductsDesktopOpen((v) => !v)}
                className={`flex items-center gap-1 text-xs lg:text-sm font-semibold whitespace-nowrap transition-colors py-2 ${
                  location.pathname === "/oms" ? "text-cyan-400" : "text-slate-200 hover:text-white"
                }`}
                aria-expanded={productsDesktopOpen}
              >
                <span>Products</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${productsDesktopOpen ? "rotate-180 text-cyan-400" : ""}`} />
              </button>

              {/* Dropdown menu */}
              {productsDesktopOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-80 rounded-2xl border border-slate-700/80 bg-[#0F172A] p-2.5 shadow-2xl backdrop-blur-xl animate-in fade-in duration-150 z-50">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1 mb-1">
                    ShipSmart Product Suite
                  </div>
                  <div className="space-y-1">
                    {products.map((p) => {
                      const IconComp = p.icon;
                      if (p.comingSoon) {
                        return (
                          <div
                            key={p.name}
                            className="flex items-center justify-between rounded-xl p-2.5 text-slate-500 cursor-not-allowed opacity-65"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="p-1.5 rounded-lg bg-slate-800 text-slate-500">
                                <IconComp className="h-4 w-4" />
                              </div>
                              <div>
                                <div className="text-xs font-semibold text-slate-400">{p.name}</div>
                                <div className="text-[10px] text-slate-500">{p.desc}</div>
                              </div>
                            </div>
                            <span className="rounded bg-slate-800/80 text-slate-400 text-[9px] font-bold px-1.5 py-0.5 border border-slate-700">
                              Soon
                            </span>
                          </div>
                        );
                      }
                      return (
                        <a
                          key={p.name}
                          href={p.href}
                          className={`flex items-start gap-2.5 rounded-xl p-2.5 transition-colors ${
                            p.active
                              ? "bg-cyan-500/10 border border-cyan-500/20 text-white"
                              : "hover:bg-slate-800/80 text-slate-300 hover:text-white"
                          }`}
                        >
                          <div className={`p-1.5 rounded-lg shrink-0 ${p.badge ? "bg-cyan-400 text-slate-950" : "bg-cyan-500/10 text-cyan-400"}`}>
                            <IconComp className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold flex items-center justify-between">
                              <span>{p.name}</span>
                              {p.badge && (
                                <span className="rounded bg-cyan-400 text-slate-950 text-[9px] font-extrabold px-1.5 py-0.5 ml-1">
                                  {p.badge}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 line-clamp-1">{p.desc}</div>
                          </div>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <a href="/#features" className="text-xs lg:text-sm text-slate-300 hover:text-white whitespace-nowrap transition-colors py-2">
              Features
            </a>
            <a href="/oms#how" className="text-xs lg:text-sm text-slate-300 hover:text-white whitespace-nowrap transition-colors py-2">
              How It Works
            </a>
            <a href="/oms#pricing" className="text-xs lg:text-sm text-slate-300 hover:text-white whitespace-nowrap transition-colors py-2">
              Pricing
            </a>
            <a href="/oms#faq" className="text-xs lg:text-sm text-slate-300 hover:text-white whitespace-nowrap transition-colors py-2">
              FAQ
            </a>
          </nav>

          {/* Desktop & Tablet Buttons (Right) */}
          <div className="hidden md:flex items-center gap-2 lg:gap-3">
            {/* Secondary CTA (Connect Store) - Visible on lg+ (1024px+) to prevent tablet overcrowding */}
            {onConnectStore && (
              <button
                onClick={onConnectStore}
                className="hidden lg:inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 px-3.5 py-2 text-xs font-bold text-cyan-300 transition-colors whitespace-nowrap"
              >
                <Link2 className="h-3.5 w-3.5" />
                <span>Connect Store</span>
              </button>
            )}

            {session ? (
              <button
                onClick={goDashboard}
                className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-400 px-4 py-2 text-xs lg:text-sm font-extrabold text-slate-950 shadow-lg shadow-cyan-500/25 hover:bg-cyan-300 transition-all hover:scale-[1.02] whitespace-nowrap min-h-[40px]"
              >
                Dashboard <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <>
                <button
                  onClick={goSignIn}
                  className="text-xs lg:text-sm text-slate-300 hover:text-white font-semibold px-2 py-2 whitespace-nowrap"
                >
                  Sign in
                </button>
                <button
                  onClick={goStart}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-400 px-3.5 lg:px-4 py-2 text-xs lg:text-sm font-extrabold text-slate-950 shadow-lg shadow-cyan-500/25 transition-all hover:scale-[1.02] hover:bg-cyan-300 whitespace-nowrap min-h-[40px]"
                >
                  <span>Start Free Trial</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>

          {/* Mobile Right Controls (< 768px): Compact CTA + Hamburger Menu Toggle */}
          <div className="flex md:hidden items-center gap-2">
            {!session && (
              <button
                onClick={goStart}
                className="inline-flex items-center gap-1 rounded-lg bg-cyan-400 px-3 py-1.5 text-xs font-extrabold text-slate-950 shadow-md shadow-cyan-500/20 hover:bg-cyan-300 min-h-[36px]"
              >
                <span>Free Trial</span>
              </button>
            )}

            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="rounded-xl border border-slate-700 bg-slate-800/80 p-2.5 text-slate-200 hover:bg-slate-700 hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Toggle Navigation Menu"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Slide-out Mobile Navigation Drawer (< 768px) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex justify-end">
          {/* Backdrop Blur Overlay */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
            onClick={() => setMobileOpen(false)}
          />

          {/* Slide-in Drawer Container */}
          <div className="relative w-full max-w-xs sm:max-w-sm bg-[#0A1726] border-l border-slate-800 h-full overflow-y-auto p-6 shadow-2xl z-10 flex flex-col justify-between animate-in slide-in-from-right duration-300">
            <div>
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
                <a href="/" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
                  <div className="grid h-8 w-8 place-items-center rounded-xl bg-cyan-400 text-slate-950 font-bold">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <span className="text-base font-bold text-white">ShipSmart Seller</span>
                </a>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Navigation Links */}
              <div className="space-y-1">
                <a
                  href="/"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center min-h-[44px] px-3 rounded-xl text-sm font-semibold text-slate-200 hover:bg-slate-800 hover:text-white"
                >
                  Home
                </a>

                {/* Mobile Products Nested Accordion */}
                <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 overflow-hidden">
                  <button
                    onClick={() => setProductsMobileOpen((v) => !v)}
                    className="w-full flex items-center justify-between min-h-[44px] px-3.5 text-sm font-semibold text-cyan-400 hover:bg-slate-800/60"
                  >
                    <span className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-cyan-400" />
                      Products Menu
                    </span>
                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${productsMobileOpen ? "rotate-180" : ""}`} />
                  </button>

                  {productsMobileOpen && (
                    <div className="p-2 border-t border-slate-800 bg-[#06080F] space-y-1">
                      {products.map((p) => {
                        const IconComp = p.icon;
                        if (p.comingSoon) {
                          return (
                            <div
                              key={p.name}
                              className="flex items-center justify-between p-2.5 rounded-lg text-slate-500 opacity-60 text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <IconComp className="h-3.5 w-3.5" />
                                <span>{p.name}</span>
                              </div>
                              <span className="text-[9px] font-bold text-slate-500 border border-slate-800 rounded px-1.5 py-0.5">
                                Coming Soon
                              </span>
                            </div>
                          );
                        }
                        return (
                          <a
                            key={p.name}
                            href={p.href}
                            onClick={() => setMobileOpen(false)}
                            className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-800 text-xs text-slate-200 hover:text-white font-medium"
                          >
                            <div className="flex items-center gap-2">
                              <IconComp className="h-4 w-4 text-cyan-400" />
                              <span>{p.name}</span>
                            </div>
                            {p.badge && (
                              <span className="rounded bg-cyan-400 text-slate-950 text-[9px] font-extrabold px-1.5 py-0.5">
                                {p.badge}
                              </span>
                            )}
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>

                <a
                  href="/#features"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center min-h-[44px] px-3 rounded-xl text-sm font-semibold text-slate-200 hover:bg-slate-800 hover:text-white"
                >
                  Features
                </a>
                <a
                  href="/oms#how"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center min-h-[44px] px-3 rounded-xl text-sm font-semibold text-slate-200 hover:bg-slate-800 hover:text-white"
                >
                  How It Works
                </a>
                <a
                  href="/oms#pricing"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center min-h-[44px] px-3 rounded-xl text-sm font-semibold text-slate-200 hover:bg-slate-800 hover:text-white"
                >
                  Pricing
                </a>
                <a
                  href="/oms#faq"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center min-h-[44px] px-3 rounded-xl text-sm font-semibold text-slate-200 hover:bg-slate-800 hover:text-white"
                >
                  FAQ
                </a>
              </div>
            </div>

            {/* Mobile Footer CTAs */}
            <div className="pt-6 border-t border-slate-800 space-y-3">
              {onConnectStore && (
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    onConnectStore();
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 py-3 text-sm font-bold min-h-[44px]"
                >
                  <Link2 className="h-4 w-4 text-cyan-400" />
                  Connect Your Store
                </button>
              )}

              {session ? (
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    goDashboard();
                  }}
                  className="w-full rounded-xl bg-cyan-400 py-3 text-sm font-extrabold text-slate-950 shadow-lg shadow-cyan-500/25 hover:bg-cyan-300 min-h-[44px]"
                >
                  Go to Dashboard
                </button>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      goStart();
                    }}
                    className="w-full rounded-xl bg-cyan-400 py-3 text-sm font-extrabold text-slate-950 shadow-lg shadow-cyan-500/25 hover:bg-cyan-300 min-h-[44px]"
                  >
                    Start Free Trial
                  </button>
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      goSignIn();
                    }}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800/80 py-3 text-sm font-bold text-slate-200 hover:bg-slate-700 min-h-[44px]"
                  >
                    Sign In
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
