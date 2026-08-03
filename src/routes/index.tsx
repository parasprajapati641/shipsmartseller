import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowRight,
  Check,
  Upload,
  Sparkles,
  Download,
  Image as ImageIcon,
  Zap,
  Shield,
  LayoutGrid,
  History,
  Menu,
  X,
  Twitter,
  Github,
  Linkedin,
} from "lucide-react";
import heroVisual from "@/assets/hero-visual.jpg";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ShipSmart Seller" },
      {
        name: "description",
        content:
          "Cut Meesho & Flipkart shipping charges with AI-optimized product images. Auto-generate white-background 1:1 square marketplace images with 5 KB – 50 KB preset compression.",
      },
      {
        property: "og:title",
        content: "ShipSmart Seller — AI Product Image Optimization Platform",
      },
      {
        property: "og:description",
        content:
          "AI studio background removal, tight framing occupancy, independent 5 KB–50 KB weight presets, and real-time listing conversion simulation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const NAV = [
  { label: "Home", href: "#top" },
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
  { label: "Contact", href: "#contact" },
];

const FEATURES = [
  {
    icon: Zap,
    title: "Instant optimization",
    body: "Drop a photo and get 10 marketplace-ready variants in under 8 seconds, powered by a modular AI pipeline.",
  },
  {
    icon: LayoutGrid,
    title: "Precise size targets",
    body: "Every generation hits exact file sizes from 5 KB up to 50 KB so you always fall under Meesho's shipping thresholds.",
  },
  {
    icon: ImageIcon,
    title: "Studio-clean output",
    body: "Pure white background, correct product padding, perfect square ratio, every image looks like a paid shoot.",
  },
  {
    icon: Shield,
    title: "Quality preserved",
    body: "Perceptual compression keeps edges sharp and colors true, even at aggressive 5 KB targets.",
  },
  {
    icon: History,
    title: "Full history",
    body: "Every upload and variant is saved to your library. Re-download anything, anytime.",
  },
  {
    icon: Sparkles,
    title: "Built for sellers",
    body: "Bulk uploads, priority queue, and a workflow shaped by hundreds of Meesho catalogs.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Upload",
    body: "Drag & drop JPG, PNG, or WEBP up to 20 MB. Batch uploads supported on Premium.",
  },
  {
    n: "02",
    title: "Process",
    body: "Our pipeline removes clutter, centers your product, and renders it on a pure white square.",
  },
  {
    n: "03",
    title: "Download",
    body: "Pick any size from 5 KB to 50 KB. One click to download, always saved to your history.",
  },
];

const SIZES = [5, 10, 13, 15, 20, 25, 30, 35, 40, 50];

const TESTIMONIALS = [
  {
    quote:
      "Our shipping costs dropped 22% in the first month. The images look better than what our old studio was producing.",
    name: "Priya S.",
    role: "Home decor seller, Jaipur",
  },
  {
    quote:
      "I used to spend two hours a day resizing product photos. Now I run a batch and get back to sourcing.",
    name: "Rahul M.",
    role: "Fashion catalog, Surat",
  },
  {
    quote:
      "The 10 KB output looks indistinguishable from the original. Meesho approved every single listing.",
    name: "Anjali K.",
    role: "Kitchen accessories, Delhi",
  },
];

const FAQS = [
  {
    q: "How does Ship Smart reduce Meesho shipping charges?",
    a: "Meesho weighs your listing image size into certain shipping tiers. Delivering perfectly-sized images (5–50 KB) under those thresholds keeps you in the lowest tier without sacrificing catalog quality.",
  },
  {
    q: "Will the compressed images look pixelated?",
    a: "No. We use perceptual compression tuned for product photography, edges stay sharp and colors true, even at 5 KB.",
  },
  {
    q: "What formats do you support?",
    a: "JPG, PNG, and WEBP up to 20 MB per upload. Output is always JPG optimized for marketplace CDNs.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Premium is month-to-month. Cancel from your dashboard and keep access until the end of the billing period.",
  },
  {
    q: "Do you offer bulk uploads?",
    a: "Bulk uploads and priority processing are included with Premium.",
  },
];

function Landing() {
  return (
    <div id="top" className="min-h-screen">
      <Header />
      <Hero />
      <Marquee />
      <Features />
      <HowItWorks />
      <Sizes />
      <Pricing />
      <Testimonials />
      <FAQ />
      <Contact />
      <Footer />
    </div>
  );
}

