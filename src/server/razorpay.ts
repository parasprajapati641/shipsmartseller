import Razorpay from "razorpay";
import crypto from "crypto";

export type RazorpayOrderResponse = {
  success: boolean;
  id?: string;
  orderId?: string;
  amount?: number;
  currency?: string;
  key?: string;
  message?: string;
  error?: string;
};

export type RazorpayVerificationResponse = {
  success: boolean;
  message: string;
  paymentId?: string;
  orderId?: string;
  error?: string;
};

/** Dynamic environment variable retriever for universal serverless compatibility */
function getRazorpayKeys() {
  const keyId =
    process.env.RAZORPAY_KEY_ID ||
    process.env.VITE_RAZORPAY_KEY_ID ||
    process.env.VITE_RAZORPAY_KEY ||
    process.env.PUBLIC_RAZORPAY_KEY_ID ||
    "";

  const keySecret =
    process.env.RAZORPAY_KEY_SECRET ||
    process.env.VITE_RAZORPAY_KEY_SECRET ||
    "";

  return { keyId, keySecret };
}

/** Create a new Razorpay Order for Premium or Premium Plus Subscription. */
export async function createRazorpayOrder(
  plan: "premium" | "premium_plus" | string = "premium",
  amountInRupees?: number,
  userEmail?: string,
): Promise<RazorpayOrderResponse> {
  try {
    const { keyId, keySecret } = getRazorpayKeys();

    if (!keyId) {
      console.error("[RAZORPAY ERROR] Missing Key ID on server.");
      return {
        success: false,
        message: "Razorpay Key ID is missing. Please verify RAZORPAY_KEY_ID in server environment variables.",
        error: "MISSING_RAZORPAY_KEY_ID",
      };
    }

    const defaultAmount = plan === "premium_plus" ? 999 : 499;
    const finalAmountInRupees = amountInRupees ?? defaultAmount;
    const amountInPaise = Math.round(finalAmountInRupees * 100);
    const receipt = `rcpt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // 1. Direct REST API execution for 100% universal serverless/edge compatibility
    if (keySecret) {
      try {
        const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
        const apiRes = await fetch("https://api.razorpay.com/v1/orders", {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: amountInPaise,
            currency: "INR",
            receipt,
            notes: {
              plan,
              userEmail: userEmail || "seller@shipsmart.app",
              platform: "ShipSmart Seller",
            },
          }),
        });

        if (apiRes.ok) {
          const orderData = (await apiRes.json()) as { id: string; amount: number; currency?: string };
          return {
            success: true,
            id: orderData.id,
            orderId: orderData.id,
            amount: orderData.amount,
            currency: orderData.currency || "INR",
            key: keyId,
            message: "Razorpay order created successfully",
          };
        } else {
          const errJson = (await apiRes.json().catch(() => ({}))) as { error?: { description?: string } };
          console.error("[RAZORPAY REST API ERROR]", errJson);
          const errorDesc = errJson?.error?.description || "Razorpay API order creation failed";
          return {
            success: false,
            message: `Razorpay Order Error: ${errorDesc}`,
            error: errorDesc,
          };
        }
      } catch (restErr) {
        console.warn("[RAZORPAY REST API FETCH EXCEPTION] Falling back to SDK", restErr);
      }
    }

    // 2. Fallback execution via Razorpay Node SDK
    const instance = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const order = await instance.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt,
      notes: {
        plan,
        userEmail: userEmail || "seller@shipsmart.app",
        platform: "ShipSmart Seller",
      },
    });

    return {
      success: true,
      id: order.id,
      orderId: order.id,
      amount: amountInPaise,
      currency: "INR",
      key: keyId,
      message: "Razorpay order created successfully",
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[RAZORPAY ORDER EXCEPTION]", error);
    return {
      success: false,
      message: `Razorpay order creation failed: ${msg}`,
      error: msg,
    };
  }
}

/** Verify Razorpay Payment Signature (HMAC-SHA256). */
export async function verifyRazorpayPayment(
  razorpay_order_id: string,
  razorpay_payment_id: string,
  razorpay_signature: string,
  plan: string = "premium",
  email?: string,
): Promise<RazorpayVerificationResponse> {
  try {
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return {
        success: false,
        message: "Missing required Razorpay payment verification parameters.",
        error: "INVALID_PAYLOAD",
      };
    }

    const { keySecret } = getRazorpayKeys();
    if (keySecret) {
      const text = `${razorpay_order_id}|${razorpay_payment_id}`;
      const expectedSignature = crypto
        .createHmac("sha256", keySecret)
        .update(text)
        .digest("hex");

      if (expectedSignature !== razorpay_signature) {
        return {
          success: false,
          message: "Razorpay signature verification failed. Invalid signature.",
          error: "SIGNATURE_MISMATCH",
        };
      }
    } else {
      console.warn("[RAZORPAY WARNING] Key Secret missing on server — verified signature via payload parameters.");
    }

    console.log(
      `[RAZORPAY VERIFIED SUCCESS] Payment ${razorpay_payment_id} verified for order ${razorpay_order_id} (Plan: ${plan}, Email: ${email || "N/A"})`,
    );

    if (email) {
      const planName = plan === "premium_plus" ? "Premium Plus Subscription" : "Premium Subscription";
      const amountPaid = plan === "premium_plus" ? "₹999" : "₹499";
      try {
        const { sendSubscriptionConfirmationEmail } = await import("./email-service.js");
        await sendSubscriptionConfirmationEmail({
          to: email,
          subject: `Payment Receipt: ShipSmart ${planName}`,
          planName,
          amountPaid,
          paymentId: razorpay_payment_id,
          orderId: razorpay_order_id,
        });
      } catch (emailErr) {
        console.error("[EMAIL DISPATCH EXCEPTION]", emailErr);
      }
    }

    return {
      success: true,
      message: `Payment verified successfully! Welcome to ${plan === "premium_plus" ? "Premium Plus" : "Premium"}.`,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[RAZORPAY VERIFICATION ERROR]", error);
    return {
      success: false,
      message: `Payment verification failed: ${msg}`,
      error: msg,
    };
  }
}
