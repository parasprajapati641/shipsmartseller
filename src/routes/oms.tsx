import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  Check,
  Sparkles,
  Zap,
  Shield,
  LayoutGrid,
  RefreshCw,
  MapPin,
  Box,
  FileText,
  Truck,
  RotateCcw,
  CreditCard,
  MessageSquare,
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  Printer,
  ChevronDown,
  ChevronUp,
  Play,
  X,
  ExternalLink,
  Layers,
  ShoppingBag,
  Store,
  Globe,
  Sliders,
  DollarSign,
  ShieldCheck,
  Send,
  Users,
  Building2,
  Calendar,
  Phone,
  Mail,
  CheckSquare,
  Menu,
  Twitter,
  Github,
  Linkedin,
  PackageCheck,
  PackageX,
  PackageSearch,
  ArrowUpRight,
  Link2,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/Header";

export const Route = createFileRoute("/oms")({
  head: () => ({
    meta: [
      { title: "OMS – Order Management System | ShipSmart Seller" },
      {
        name: "description",
        content:
          "Streamline order fulfillment across Meesho, Flipkart, Amazon, Shopify & WooCommerce. Automate multi-channel sync, courier routing, label printing, RTO reduction, and COD reconciliation with ShipSmart OMS.",
      },
      {
        property: "og:title",
        content: "OMS – Order Management System | ShipSmart Seller",
      },
      {
        property: "og:description",
        content:
          "Manage, track & fulfill marketplace orders from one powerful unified dashboard. Reduce RTO and cut order processing time by 85%.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OMSPage,
});

function Footer() {
  return (
    <footer className="border-t border-slate-800/80 bg-[#06080F]">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-col md:flex-row justify-between gap-8">
          <div className="max-w-sm">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-cyan-400 text-slate-950 font-bold shadow-lg shadow-cyan-500/25">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="text-lg font-semibold text-white">ShipSmart Seller</span>
            </div>
            <p className="mt-3 text-sm text-slate-400">
              Unified Order Management System (OMS) & AI image studio built for high-velocity Indian marketplace sellers.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 text-sm md:grid-cols-3">
            <div>
              <div className="text-xs uppercase tracking-widest text-slate-400 font-semibold">Products</div>
              <ul className="mt-3 space-y-2">
                <li>
                  <a href="/oms" className="hover:text-white text-cyan-400 font-medium flex items-center gap-1.5">
                    OMS System
                    <span className="rounded bg-cyan-400/10 text-cyan-400 text-[10px] font-bold px-1.5 py-0.5 border border-cyan-400/20">NEW</span>
                  </a>
                </li>
                <li>
                  <a href="/#features" className="hover:text-white text-slate-400">
                    Image Optimizer
                  </a>
                </li>
                <li>
                  <a href="/#pricing" className="hover:text-white text-slate-400">
                    Pricing Plans
                  </a>
                </li>
                <li>
                  <a href="/#faq" className="hover:text-white text-slate-400">
                    FAQ
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-slate-400 font-semibold">Company</div>
              <ul className="mt-3 space-y-2">
                <li>
                  <a href="/#contact" className="hover:text-white text-slate-400">
                    Contact Sales
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white text-slate-400">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white text-slate-400">
                    Terms of Service
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-slate-400 font-semibold">Social</div>
              <div className="mt-3 flex gap-3">
                <a href="#" className="text-slate-400 hover:text-white transition-colors">
                  <Twitter className="h-4 w-4" />
                </a>
                <a href="#" className="text-slate-400 hover:text-white transition-colors">
                  <Github className="h-4 w-4" />
                </a>
                <a href="#" className="text-slate-400 hover:text-white transition-colors">
                  <Linkedin className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-slate-800/80 text-xs text-slate-500 flex flex-col sm:flex-row justify-between gap-4">
          <span>© {new Date().getFullYear()} ShipSmart Seller. All rights reserved.</span>
          <span>Enterprise Order & Fulfillment Logistics SaaS for India.</span>
        </div>
      </div>
    </footer>
  );
}

function ConnectStoreModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [selectedPlatform, setSelectedPlatform] = useState("Shopify");
  const [storeUrl, setStoreUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);

  if (!isOpen) return null;

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    setIsConnecting(true);
    setTimeout(() => {
      setIsConnecting(false);
      toast.success(`Successfully connected ${selectedPlatform} store! Synchronizing live orders...`);
      onClose();
    }, 1200);
  };

  const platforms = [
    { name: "Shopify", icon: "🛍️", desc: "2-way Webhook & Inventory Sync" },
    { name: "WooCommerce", icon: "🔮", desc: "REST API & Status Push" },
    { name: "Amazon", icon: "📦", desc: "SP-API Merchant & FBA Sync" },
    { name: "Flipkart", icon: "🛒", desc: "Seller Hub Orders & Labels" },
    { name: "Meesho", icon: "💖", desc: "Direct Order & Size Preset Sync" },
    { name: "Magento", icon: "🧱", desc: "Adobe Commerce Connector" },
    { name: "Custom API", icon: "⚡", desc: "GraphQL / REST Webhooks" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl border border-slate-700/80 bg-[#0F172A] p-6 sm:p-8 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-1">
          <Link2 className="h-4 w-4" /> Connect Store to ShipSmart OMS
        </div>
        <h3 className="text-2xl font-extrabold text-white">Integrate Sales Channel</h3>
        <p className="mt-1 text-sm text-slate-400">
          Connect your store in 1-click to automatically sync orders, inventory, labels, and courier routing.
        </p>

        <form onSubmit={handleConnect} className="mt-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">Select Platform</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {platforms.map((p) => (
                <button
                  type="button"
                  key={p.name}
                  onClick={() => setSelectedPlatform(p.name)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                    selectedPlatform === p.name
                      ? "border-cyan-400 bg-cyan-500/10 text-white font-bold shadow-md"
                      : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                  }`}
                >
                  <span className="text-xl">{p.icon}</span>
                  <span className="text-xs">{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              {selectedPlatform === "Custom API" ? "Webhook Endpoint Domain" : `${selectedPlatform} Store URL / Seller ID`}
            </label>
            <input
              type="text"
              required
              placeholder={
                selectedPlatform === "Shopify"
                  ? "my-store.myshopify.com"
                  : selectedPlatform === "Amazon"
                  ? "Seller ID / Merchant Token"
                  : "https://yourstore.com"
              }
              value={storeUrl}
              onChange={(e) => setStoreUrl(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              API Access Token / Secret Key (Optional)
            </label>
            <input
              type="password"
              placeholder="shpat_xxxxxxxxxxxxxxxxxxxx"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 font-mono"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Encrypted with end-to-end AES-256 vault security.
            </p>
          </div>

          <button
            type="submit"
            disabled={isConnecting}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-400 py-3 text-sm font-extrabold text-slate-950 shadow-lg shadow-cyan-500/25 hover:bg-cyan-300 transition-colors disabled:opacity-50"
          >
            {isConnecting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" /> Connecting Store...
              </>
            ) : (
              <>
                Connect {selectedPlatform} Store <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

function DemoModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    ordersPerMonth: "1,000 - 5,000",
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    toast.success("Demo request submitted! Our OMS specialist will reach out within 2 hours.");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-700/80 bg-[#0F172A] p-6 sm:p-8 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {submitted ? (
          <div className="text-center py-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mb-4">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="text-2xl font-bold text-white">Demo Requested!</h3>
            <p className="mt-2 text-sm text-slate-300">
              Thank you, <span className="font-semibold text-cyan-400">{formData.name || "Seller"}</span>. We've received your request for an OMS walkthrough.
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Our e-commerce fulfillment engineer will contact you at <span className="text-slate-200">{formData.phone || formData.email}</span> shortly.
            </p>
            <button
              onClick={() => {
                setSubmitted(false);
                onClose();
              }}
              className="mt-6 w-full rounded-xl bg-cyan-400 py-3 text-sm font-extrabold text-slate-950 hover:bg-cyan-300 transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-1">
              <Sparkles className="h-4 w-4" /> ShipSmart OMS Demo
            </div>
            <h3 className="text-2xl font-bold text-white">Book a Live OMS Walkthrough</h3>
            <p className="mt-1 text-sm text-slate-400">
              See how ShipSmart OMS automates multi-channel order sync, courier routing, and NDR reduction in real time.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rajesh Kumar"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Work Email</label>
                  <input
                    type="email"
                    required
                    placeholder="rajesh@store.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">WhatsApp / Phone</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Monthly Order Volume</label>
                <select
                  value={formData.ordersPerMonth}
                  onChange={(e) => setFormData({ ...formData, ordersPerMonth: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-3.5 py-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                >
                  <option value="Under 500">Under 500 orders/mo</option>
                  <option value="500 - 2,000">500 – 2,000 orders/mo</option>
                  <option value="2,000 - 10,000">2,000 – 10,000 orders/mo</option>
                  <option value="10,000+">10,000+ orders/mo (Enterprise)</option>
                </select>
              </div>

              <button
                type="submit"
                className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-400 py-3 text-sm font-extrabold text-slate-950 shadow-lg shadow-cyan-500/25 hover:bg-cyan-300 transition-colors"
              >
                Schedule Demo <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

function OMSPage() {
  const [demoOpen, setDemoOpen] = useState(false);
  const [connectStoreOpen, setConnectStoreOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "meesho" | "amazon" | "flipkart" | "shopify" | "woocommerce">("all");
  const [activeStep, setActiveStep] = useState(1);
  const [activeChartMetric, setActiveChartMetric] = useState<"orders" | "courier" | "rto">("orders");
  const navigate = useNavigate();

  const handleStartTrial = () => {
    navigate({ to: "/auth", search: { mode: "signup" } });
  };

  // Mock dashboard live items
  const orders = [
    {
      id: "ORD-94821",
      channel: "Meesho",
      channelBg: "bg-pink-500/10 text-pink-400 border-pink-500/20",
      customer: "Ananya Sharma",
      city: "Jaipur, RJ",
      items: "2x Cotton Printed Saree",
      amount: "₹1,499",
      courier: "Delhivery",
      status: "Ready to Dispatch",
      statusBg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      time: "2m ago",
    },
    {
      id: "ORD-94820",
      channel: "Amazon",
      channelBg: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      customer: "Vikram Malhotra",
      city: "Bengaluru, KA",
      items: "1x Wireless Earbuds Pro",
      amount: "₹2,890",
      courier: "BlueDart",
      status: "Label Generated",
      statusBg: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
      time: "5m ago",
    },
    {
      id: "ORD-94819",
      channel: "Flipkart",
      channelBg: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      customer: "Rohit Patel",
      city: "Ahmedabad, GJ",
      items: "3x Slim Fit Casual Shirts",
      amount: "₹2,150",
      courier: "Ekart Express",
      status: "In Transit",
      statusBg: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
      time: "12m ago",
    },
    {
      id: "ORD-94818",
      channel: "Shopify",
      channelBg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      customer: "Pooja Verma",
      city: "New Delhi, DL",
      items: "1x Handcrafted Leather Bag",
      amount: "₹4,200",
      courier: "Shadowfax",
      status: "Delivered",
      statusBg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
      time: "28m ago",
    },
    {
      id: "ORD-94817",
      channel: "WooCommerce",
      channelBg: "bg-purple-500/10 text-purple-400 border-purple-500/20",
      customer: "Suresh Menon",
      city: "Kochi, KL",
      items: "1x Smart Fitness Watch",
      amount: "₹3,499",
      courier: "XpressBees",
      status: "COD Verified",
      statusBg: "bg-teal-500/10 text-teal-400 border-teal-500/20",
      time: "41m ago",
    },
  ];

  const filteredOrders = activeTab === "all" 
    ? orders 
    : orders.filter((o) => o.channel.toLowerCase() === activeTab);

  // 10 Core Features requested
  const features = [
    {
      icon: RefreshCw,
      title: "Multi-Channel Order Sync",
      body: "Instant 2-way synchronization of order statuses, tracking numbers, and buyer cancellations across Meesho, Amazon, Flipkart, Shopify, WooCommerce & Magento.",
      badge: "< 2s Delay",
    },
    {
      icon: LayoutGrid,
      title: "Centralized Order Dashboard",
      body: "Consolidate every order into a single real-time operational dashboard with smart filters, batch actions, and live fulfillment tracking.",
      badge: "Unified Hub",
    },
    {
      icon: Box,
      title: "Inventory Synchronization",
      body: "Automatic stock allocation and multi-warehouse buffer management. Prevents stockouts and overselling across all connected marketplace storefronts.",
      badge: "Zero Stockouts",
    },
    {
      icon: FileText,
      title: "Shipping Label Generation",
      body: "One-click batch generation of marketplace-compliant thermal shipping labels, GST tax invoices, pick lists, and dispatch manifests.",
      badge: "Batch Print",
    },
    {
      icon: Truck,
      title: "Courier Auto Assignment",
      body: "AI routing engine assigns the optimal courier partner (BlueDart, Delhivery, Shadowfax, Ekart, Xpressbees) based on SLA and pincode cost.",
      badge: "Smart AI",
    },
    {
      icon: MapPin,
      title: "Shipment Tracking",
      body: "Milestone-by-milestone tracking visibility from initial pickup scan to final doorstep confirmation with automatic status updates.",
      badge: "Live GPS",
    },
    {
      icon: CreditCard,
      title: "COD Reconciliation",
      body: "Match marketplace payout statements against actual order dispatches. Identify missing COD remittances and courier penalty charges automatically.",
      badge: "100% Audit",
    },
    {
      icon: RotateCcw,
      title: "Returns & RTO Management",
      body: "Automated Non-Delivery Report (NDR) workflows, buyer verification on failed deliveries, and proactive RTO reduction.",
      badge: "Cut RTO 45%",
    },
    {
      icon: MessageSquare,
      title: "Customer Notifications",
      body: "Automated WhatsApp, SMS, and email updates with branded tracking pages, pickup confirmation, and delivery alerts.",
      badge: "WhatsApp API",
    },
    {
      icon: BarChart3,
      title: "Analytics & Reports",
      body: "Deep operational insights into courier partner SLAs, order fulfillment velocity, channel profitability, and regional sales metrics.",
      badge: "Live BI",
    },
  ];

  // Business Seller Flow (4-Step Overview)
  const sellerFlowSteps = [
    {
      num: "01",
      title: "Create ShipSmart Account",
      desc: "Sign up in 30 seconds with email or Google SSO. No credit card required to start your free 30-day trial.",
      icon: Users,
    },
    {
      num: "02",
      title: "Connect eCommerce Store",
      desc: "1-click API integration for Shopify, WooCommerce, Magento, Amazon, Flipkart, Meesho, or Custom REST/GraphQL APIs.",
      icon: Link2,
    },
    {
      num: "03",
      title: "Automatic Order Sync",
      desc: "Live webhooks stream every new order instantly into your central inbox with address validation & fraud checks.",
      icon: RefreshCw,
    },
    {
      num: "04",
      title: "Unified Fulfillment & Analytics",
      desc: "Accept, process, print invoices, batch labels, assign couriers, track shipments, manage RTOs & analyze performance.",
      icon: LayoutGrid,
    },
  ];

  // How It Works Timeline (Exact 9 Steps requested by user)
  const steps = [
    {
      step: 1,
      name: "Customer Places Order",
      desc: "A buyer completes checkout on Shopify, WooCommerce, Amazon, Flipkart, Meesho, or custom storefront.",
      icon: ShoppingBag,
      details: ["Real-time checkout capture", "Payment mode verification (COD / Prepaid)", "Address & phone parsing"],
    },
    {
      step: 2,
      name: "Order Syncs to ShipSmart OMS",
      desc: "Order streams into ShipSmart OMS in under 2 seconds with automatic 2-way stock adjustment across all channels.",
      icon: RefreshCw,
      details: ["Instant API & Webhook streaming", "Pincode serviceability check", "Duplicate order & fraud detection"],
    },
    {
      step: 3,
      name: "Seller Processes Order",
      desc: "Seller reviews and accepts orders in batch or individually from the centralized dashboard.",
      icon: Sliders,
      details: ["Bulk order acceptance", "Inventory allocation buffer", "Custom tag & gift note assignment"],
    },
    {
      step: 4,
      name: "Shipping Label Generated",
      desc: "Generate GST-compliant tax invoices, thermal barcode labels, pick lists, and pack slips in 1 click.",
      icon: Printer,
      details: ["Batch label printing up to 1,000 orders", "A4 & 4x6 Thermal printer format", "Marketplace barcode validation"],
    },
    {
      step: 5,
      name: "Courier Assigned",
      desc: "AI routing engine selects the best courier (Delhivery, BlueDart, Ekart, Shadowfax, XpressBees) by SLA & rate card.",
      icon: Truck,
      details: ["Lowest cost pincode calculation", "Fastest ETA courier recommendation", "Automated AWB number generation"],
    },
    {
      step: 6,
      name: "Shipment Dispatched",
      desc: "Manifest is created, pickup requested, and package handed over to courier first-mile agent.",
      icon: PackageCheck,
      details: ["Digital manifest creation", "Courier pickup agent confirmation scan", "First-mile tracking activation"],
    },
    {
      step: 7,
      name: "Real-Time Tracking",
      desc: "Live GPS & milestone tracking sent to seller dashboard and buyer via branded WhatsApp & SMS.",
      icon: MapPin,
      details: ["Branded tracking URL with live map", "Automated NDR (Non-Delivery) WhatsApp resolution", "Out-for-delivery OTP alert"],
    },
    {
      step: 8,
      name: "Delivered",
      desc: "Package delivered to customer doorstep with digital proof of delivery and POD timestamp.",
      icon: CheckCircle2,
      details: ["Instant delivery status update", "COD cash collection audit", "Post-purchase buyer feedback prompt"],
    },
    {
      step: 9,
      name: "Reports & Analytics Updated",
      desc: "Financial settlement, courier SLA report, channel margin analysis, and inventory velocity auto-updated.",
      icon: BarChart3,
      details: ["Marketplace payout reconciliation", "Courier SLA penalty tracking", "SKU velocity & profit analysis"],
    },
  ];

  // Integrations requested
  const platforms = [
    { name: "Shopify", logo: "🛍️", tag: "Native App", desc: "2-way order & inventory webhooks" },
    { name: "WooCommerce", logo: "🔮", tag: "REST API", desc: "Automatic order status push" },
    { name: "Amazon", logo: "📦", tag: "SP-API", desc: "FBA & Merchant Fulfillment" },
    { name: "Flipkart", logo: "🛒", tag: "Seller Hub", desc: "Priority SLA tracking" },
    { name: "Meesho", logo: "💖", tag: "Direct Sync", desc: "Catalog & size-preset integration" },
    { name: "Magento", logo: "🧱", tag: "Adobe Commerce", desc: "Enterprise multi-store connector" },
    { name: "Custom API", logo: "⚡", tag: "GraphQL / REST", desc: "Open SDKs & Custom Webhooks" },
  ];

  // Revenue model streams
  const revenueStreams = [
    {
      title: "1. Monthly OMS Subscription",
      desc: "Predictable SaaS tier based on monthly order volume (Starter ₹999, Growth ₹2,999, Enterprise Custom).",
      icon: Calendar,
      badge: "SaaS Model",
    },
    {
      title: "2. Per-Order Processing Charges",
      desc: "Scalable fractional per-order fee for high-volume enterprise sellers with volume discounts.",
      icon: DollarSign,
      badge: "Pay-As-You-Grow",
    },
    {
      title: "3. Shipping Label & Courier Services",
      desc: "Integrated courier rate discounts and label generation volume deals with top national carriers.",
      icon: Truck,
      badge: "Logistics Margin",
    },
    {
      title: "4. Premium Analytics & Automation",
      desc: "Add-on modules for automated NDR WhatsApp bot, COD reconciliation audit, and custom ERP connectors.",
      icon: Sparkles,
      badge: "Add-On Value",
    },
  ];

  // Savings breakdown for business
  const savingsReasons = [
    {
      title: "Save 85% Processing Time",
      stat: "85%",
      desc: "Automate manual copy-pasting, invoice printing, and courier selection across multiple seller portals.",
    },
    {
      title: "Slash RTO Losses by 45%",
      stat: "-45%",
      desc: "Automated WhatsApp address verification on COD orders and automated buyer re-attempt confirmation on NDRs.",
    },
    {
      title: "Zero Inventory Overselling",
      stat: "100%",
      desc: "Sub-2s 2-way inventory sync prevents marketplace penalization and out-of-stock order cancellations.",
    },
    {
      title: "Save ~18% on Shipping Costs",
      stat: "18%",
      desc: "AI routing engine dynamically assigns the lowest-cost courier partner for every buyer pincode.",
    },
  ];

  const courierPerformance = [
    { name: "Delhivery", volume: "18,420", onTime: "98.4%", avgCost: "₹42", rating: "4.9/5", color: "bg-cyan-400", width: "98%" },
    { name: "BlueDart", volume: "14,150", onTime: "99.2%", avgCost: "₹58", rating: "4.9/5", color: "bg-blue-400", width: "99%" },
    { name: "Shadowfax", volume: "11,800", onTime: "96.8%", avgCost: "₹38", rating: "4.7/5", color: "bg-emerald-400", width: "96%" },
    { name: "Ekart Express", volume: "9,640", onTime: "97.9%", avgCost: "₹41", rating: "4.8/5", color: "bg-amber-400", width: "97%" },
    { name: "XpressBees", volume: "6,240", onTime: "95.5%", avgCost: "₹36", rating: "4.6/5", color: "bg-purple-400", width: "95%" },
  ];

  const faqs = [
    {
      q: "Is the Order Management System (OMS) included in my ShipSmart plan?",
      a: "Yes! ShipSmart OMS is built directly into all standard ShipSmart plans with zero per-order commission fees or hidden module charges. You get full access to multi-channel sync, batch label printing, and automated courier routing.",
    },
    {
      q: "How long does it take to connect marketplaces like Meesho, Amazon, and Flipkart?",
      a: "Setup takes under 2 minutes. Simply click 'Connect Store' inside your dashboard or header and authorize your seller account via 1-click API connection. Orders start streaming in automatically.",
    },
    {
      q: "Can ShipSmart OMS automatically assign the best courier partner?",
      a: "Yes. Our AI courier allocation engine compares pincode serviceability, past delivery speed, and negotiated shipping rate cards across Delhivery, BlueDart, Shadowfax, Ekart, and Xpressbees to assign the fastest, lowest-cost courier for every shipment.",
    },
    {
      q: "How does OMS help reduce RTO (Return to Origin) for COD orders?",
      a: "OMS triggers automated WhatsApp verification messages to buyers placing COD orders. If a delivery attempt fails (NDR), the system automatically contacts the buyer to capture corrected address details or schedule re-delivery, cutting RTO rates by up to 45%.",
    },
    {
      q: "Can I connect custom storefronts, ERPs, or custom warehouse software?",
      a: "Absolutely. ShipSmart provides open REST and GraphQL APIs with real-time webhooks, allowing seamless connection with custom ERPs, SAP, Tally, Zoho Inventory, or proprietary warehouse management systems.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#090B14] text-slate-100 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <Header onConnectStore={() => setConnectStoreOpen(true)} />
      <ConnectStoreModal isOpen={connectStoreOpen} onClose={() => setConnectStoreOpen(false)} />
      <DemoModal isOpen={demoOpen} onClose={() => setDemoOpen(false)} />

      {/* HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-cyan-500/10 blur-[140px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 right-10 w-[400px] h-[300px] bg-purple-500/10 blur-[130px] rounded-full pointer-events-none" />

        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-xs font-semibold text-cyan-300 backdrop-blur-md mb-6 shadow-lg shadow-cyan-500/10 animate-pulse">
              <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
              <span>NEW PRODUCT: Enterprise Order Management System (OMS)</span>
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl text-white leading-[1.15]">
              Order Management System <span className="text-gradient">(OMS)</span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-slate-300 leading-relaxed font-normal">
              Manage, Track & Fulfill Marketplace Orders from One Unified Dashboard. Connect Shopify, WooCommerce, Amazon, Flipkart, Meesho, Magento & Custom APIs. Sync inventory, automate courier routing, batch print shipping labels, and slash RTO.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={handleStartTrial}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-8 py-3.5 text-base font-extrabold text-slate-950 shadow-xl shadow-cyan-500/25 hover:bg-cyan-300 transition-all hover:scale-[1.02]"
              >
                Start Free Trial <ArrowRight className="h-4 w-4" />
              </button>

              <button
                onClick={() => setDemoOpen(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-xl border border-slate-700 bg-slate-900/80 px-7 py-3.5 text-base font-bold text-white backdrop-blur-md hover:bg-slate-800 hover:border-slate-600 transition-all"
              >
                <Play className="h-4 w-4 fill-cyan-400 text-cyan-400" />
                Book a Demo
              </button>

              <button
                onClick={() => setConnectStoreOpen(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-7 py-3.5 text-base font-bold text-cyan-300 backdrop-blur-md hover:bg-cyan-500/20 transition-all"
              >
                <Link2 className="h-4 w-4 text-cyan-400" />
                Connect Store
              </button>
            </div>

            {/* Quick Metrics Bar */}
            <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 pt-8 border-t border-slate-800/80">
              <div className="text-center p-3 rounded-xl bg-slate-900/40 border border-slate-800/60">
                <div className="text-2xl font-black text-white">99.9%</div>
                <div className="text-xs text-slate-400 font-medium mt-0.5">Order Sync Accuracy</div>
              </div>
              <div className="text-center p-3 rounded-xl bg-slate-900/40 border border-slate-800/60">
                <div className="text-2xl font-black text-cyan-400">10M+</div>
                <div className="text-xs text-slate-400 font-medium mt-0.5">Orders Processed</div>
              </div>
              <div className="text-center p-3 rounded-xl bg-slate-900/40 border border-slate-800/60">
                <div className="text-2xl font-black text-emerald-400">7+</div>
                <div className="text-xs text-slate-400 font-medium mt-0.5">Marketplaces Linked</div>
              </div>
              <div className="text-center p-3 rounded-xl bg-slate-900/40 border border-slate-800/60">
                <div className="text-2xl font-black text-purple-400">-45%</div>
                <div className="text-xs text-slate-400 font-medium mt-0.5">Lower RTO Rate</div>
              </div>
            </div>
          </div>

          {/* DASHBOARD PREVIEW MOCKUP */}
          <div className="mt-14 relative rounded-2xl border border-slate-700/70 bg-[#0F172A]/90 p-4 sm:p-6 shadow-2xl backdrop-blur-xl">
            {/* Window header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-rose-500/80" />
                <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                <span className="ml-3 text-xs font-mono text-slate-400 hidden sm:inline-block">
                  app.shipsmart.io/oms/dashboard
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-400 border border-emerald-500/20">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                  Live Sync Active (7 Channels)
                </span>
              </div>
            </div>

            {/* Comprehensive Stat Cards Grid (Total, Pending, Packed, Shipped, Delivered, Cancelled, RTO, Revenue, Courier SLA, Inventory) */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4 mb-6">
              <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3 sm:p-3.5">
                <div className="flex items-center justify-between text-slate-400 text-[11px] font-medium">
                  <span>Total Orders</span>
                  <ShoppingBag className="h-3.5 w-3.5 text-cyan-400" />
                </div>
                <div className="mt-1.5 flex items-baseline gap-1.5">
                  <span className="text-lg sm:text-xl font-extrabold text-white">1,482</span>
                  <span className="text-[10px] font-bold text-emerald-400">+14%</span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3 sm:p-3.5">
                <div className="flex items-center justify-between text-slate-400 text-[11px] font-medium">
                  <span>Pending Orders</span>
                  <Clock className="h-3.5 w-3.5 text-amber-400" />
                </div>
                <div className="mt-1.5 flex items-baseline gap-1.5">
                  <span className="text-lg sm:text-xl font-extrabold text-amber-300">124</span>
                  <span className="text-[10px] text-slate-400">Needs action</span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3 sm:p-3.5">
                <div className="flex items-center justify-between text-slate-400 text-[11px] font-medium">
                  <span>Packed Orders</span>
                  <PackageCheck className="h-3.5 w-3.5 text-emerald-400" />
                </div>
                <div className="mt-1.5 flex items-baseline gap-1.5">
                  <span className="text-lg sm:text-xl font-extrabold text-emerald-300">310</span>
                  <span className="text-[10px] text-emerald-400 font-medium">Ready pickup</span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3 sm:p-3.5">
                <div className="flex items-center justify-between text-slate-400 text-[11px] font-medium">
                  <span>Shipped Orders</span>
                  <Truck className="h-3.5 w-3.5 text-indigo-400" />
                </div>
                <div className="mt-1.5 flex items-baseline gap-1.5">
                  <span className="text-lg sm:text-xl font-extrabold text-white">842</span>
                  <span className="text-[10px] text-indigo-400">In Transit</span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3 sm:p-3.5">
                <div className="flex items-center justify-between text-slate-400 text-[11px] font-medium">
                  <span>Delivered Orders</span>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                </div>
                <div className="mt-1.5 flex items-baseline gap-1.5">
                  <span className="text-lg sm:text-xl font-extrabold text-emerald-400">18,920</span>
                  <span className="text-[10px] text-emerald-400 font-bold">98.4% POD</span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3 sm:p-3.5">
                <div className="flex items-center justify-between text-slate-400 text-[11px] font-medium">
                  <span>Cancelled Orders</span>
                  <PackageX className="h-3.5 w-3.5 text-rose-400" />
                </div>
                <div className="mt-1.5 flex items-baseline gap-1.5">
                  <span className="text-lg sm:text-xl font-extrabold text-rose-300">12</span>
                  <span className="text-[10px] text-slate-400">0.8% rate</span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3 sm:p-3.5">
                <div className="flex items-center justify-between text-slate-400 text-[11px] font-medium">
                  <span>RTO Orders</span>
                  <RotateCcw className="h-3.5 w-3.5 text-purple-400" />
                </div>
                <div className="mt-1.5 flex items-baseline gap-1.5">
                  <span className="text-lg sm:text-xl font-extrabold text-purple-300">18</span>
                  <span className="text-[10px] text-purple-400 font-bold">-45% lower</span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3 sm:p-3.5">
                <div className="flex items-center justify-between text-slate-400 text-[11px] font-medium">
                  <span>Revenue (Today)</span>
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                </div>
                <div className="mt-1.5 flex items-baseline gap-1.5">
                  <span className="text-lg sm:text-xl font-extrabold text-emerald-400">₹4.85L</span>
                  <span className="text-[10px] text-emerald-400">+22%</span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3 sm:p-3.5">
                <div className="flex items-center justify-between text-slate-400 text-[11px] font-medium">
                  <span>Courier SLA</span>
                  <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
                </div>
                <div className="mt-1.5 flex items-baseline gap-1.5">
                  <span className="text-lg sm:text-xl font-extrabold text-cyan-300">98.4%</span>
                  <span className="text-[10px] text-cyan-400 font-bold">On-time</span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3 sm:p-3.5">
                <div className="flex items-center justify-between text-slate-400 text-[11px] font-medium">
                  <span>Inventory Status</span>
                  <Box className="h-3.5 w-3.5 text-blue-400" />
                </div>
                <div className="mt-1.5 flex items-baseline gap-1.5">
                  <span className="text-lg sm:text-xl font-extrabold text-white">12,450</span>
                  <span className="text-[10px] text-emerald-400 font-medium">SKUs synced</span>
                </div>
              </div>
            </div>

            {/* Filter Tabs & Quick Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                {(["all", "meesho", "amazon", "flipkart", "shopify", "woocommerce"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition-colors ${
                      activeTab === tab
                        ? "bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20"
                        : "text-slate-400 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    {tab === "all" ? "All Channels (7)" : tab}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => toast.info("Simulated: Synced 7 store integrations in 1.1 seconds!")}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-cyan-400" /> Sync Stores
                </button>
                <button
                  onClick={() => toast.success("Batch shipping labels printed for 24 packed orders!")}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/30 px-3 py-1.5 text-xs font-bold transition-colors"
                >
                  <Printer className="h-3.5 w-3.5" /> Batch Print Labels
                </button>
              </div>
            </div>

            {/* Live Orders Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-3">Order ID</th>
                    <th className="py-3 px-3">Channel</th>
                    <th className="py-3 px-3">Customer & Location</th>
                    <th className="py-3 px-3">Items</th>
                    <th className="py-3 px-3">Amount</th>
                    <th className="py-3 px-3">Courier Partner</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-white">{o.id}</td>
                      <td className="py-3 px-3">
                        <span className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-bold border ${o.channelBg}`}>
                          {o.channel}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-200">{o.customer}</div>
                        <div className="text-[11px] text-slate-400">{o.city}</div>
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-300">{o.items}</td>
                      <td className="py-3 px-3 font-bold text-white">{o.amount}</td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 text-slate-300 font-medium">
                          <Truck className="h-3 w-3 text-cyan-400" /> {o.courier}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${o.statusBg}`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => toast.success(`Label & Tax Invoice generated for ${o.id}`)}
                          className="rounded-md bg-slate-800 hover:bg-slate-700 px-2.5 py-1 text-[11px] font-bold text-cyan-300 border border-slate-700 transition-colors"
                        >
                          Print Label
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* SELLER BUSINESS FLOW SECTION */}
      <section id="seller-flow" className="py-20 bg-[#0B0F1D] border-y border-slate-800/80">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-xs uppercase font-bold text-cyan-400 tracking-widest">End-to-End Seller Journey</h2>
            <p className="mt-2 text-3xl font-extrabold text-white sm:text-4xl">
              The Seller Business Flow in ShipSmart OMS
            </p>
            <p className="mt-4 text-slate-400 text-base">
              Connect your online store, consolidate all orders, and run operations without switching tabs.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {sellerFlowSteps.map((flow) => {
              const IconComp = flow.icon;
              return (
                <div
                  key={flow.num}
                  className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur-md relative hover:border-cyan-500/40 transition-all group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-md border border-cyan-500/20">
                      STEP {flow.num}
                    </span>
                    <div className="h-10 w-10 rounded-xl bg-slate-800 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                      <IconComp className="h-5 w-5" />
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors">
                    {flow.title}
                  </h3>
                  <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                    {flow.desc}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Centralized Action Capabilities list */}
          <div className="mt-10 rounded-2xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 backdrop-blur-xl">
            <div className="text-xs uppercase font-bold text-cyan-400 tracking-wider mb-2">Centralized Seller Actions</div>
            <h3 className="text-xl font-bold text-white">Everything Sellers Can Do Inside ShipSmart OMS</h3>
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {[
                { label: "View All Orders", icon: ShoppingBag },
                { label: "Accept Orders", icon: CheckCircle2 },
                { label: "Process Orders", icon: Sliders },
                { label: "Print Invoices", icon: FileText },
                { label: "Generate Labels", icon: Printer },
                { label: "Assign Couriers", icon: Truck },
                { label: "Track Shipments", icon: MapPin },
                { label: "Manage Returns (RTO)", icon: RotateCcw },
                { label: "Manage Cancellations", icon: PackageX },
                { label: "View Analytics", icon: BarChart3 },
              ].map((item) => {
                const ActionIcon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-800 bg-slate-950/60 text-xs font-semibold text-slate-200 hover:border-cyan-500/30 transition-colors"
                  >
                    <ActionIcon className="h-4 w-4 text-cyan-400 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 10 CORE OMS FEATURES SECTION */}
      <section id="features" className="py-20 bg-[#090B14] relative">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-xs uppercase font-bold text-cyan-400 tracking-widest">Enterprise Feature Suite</h2>
            <p className="mt-2 text-3xl font-extrabold text-white sm:text-4xl">
              10 Powerhouse Features of ShipSmart OMS
            </p>
            <p className="mt-4 text-slate-400 text-base">
              Engineered specifically for high-volume Indian e-commerce sellers managing marketplace channels, multi-courier logistics, and COD workflows.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => {
              const IconComp = f.icon;
              return (
                <div
                  key={f.title}
                  className="group relative rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md hover:border-cyan-500/50 hover:bg-slate-900/90 transition-all duration-300 hover:-translate-y-1 shadow-lg"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 group-hover:scale-110 transition-transform">
                      <IconComp className="h-6 w-6" />
                    </div>
                    <span className="rounded-full bg-slate-800/80 px-2.5 py-1 text-[11px] font-bold text-slate-300 border border-slate-700">
                      {f.badge}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors">
                    {f.title}
                  </h3>

                  <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                    {f.body}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS TIMELINE (EXACT 9 STEPS) */}
      <section id="how" className="py-20 bg-[#0B0F1D] border-y border-slate-800/80 relative">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-xs uppercase font-bold text-cyan-400 tracking-widest">Fulfillment Pipeline Timeline</h2>
            <p className="mt-2 text-3xl font-extrabold text-white sm:text-4xl">
              How ShipSmart OMS Works (9-Step Timeline)
            </p>
            <p className="mt-4 text-slate-400 text-base">
              A seamless automated timeline connecting customer order placement to final analytics update.
            </p>
          </div>

          {/* Timeline stepper selector */}
          <div className="mt-12 flex items-center gap-2 overflow-x-auto pb-4 justify-start">
            {steps.map((s) => (
              <button
                key={s.step}
                onClick={() => setActiveStep(s.step)}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all whitespace-nowrap border ${
                  activeStep === s.step
                    ? "bg-cyan-400 text-slate-950 border-cyan-400 shadow-lg shadow-cyan-500/20 scale-105"
                    : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <span className={`grid h-5 w-5 place-items-center rounded-full text-[10px] ${activeStep === s.step ? "bg-slate-950 text-cyan-400" : "bg-slate-800 text-slate-300"}`}>
                  {s.step}
                </span>
                <span>{s.name}</span>
              </button>
            ))}
          </div>

          {/* Active Timeline Card Showcase */}
          <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
            {(() => {
              const current = steps.find((s) => s.step === activeStep) || steps[0];
              const StepIcon = current.icon;
              return (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                  <div className="lg:col-span-6">
                    <div className="flex items-center gap-3 text-cyan-400 font-bold text-xs uppercase tracking-wider mb-2">
                      <span className="rounded-lg bg-cyan-500/20 px-2.5 py-1 border border-cyan-500/30">
                        Timeline Step 0{current.step} of 09
                      </span>
                      <span>Automated Pipeline</span>
                    </div>

                    <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                      {current.name}
                    </h3>

                    <p className="mt-3 text-slate-300 text-base leading-relaxed">
                      {current.desc}
                    </p>

                    <div className="mt-6 space-y-2.5">
                      {current.details.map((d, i) => (
                        <div key={i} className="flex items-start gap-2.5 text-sm text-slate-200">
                          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{d}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-8 flex gap-3">
                      <button
                        onClick={() => setActiveStep((prev) => (prev % 9) + 1)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-400 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-cyan-500/20 hover:bg-cyan-300 transition-colors"
                      >
                        Next Timeline Step <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="lg:col-span-6 rounded-xl border border-slate-800 bg-[#06080F] p-8 text-center flex flex-col items-center justify-center min-h-[280px] relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5 pointer-events-none" />
                    <div className="h-20 w-20 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4 shadow-xl">
                      <StepIcon className="h-10 w-10 animate-bounce" />
                    </div>
                    <div className="text-xl font-bold text-white">{current.name}</div>
                    <p className="text-xs text-slate-400 mt-2 max-w-md">
                      Sub-second automated milestone triggering real-time webhooks across your entire fulfillment stack.
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </section>

      {/* INTEGRATIONS SECTION */}
      <section id="integrations" className="py-20 bg-[#090B14]">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-xs uppercase font-bold text-cyan-400 tracking-widest">Connect Entire Storefront Stack</h2>
            <p className="mt-2 text-3xl font-extrabold text-white sm:text-4xl">
              Supported Platforms & Marketplaces
            </p>
            <p className="mt-4 text-slate-400 text-base">
              Pre-built 1-click connectors for India's leading shopping carts and marketplace seller portals.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {platforms.map((p) => (
              <div
                key={p.name}
                className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md hover:border-cyan-500/40 hover:bg-slate-900 transition-all shadow-md group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-3xl group-hover:scale-110 transition-transform">{p.logo}</span>
                    <span className="rounded-full bg-cyan-500/10 text-cyan-400 px-2.5 py-0.5 text-[10px] font-bold border border-cyan-500/20">
                      {p.tag}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white">{p.name}</h3>
                  <p className="mt-1 text-xs text-slate-400">{p.desc}</p>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800">
                  <button
                    onClick={() => setConnectStoreOpen(true)}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-400 hover:text-slate-950 text-cyan-300 py-2 text-xs font-bold transition-all"
                  >
                    <Link2 className="h-3.5 w-3.5" /> Connect Store
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* REVENUE MODEL & PRICING SECTION */}
      <section id="pricing" className="py-20 bg-[#0B0F1D] border-y border-slate-800/80">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-xs uppercase font-bold text-cyan-400 tracking-widest">Transparent & Flexible Monetization</h2>
            <p className="mt-2 text-3xl font-extrabold text-white sm:text-4xl">
              ShipSmart OMS Revenue & Pricing Model
            </p>
            <p className="mt-4 text-slate-400 text-base">
              Predictable pricing designed to scale seamlessly from boutique online stores to enterprise D2C brands.
            </p>
          </div>

          {/* 4 Revenue Streams Grid */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {revenueStreams.map((rev) => {
              const RevIcon = rev.icon;
              return (
                <div key={rev.title} className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                      <RevIcon className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-bold text-cyan-300 bg-cyan-400/10 px-2 py-0.5 rounded border border-cyan-400/20">
                      {rev.badge}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white">{rev.title}</h3>
                  <p className="mt-2 text-xs text-slate-400 leading-relaxed">{rev.desc}</p>
                </div>
              );
            })}
          </div>

          {/* Pricing Tiers Grid */}
          <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 backdrop-blur-md">
              <div className="text-xs font-bold uppercase text-slate-400">Starter Plan</div>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-black text-white">₹999</span>
                <span className="text-sm text-slate-400">/ month</span>
              </div>
              <p className="mt-2 text-xs text-slate-400">Ideal for growing stores up to 1,000 orders/mo.</p>
              <ul className="mt-6 space-y-3 text-xs text-slate-300">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> Up to 3 Sales Channels</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> Multi-Channel Sync</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> Batch Label Generation</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> AI Courier Routing</li>
              </ul>
              <button onClick={handleStartTrial} className="mt-8 w-full rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 py-3 text-xs font-bold text-white transition-colors">
                Start Free Trial
              </button>
            </div>

            <div className="rounded-2xl border-2 border-cyan-400 bg-slate-900/90 p-8 backdrop-blur-xl relative shadow-2xl scale-105">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-cyan-400 px-3 py-0.5 text-[10px] font-extrabold uppercase text-slate-950">
                Most Popular
              </div>
              <div className="text-xs font-bold uppercase text-cyan-400">Growth Plan</div>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-black text-white">₹2,999</span>
                <span className="text-sm text-slate-400">/ month</span>
              </div>
              <p className="mt-2 text-xs text-slate-400">For high-volume sellers up to 10,000 orders/mo.</p>
              <ul className="mt-6 space-y-3 text-xs text-slate-300">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-cyan-400" /> Unlimited Store Connections</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-cyan-400" /> Sub-2s 2-Way Inventory Sync</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-cyan-400" /> Automated NDR WhatsApp Bot</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-cyan-400" /> COD Payout Reconciliation</li>
              </ul>
              <button onClick={handleStartTrial} className="mt-8 w-full rounded-xl bg-cyan-400 hover:bg-cyan-300 py-3 text-xs font-extrabold text-slate-950 shadow-lg shadow-cyan-500/25 transition-colors">
                Start 30-Day Free Trial
              </button>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 backdrop-blur-md">
              <div className="text-xs font-bold uppercase text-slate-400">Enterprise Plan</div>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-black text-white">Custom</span>
              </div>
              <p className="mt-2 text-xs text-slate-400">For D2C brands & high-velocity 10,000+ orders/mo.</p>
              <ul className="mt-6 space-y-3 text-xs text-slate-300">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> Dedicated Account Manager</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> Custom ERP & SAP Connector</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> Volume Courier Rate Cards</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> 99.99% Dedicated SLA</li>
              </ul>
              <button onClick={() => setDemoOpen(true)} className="mt-8 w-full rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 py-3 text-xs font-bold text-white transition-colors">
                Book Enterprise Demo
              </button>
            </div>
          </div>

          {/* Why Businesses Save Time & Money Card */}
          <div className="mt-14 rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-slate-900 via-[#0E1B2E] to-slate-900 p-8 sm:p-10 shadow-2xl">
            <div className="text-center max-w-2xl mx-auto">
              <h3 className="text-2xl font-extrabold text-white">Why Businesses Save Time & Money using ShipSmart OMS</h3>
              <p className="mt-2 text-xs text-slate-300">
                Quantifiable operational ROI delivered from day 1 of store connection.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {savingsReasons.map((s) => (
                <div key={s.title} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="text-2xl font-black text-cyan-400 mb-1">{s.stat}</div>
                  <div className="text-xs font-bold text-white mb-1">{s.title}</div>
                  <div className="text-[11px] text-slate-400 leading-normal">{s.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ANALYTICS PREVIEW SECTION */}
      <section className="py-20 bg-[#090B14]">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-xs uppercase font-bold text-cyan-400 tracking-widest">Real-Time Operations Control</h2>
            <p className="mt-2 text-3xl font-extrabold text-white sm:text-4xl">
              Analytics & Courier Performance Preview
            </p>
            <p className="mt-4 text-slate-400 text-base">
              Monitor key fulfillment metrics, carrier SLAs, NDR resolution rates, and shipping costs from a unified dashboard.
            </p>
          </div>

          <div className="mt-12 rounded-2xl border border-slate-800 bg-[#06080F] p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5 mb-6">
              <div>
                <h3 className="text-xl font-bold text-white">Courier Partner Performance & SLA Matrix</h3>
                <p className="text-xs text-slate-400 mt-0.5">Live tracking across top national courier partners</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveChartMetric("orders")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                    activeChartMetric === "orders" ? "bg-cyan-400 text-slate-950" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  Courier SLAs
                </button>
                <button
                  onClick={() => setActiveChartMetric("courier")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                    activeChartMetric === "courier" ? "bg-cyan-400 text-slate-950" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  Rate Comparison
                </button>
              </div>
            </div>

            <div className="space-y-5">
              {courierPerformance.map((c) => (
                <div key={c.name} className="space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between text-xs text-slate-300">
                    <div className="flex items-center gap-2 font-bold text-white">
                      <Truck className="h-3.5 w-3.5 text-cyan-400" />
                      <span>{c.name}</span>
                      <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400 font-mono">
                        {c.volume} orders
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-semibold">
                      <span>Avg Rate: <strong className="text-white">{c.avgCost}</strong></span>
                      <span>On-Time SLA: <strong className="text-emerald-400">{c.onTime}</strong></span>
                      <span className="text-amber-300 font-bold">{c.rating}</span>
                    </div>
                  </div>

                  <div className="h-3 w-full rounded-full bg-slate-800/80 overflow-hidden p-0.5 border border-slate-700/50">
                    <div
                      className={`h-full rounded-full ${c.color} transition-all duration-1000`}
                      style={{ width: c.width }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="py-20 bg-[#0B0F1D] border-t border-slate-800/80">
        <div className="mx-auto max-w-4xl px-6">
          <div className="text-center">
            <h2 className="text-xs uppercase font-bold text-cyan-400 tracking-widest">Frequently Asked Questions</h2>
            <p className="mt-2 text-3xl font-extrabold text-white sm:text-4xl">
              Got Questions About ShipSmart OMS?
            </p>
          </div>

          <div className="mt-12 space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md"
              >
                <h3 className="text-lg font-bold text-white flex items-start gap-3">
                  <span className="text-cyan-400 font-mono">Q.</span>
                  <span>{faq.q}</span>
                </h3>
                <p className="mt-3 text-sm text-slate-300 leading-relaxed pl-7">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA BANNER */}
      <section className="py-20 bg-[#090B14] relative">
        <div className="mx-auto max-w-7xl px-6">
          <div className="rounded-3xl border border-slate-700 bg-gradient-to-b from-[#0F172A] to-[#090B14] p-10 sm:p-16 text-center shadow-2xl">
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              Ready to Simplify Your Order Management?
            </h2>
            <p className="mt-4 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto">
              Join thousands of high-velocity Indian sellers streamlining fulfillment, cutting shipping delays, and eliminating RTO chaos.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={handleStartTrial}
                className="w-full sm:w-auto rounded-xl bg-cyan-400 px-8 py-4 text-base font-extrabold text-slate-950 shadow-xl shadow-cyan-500/25 hover:bg-cyan-300 transition-transform hover:scale-105"
              >
                Start Free Trial
              </button>
              <button
                onClick={() => setConnectStoreOpen(true)}
                className="w-full sm:w-auto rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-8 py-4 text-base font-bold text-cyan-300 hover:bg-cyan-500/20 transition-colors flex items-center justify-center gap-2"
              >
                <Link2 className="h-5 w-5 text-cyan-400" /> Connect Store
              </button>
              <button
                onClick={() => setDemoOpen(true)}
                className="w-full sm:w-auto rounded-xl border border-slate-700 bg-slate-800/80 px-8 py-4 text-base font-bold text-white hover:bg-slate-700 transition-colors"
              >
                Book Demo
              </button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