function useAuthCTA() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  return {
    isAuthed: !!session,
    loading,
    goStart: () => navigate({ to: "/dashboard" }),
    goSignIn: () => {
      if (session) navigate({ to: "/dashboard" });
      else navigate({ to: "/auth", search: { mode: "login" } });
    },
    goDashboard: () => navigate({ to: "/dashboard" }),
  };
}

function Header() {
  const [open, setOpen] = useState(false);
  const { isAuthed, goStart, goSignIn, goDashboard } = useAuthCTA();
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0A1726]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <a href="#top" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-cyan-400 text-slate-950 font-bold shadow-lg shadow-cyan-500/25">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">ShipSmart Seller</span>
        </a>
        <nav className="hidden md:flex items-center gap-8">
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="text-sm text-slate-400 transition-colors hover:text-white font-medium"
            >
              {n.label}
            </a>
          ))}
        </nav>
        <div className="hidden md:flex items-center gap-3">
          {isAuthed ? (
            <button
              onClick={goDashboard}
              className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-400 px-4 py-2 text-sm font-extrabold text-slate-950 shadow-lg shadow-cyan-500/25 hover:bg-cyan-300"
            >
              Dashboard <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <>
              <button
                onClick={goSignIn}
                className="text-sm text-slate-400 hover:text-white font-semibold px-2"
              >
                Sign in
              </button>
              <button
                onClick={goStart}
                className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-400 px-4 py-2 text-sm font-extrabold text-slate-950 shadow-lg shadow-cyan-500/25 transition-transform hover:scale-[1.02] hover:bg-cyan-300"
              >
                Get started <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
        <button
          className="md:hidden rounded-lg p-2 hover:bg-accent"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="md:hidden border-t border-border/60 bg-background/95">
          <div className="mx-auto max-w-7xl px-6 py-4 flex flex-col gap-3">
            {NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {n.label}
              </a>
            ))}
            {isAuthed ? (
              <button
                onClick={() => {
                  setOpen(false);
                  goDashboard();
                }}
                className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-brand px-4 py-2 text-sm font-medium text-brand-foreground"
              >
                Go to Dashboard
              </button>
            ) : (
              <>
                <button
                  onClick={() => {
                    setOpen(false);
                    goSignIn();
                  }}
                  className="text-sm text-left text-muted-foreground hover:text-foreground"
                >
                  Sign in
                </button>
                <button
                  onClick={() => {
                    setOpen(false);
                    goStart();
                  }}
                  className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-brand px-4 py-2 text-sm font-medium text-brand-foreground"
                >
                  Get started
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function Hero() {
  const { goStart, isAuthed } = useAuthCTA();
  return (
    <section className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{ background: "var(--gradient-radial)" }}
      />
      <div className="mx-auto max-w-7xl px-6 pt-24 pb-20 md:pt-32 md:pb-28">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          <div className="animate-fade-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#6C63FF]/40 bg-[#6C63FF]/15 px-3.5 py-1.5 text-xs font-extrabold text-white shadow-lg shadow-[#6C63FF]/20">
              <Sparkles className="h-3.5 w-3.5 text-[#00D4AA]" />
              <span>🎉 30-Day Free Trial</span>
            </div>
            <h1 className="mt-6 text-4xl md:text-6xl lg:text-7xl font-semibold tracking-tight leading-[1.05]">
              Cut shipping costs with{" "}
              <span className="text-gradient font-display italic">perfect</span> product images.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground leading-relaxed">
              Drop a photo. Get 10 marketplace-ready variants with a pure white background, square
              ratio, and precise file sizes from 5 KB to 50 KB. Approved by Meesho, loved by
              sellers.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={goStart}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#6C63FF] to-[#00D4AA] px-6 py-3.5 text-sm font-extrabold text-white transition-transform hover:scale-[1.02] shadow-xl shadow-[#6C63FF]/30 glow"
              >
                {isAuthed ? "Open Dashboard" : "Start Free for 30 Days"}{" "}
                <ArrowRight className="h-4 w-4" />
              </button>
              <a
                href="#how"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card/60 px-5 py-3.5 text-sm font-medium hover:bg-accent"
              >
                See how it works
              </a>
            </div>
            <div className="mt-10 flex flex-wrap gap-6 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-brand" /> 🎉 30-Day Free Trial
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-brand" /> ₹999/mo After Trial
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-brand" /> No Credit Card Required
              </span>
            </div>
          </div>

          <div className="relative animate-fade-up" style={{ animationDelay: "120ms" }}>
            <div className="relative rounded-2xl surface p-2 shadow-elevated">
              <img
                src={heroVisual}
                alt="Optimized product image preview"
                width={1600}
                height={1200}
                className="w-full rounded-xl object-cover"
              />
              <div className="absolute -bottom-6 -left-6 rounded-xl surface p-4 shadow-elevated animate-float">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-brand">
                    <Download className="h-4 w-4 text-brand-foreground" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Downloaded</div>
                    <div className="text-sm font-medium">product_10kb.jpg</div>
                  </div>
                </div>
              </div>
              <div
                className="absolute -top-6 -right-6 rounded-xl surface p-4 shadow-elevated animate-float"
                style={{ animationDelay: "1.5s" }}
              >
                <div className="text-xs text-muted-foreground">Compressed</div>
                <div className="text-lg font-semibold text-gradient">98%</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Marquee() {
  const items = ["Meesho", "Flipkart", "Amazon", "Ajio", "Myntra", "Nykaa", "Snapdeal"];
  return (
    <section className="border-y border-border/60 bg-card/30 py-8">
      <div className="mx-auto max-w-7xl px-6">
        <p className="text-center text-xs uppercase tracking-widest text-muted-foreground">
          Trusted by sellers across every major marketplace
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {items.map((i) => (
            <span key={i} className="text-xl font-semibold tracking-tight text-muted-foreground/70">
              {i}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="features" className="mx-auto max-w-7xl px-6 py-24 md:py-32 scroll-mt-16">
      <div className="max-w-2xl">
        <p className="text-sm font-medium text-gradient">Features</p>
        <h2 className="mt-3 text-3xl md:text-5xl font-semibold tracking-tight">
          Everything a Meesho seller needs.
        </h2>
        <p className="mt-4 text-muted-foreground">
          A focused toolkit built around one job: shipping catalog images that pass every
          marketplace check while keeping you in the lowest shipping tier.
        </p>
      </div>
      <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="group relative rounded-2xl surface p-6 transition-colors hover:border-brand/40"
          >
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-brand">
              <f.icon className="h-5 w-5 text-brand-foreground" />
            </div>
            <h3 className="mt-5 text-lg font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how" className="border-y border-border/60 bg-card/20 scroll-mt-16">
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-gradient">How it works</p>
          <h2 className="mt-3 text-3xl md:text-5xl font-semibold tracking-tight">
            Three steps. Every time.
          </h2>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <div key={s.n} className="relative rounded-2xl surface p-8">
              <div className="font-display text-5xl italic text-gradient">{s.n}</div>
              <div className="mt-6 flex items-center gap-2">
                {i === 0 && <Upload className="h-5 w-5 text-brand" />}
                {i === 1 && <Sparkles className="h-5 w-5 text-brand" />}
                {i === 2 && <Download className="h-5 w-5 text-brand" />}
                <h3 className="text-xl font-semibold">{s.title}</h3>
              </div>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Sizes() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-24 md:py-32">
      <div className="grid gap-12 lg:grid-cols-2 items-center">
        <div>
          <p className="text-sm font-medium text-gradient">Size targets</p>
          <h2 className="mt-3 text-3xl md:text-5xl font-semibold tracking-tight">
            Ten precise sizes. Zero guesswork.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Every upload generates all ten variants in parallel. Pick whichever hits your shipping
            tier and download in a click.
          </p>
        </div>
        <div className="grid grid-cols-5 gap-3">
          {SIZES.map((kb) => (
            <div
              key={kb}
              className="aspect-square rounded-xl surface flex flex-col items-center justify-center transition-transform hover:scale-105 hover:border-brand/50"
            >
              <div className="text-2xl font-semibold text-gradient">{kb}</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
                KB
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// function Pricing() {
//   const { isAuthed, goStart } = useAuthCTA();
//   const navigate = useNavigate();

//   function handlePremium() {
//     if (!isAuthed) {
//       toast.info("Sign in to start your Premium subscription.");
//       navigate({ to: "/auth", search: { mode: "signup" } });
//       return;
//     }
//     toast.info("Stripe checkout coming soon — connect Stripe keys to enable.");
//   }

//   const plans = [
//     {
//       name: "Free",
//       price: "₹0",
//       period: "for 14 days",
//       tagline: "Kick the tires with a 2-week trial.",
//       features: [
//         "Up to 25 generations",
//         "All size targets (5–50 KB)",
//         "Personal history",
//         "Standard processing queue",
//       ],
//       cta: isAuthed ? "Open dashboard" : "Start free trial",
//       onClick: goStart,
//       highlight: false,
//     },
//     {
//       name: "Premium",
//       price: "₹999",
//       period: "per month",
//       tagline: "For serious Meesho sellers.",
//       features: [
//         "Unlimited generations",
//         "Priority processing queue",
//         "Bulk uploads",
//         "Advanced history & tagging",
//         "Priority support",
//       ],
//       cta: "Upgrade to Premium",
//       onClick: handlePremium,
//       highlight: true,
//     },
//   ];

//   return (
//     <section id="pricing" className="border-y border-border/60 bg-card/20 scroll-mt-16">
//       <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
//         <div className="max-w-2xl mx-auto text-center">
//           <p className="text-sm font-medium text-gradient">Pricing</p>
//           <h2 className="mt-3 text-3xl md:text-5xl font-semibold tracking-tight">
//             Simple, honest pricing.
//           </h2>
//           <p className="mt-4 text-muted-foreground">
//             Try free for two weeks. Upgrade when you're ready.
//           </p>
//         </div>
//         <div className="mt-14 grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
//           {plans.map((p) => (
//             <div
//               key={p.name}
//               className={
//                 "relative rounded-2xl p-8 " +
//                 (p.highlight
//                   ? "bg-gradient-brand text-brand-foreground shadow-elevated"
//                   : "surface")
//               }
//             >
//               {p.highlight && (
//                 <div className="absolute -top-3 left-8 rounded-full bg-background px-3 py-1 text-xs font-medium text-foreground border border-border">
//                   Most popular
//                 </div>
//               )}
//               <h3 className="text-xl font-semibold">{p.name}</h3>
//               <p
//                 className={
//                   "mt-1 text-sm " +
//                   (p.highlight ? "text-brand-foreground/80" : "text-muted-foreground")
//                 }
//               >
//                 {p.tagline}
//               </p>
//               <div className="mt-6 flex items-baseline gap-2">
//                 <span className="text-5xl font-semibold tracking-tight">{p.price}</span>
//                 <span
//                   className={
//                     "text-sm " +
//                     (p.highlight ? "text-brand-foreground/80" : "text-muted-foreground")
//                   }
//                 >
//                   {p.period}
//                 </span>
//               </div>
//               <ul className="mt-8 space-y-3">
//                 {p.features.map((f) => (
//                   <li key={f} className="flex items-start gap-3 text-sm">
//                     <Check
//                       className={
//                         "h-4 w-4 mt-0.5 shrink-0 " +
//                         (p.highlight ? "text-brand-foreground" : "text-brand")
//                       }
//                     />
//                     {f}
//                   </li>
//                 ))}
//               </ul>
//               <button
//                 onClick={p.onClick}
//                 className={
//                   "mt-8 w-full rounded-lg px-4 py-3 text-sm font-medium transition-opacity hover:opacity-90 " +
//                   (p.highlight
//                     ? "bg-background text-foreground"
//                     : "bg-gradient-brand text-brand-foreground")
//                 }
//               >
//                 {p.cta}
//               </button>
//             </div>
//           ))}
//         </div>
//       </div>
//     </section>
//   );
// }

function Pricing() {
  const { isAuthed, goStart } = useAuthCTA();
  const { user } = useAuth();
  const navigate = useNavigate();

  // add pricing complonents
  useEffect(() => {
    if (document.getElementById("razorpay-sdk")) return;

    const script = document.createElement("script");
    script.id = "razorpay-sdk";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;

    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handlePayment = async () => {
    if (!isAuthed) {
      toast.info("Sign in to upgrade to Premium Plus.");
      navigate({ to: "/auth", search: { mode: "signup" } });
      return;
    }

    try {
      const { openRazorpayCheckout } = await import("@/lib/razorpay-checkout");
      await openRazorpayCheckout({
        plan: "premium_plus",
        amountInRupees: 999,
        userEmail: user?.email,
        onSuccess: () => {
          navigate({ to: "/dashboard" });
        },
      });
    } catch (err) {
      console.error("[PAYMENT CHECKOUT ERROR]", err);
      toast.error(err instanceof Error ? err.message : "Payment initialization failed.");
    }
  };

  const plans = [
    {
      name: "FREE TRIAL",
      price: "₹0",
      period: "30 Days",
      tagline: "🎉 30-Day Free Trial for every new user.",
      features: [
        "Unlimited Access",
        "All Premium Features",
        "No Credit Card Required",
        "Cancel Anytime",
      ],
      cta: isAuthed ? "Open Dashboard" : "Start Free for 30 Days",
      onClick: goStart,
      highlight: false,
    },
    {
      name: "Premium Plan",
      price: "₹999",
      period: "/ month (After Trial)",
      tagline: "Continued full access to all AI image generation features.",
      features: [
        "Unlimited Access to All Features",
        "Unlimited Autonomous AI Auto-Pilot",
        "Unlimited 5–50KB Presets & Compression",
        "Permanent Cloud History & Backup",
        "Priority Support & Catalog Tools",
      ],
      cta: "Upgrade to Premium Plan (₹999/mo)",
      onClick: handlePayment,
      highlight: true,
    },
  ];

  return (
    <section id="pricing" className="border-y border-[#2A3658] bg-[#090B14] scroll-mt-16">
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-xs font-extrabold uppercase tracking-widest text-[#6C63FF]">
            Transparent Pricing
          </p>
          <h2 className="mt-3 text-3xl md:text-5xl font-extrabold tracking-tight text-white">
            Simple, honest pricing.
          </h2>
          <p className="mt-4 text-sm text-slate-400">
            Sign up for free to explore the interface and upload images. Upgrade to Premium for ₹999/month to unlock all image generation tools.
          </p>
        </div>
        <div className="mt-14 grid gap-8 md:grid-cols-2 max-w-4xl mx-auto items-stretch">
          {plans.map((p) => (
            <div
              key={p.name}
              className={
                "relative rounded-2xl p-8 flex flex-col justify-between h-full border transition-all " +
                (p.highlight
                  ? "border-[#6C63FF] bg-gradient-to-b from-[#121826] to-[#1A2235] text-white shadow-2xl shadow-[#6C63FF]/20 ring-1 ring-[#6C63FF]/50"
                  : "border-[#2A3658] bg-[#121826] text-slate-200")
              }
            >
              <div className="flex-1 flex flex-col justify-between">
                {p.highlight && (
                  <div className="absolute -top-3.5 left-8 rounded-full bg-gradient-to-r from-[#6C63FF] to-[#00D4AA] px-3.5 py-1 text-[11px] font-extrabold text-white shadow-md">
                    ⭐ Most Popular
                  </div>
                )}
                <h3 className="text-2xl font-bold tracking-tight text-white">{p.name}</h3>
                <p className="mt-1.5 text-xs text-slate-400 font-medium">{p.tagline}</p>
                <div className="mt-6 flex items-baseline gap-2 border-b border-[#2A3658] pb-6">
                  <span className="text-5xl font-extrabold tracking-tight text-white">
                    {p.price}
                  </span>
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                    {p.period}
                  </span>
                </div>
                <ul className="mt-6 space-y-3.5">
                  {p.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-3 text-xs font-semibold text-slate-200"
                    >
                      <Check className="h-4 w-4 mt-0.5 shrink-0 text-[#00D4AA]" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 pt-4 border-t border-[#2A3658]/50">
                <button
                  onClick={p.onClick}
                  className={
                    "w-full rounded-xl py-3.5 text-xs font-extrabold transition-all shadow-lg " +
                    (p.highlight
                      ? "bg-gradient-to-r from-[#6C63FF] to-[#00D4AA] text-white hover:opacity-95 shadow-[#6C63FF]/30"
                      : "border border-[#2A3658] bg-[#1A2235] text-slate-200 hover:bg-white/10")
                  }
                >
                  {p.cta}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-24 md:py-32">
      <div className="max-w-2xl">
        <p className="text-sm font-medium text-gradient">Testimonials</p>
        <h2 className="mt-3 text-3xl md:text-5xl font-semibold tracking-tight">
          Sellers ship more. Spend less.
        </h2>
      </div>
      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {TESTIMONIALS.map((t) => (
          <figure key={t.name} className="rounded-2xl surface p-6">
            <blockquote className="text-sm leading-relaxed">"{t.quote}"</blockquote>
            <figcaption className="mt-6 flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-gradient-brand" />
              <div>
                <div className="text-sm font-medium">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.role}</div>
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="border-y border-border/60 bg-card/20 scroll-mt-16">
      <div className="mx-auto max-w-3xl px-6 py-24 md:py-32">
        <div className="text-center">
          <p className="text-sm font-medium text-gradient">FAQ</p>
          <h2 className="mt-3 text-3xl md:text-5xl font-semibold tracking-tight">
            Questions, answered.
          </h2>
        </div>
        <div className="mt-14 space-y-3">
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={f.q} className="rounded-xl surface">
                <button
                  className="w-full flex items-center justify-between gap-4 p-5 text-left"
                  onClick={() => setOpen(isOpen ? null : i)}
                >
                  <span className="font-medium">{f.q}</span>
                  <span
                    className={
                      "text-muted-foreground transition-transform " + (isOpen ? "rotate-45" : "")
                    }
                  >
                    +
                  </span>
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">
                    {f.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Contact() {
  const [sent, setSent] = useState(false);
  return (
    <section id="contact" className="mx-auto max-w-4xl px-6 py-24 md:py-32 scroll-mt-16">
      <div className="rounded-3xl surface p-8 md:p-12 relative overflow-hidden">
        <div
          className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full opacity-40 blur-3xl"
          style={{ background: "var(--gradient-brand)" }}
        />
        <div className="relative">
          <p className="text-sm font-medium text-gradient">Contact</p>
          <h2 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight">
            Talk to the team.
          </h2>
          <p className="mt-3 text-muted-foreground max-w-xl">
            Questions about bulk pricing, integrations, or feature requests? Send a note — we reply
            within one business day.
          </p>
          {sent ? (
            <div className="mt-8 rounded-xl border border-brand/40 bg-brand/10 p-6 text-sm">
              Thanks — we'll get back to you shortly.
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSent(true);
                toast.success("Message sent");
              }}
              className="mt-8 grid gap-4 md:grid-cols-2"
            >
              <input
                required
                maxLength={100}
                placeholder="Name"
                className="rounded-lg border border-input bg-background/60 px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <input
                required
                type="email"
                maxLength={255}
                placeholder="Email"
                className="rounded-lg border border-input bg-background/60 px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <textarea
                required
                maxLength={1000}
                placeholder="How can we help?"
                rows={4}
                className="md:col-span-2 rounded-lg border border-input bg-background/60 px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="submit"
                className="md:col-span-2 justify-self-start inline-flex items-center gap-2 rounded-lg bg-gradient-brand px-5 py-3 text-sm font-medium text-brand-foreground transition-transform hover:scale-[1.02]"
              >
                Send message <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-col md:flex-row justify-between gap-8">
          <div className="max-w-sm">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-brand">
                <Sparkles className="h-4 w-4 text-brand-foreground" />
              </div>
              <span className="text-lg font-semibold">Ship Smart</span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              AI-optimized product images built for Meesho sellers.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 text-sm md:grid-cols-3">
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Product</div>
              <ul className="mt-3 space-y-2">
                <li>
                  <a href="#features" className="hover:text-foreground text-muted-foreground">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="hover:text-foreground text-muted-foreground">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#faq" className="hover:text-foreground text-muted-foreground">
                    FAQ
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Company</div>
              <ul className="mt-3 space-y-2">
                <li>
                  <a href="#contact" className="hover:text-foreground text-muted-foreground">
                    Contact
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground text-muted-foreground">
                    Privacy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground text-muted-foreground">
                    Terms
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Social</div>
              <div className="mt-3 flex gap-3">
                <a href="#" className="text-muted-foreground hover:text-foreground">
                  <Twitter className="h-4 w-4" />
                </a>
                <a href="#" className="text-muted-foreground hover:text-foreground">
                  <Github className="h-4 w-4" />
                </a>
                <a href="#" className="text-muted-foreground hover:text-foreground">
                  <Linkedin className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-border/60 text-xs text-muted-foreground flex justify-between">
          <span>© {new Date().getFullYear()} Ship Smart. All rights reserved.</span>
          <span>Made for Meesho sellers.</span>
        </div>
      </div>
    </footer>
  );
}
