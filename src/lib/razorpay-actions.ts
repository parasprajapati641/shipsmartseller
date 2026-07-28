import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createRazorpayOrder, verifyRazorpayPayment } from "../server/razorpay.js";

/** TanStack Start Server Function to create a Razorpay order without localhost 5000 dependency. */
export const createRazorpayOrderFn = createServerFn({ method: "POST" })
  .validator((data: { plan?: "premium" | "premium_plus" | string; amountInRupees?: number; userEmail?: string }) =>
    z
      .object({
        plan: z.string().optional().default("premium"),
        amountInRupees: z.number().optional(),
        userEmail: z.string().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    return await createRazorpayOrder(data.plan, data.amountInRupees, data.userEmail);
  });

/** TanStack Start Server Function to verify Razorpay payment signature without localhost 5000 dependency. */
export const verifyRazorpayPaymentFn = createServerFn({ method: "POST" })
  .validator((data: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    plan?: string;
    email?: string;
  }) =>
    z
      .object({
        razorpay_order_id: z.string(),
        razorpay_payment_id: z.string(),
        razorpay_signature: z.string(),
        plan: z.string().optional().default("premium"),
        email: z.string().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    return await verifyRazorpayPayment(
      data.razorpay_order_id,
      data.razorpay_payment_id,
      data.razorpay_signature,
      data.plan,
      data.email,
    );
  });
