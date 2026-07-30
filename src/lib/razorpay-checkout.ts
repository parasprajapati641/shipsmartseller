import { toast } from "sonner";
import { createRazorpayOrderFn, verifyRazorpayPaymentFn } from "./razorpay-actions.js";

declare global {
  interface Window {
    Razorpay: new (options: unknown) => {
      open: () => void;
      on: (
        event: string,
        callback: (res: { error?: { description?: string; reason?: string } }) => void,
      ) => void;
    };
  }
}

/** Inject official Razorpay Checkout SDK script dynamically. */
export async function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (window.Razorpay) return true;

  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.id = "razorpay-sdk";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      toast.error("Failed to load Razorpay SDK. Please check your network connection.");
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

export type CheckoutOptions = {
  plan?: "premium" | "premium_plus" | string;
  amountInRupees?: number;
  userEmail?: string;
  userName?: string;
  userPhone?: string;
  onSuccess?: (paymentId: string) => void;
  onDismiss?: () => void;
};

/** Launch live Razorpay Modal for Premium / Premium Plus & perform automated HMAC verification. */
export async function openRazorpayCheckout(options: CheckoutOptions): Promise<void> {
  const isLoaded = await loadRazorpayScript();
  if (!isLoaded) return;

  const plan = "premium_plus";
  const planLabel = "Premium Plus Subscription";
  const amountInRupees = options.amountInRupees ?? 999;

  const toastId = toast.loading(
    `Initializing secure Razorpay payment gateway for ${planLabel} (₹${amountInRupees})...`,
  );

  try {
    // 1. Create order on server via TanStack Start Server Function
    const orderRes = await createRazorpayOrderFn({
      data: {
        plan,
        amountInRupees,
        userEmail: options.userEmail,
      },
    });

    toast.dismiss(toastId);

    if (!orderRes.success || (!orderRes.id && !orderRes.orderId)) {
      toast.error(
        orderRes.message || "Could not create payment order. Please check Razorpay Key settings.",
      );
      return;
    }

    const key =
      orderRes.key ||
      import.meta.env.VITE_RAZORPAY_KEY_ID ||
      import.meta.env.VITE_RAZORPAY_KEY ||
      "";

    const orderId = orderRes.id || orderRes.orderId!;

    // 2. Configure Razorpay Modal Options
    const rzpOptions = {
      key,
      amount: orderRes.amount,
      currency: orderRes.currency || "INR",
      name: "ShipSmart Seller",
      description: planLabel,
      image: "https://shipsmartseller.vercel.app/favicon.ico",
      order_id: orderId,
      prefill: {
        email: options.userEmail || "",
        name: options.userName || "",
        contact: options.userPhone || "",
      },
      theme: {
        color: "#6366f1",
      },
      handler: async function (response: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      }) {
        const verifyToastId = toast.loading("Verifying payment signature...");
        try {
          let emailToPass = options.userEmail;
          if (!emailToPass) {
            try {
              const { supabase } = await import("../integrations/supabase/client.js");
              const { data: authData } = await supabase.auth.getUser();
              emailToPass = authData?.user?.email ?? undefined;
            } catch {
              // Fallback
            }
          }

          // 3. Verify Payment Signature via Server Function & Send Email Receipt
          const verifyRes = await verifyRazorpayPaymentFn({
            data: {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan,
              email: emailToPass,
            },
          });

          toast.dismiss(verifyToastId);

          if (verifyRes.success) {
            try {
              const { activatePremiumPlusServerFn } =
                await import("./subscription-server-actions.js");
              await activatePremiumPlusServerFn({
                data: { userEmail: emailToPass, paymentId: response.razorpay_payment_id },
              });

              const { activateMonthlyPremiumPlus } = await import("./subscription-store.js");
              activateMonthlyPremiumPlus(emailToPass);
            } catch (err) {
              console.error("Failed to update subscription store:", err);
            }

            const typedVerify = verifyRes as { success: boolean; message?: string; error?: string };
            toast.success(typedVerify.message || `Welcome to ${planLabel}! Payment successful.`);
            options.onSuccess?.(response.razorpay_payment_id);
          } else {
            toast.error(typedVerify.message || typedVerify.error || "Payment verification failed.");
          }
        } catch (err) {
          toast.dismiss(verifyToastId);
          toast.error("Payment verification failed due to network error.");
        }
      },
      modal: {
        ondismiss: function () {
          toast.info("Payment process cancelled.");
          options.onDismiss?.();
        },
      },
    };

    const razorpayInstance = new window.Razorpay(rzpOptions);
    razorpayInstance.on(
      "payment.failed",
      function (response: { error?: { description?: string; reason?: string } }) {
        toast.error(
          `Payment failed: ${response.error?.description || response.error?.reason || "Transaction declined"}`,
        );
      },
    );

    razorpayInstance.open();
  } catch (error) {
    toast.dismiss(toastId);
    const rawMsg = error instanceof Error ? error.message : String(error);
    const isHtmlError =
      rawMsg.includes("<!DOCTYPE") ||
      rawMsg.includes("This page didn't load") ||
      rawMsg.includes("<html");
    const cleanMsg = isHtmlError
      ? "Server configuration error. Please verify RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables on your live deployment."
      : rawMsg;
    toast.error(`Checkout error: ${cleanMsg}`);
  }
}
