import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  connectMeesho,
  disconnectMeesho,
  getMeeshoStatus,
  compareSingleImage,
  compareImageVariants,
} from "../server/meesho.js";
import type { VariantInput } from "../../automation/types.js";

export const getMeeshoStatusFn = createServerFn({ method: "GET" }).handler(async () => {
  try {
    return await getMeeshoStatus();
  } catch (error) {
    return {
      connected: false,
      sessionExpired: false,
    };
  }
});

export const connectMeeshoFn = createServerFn({ method: "POST" })
  .validator((data: { email?: string; password?: string }) =>
    z
      .object({
        email: z.string().optional(),
        password: z.string().optional(),
      })
      .parse(data ?? {}),
  )
  .handler(async ({ data }) => {
    try {
      return await connectMeesho(
        data?.email && data?.password ? { email: data.email, password: data.password } : undefined,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `Connection failed: ${message}`,
        error: message,
        step: "connect_handler",
        status: { connected: false },
      };
    }
  });

export const disconnectMeeshoFn = createServerFn({ method: "POST" }).handler(async () => {
  try {
    return await disconnectMeesho();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: "Disconnect failed",
      error: message,
      step: "disconnect_handler",
    };
  }
});

export const compareSingleImageFn = createServerFn({ method: "POST" })
  .validator((data: { imagePath: string }) =>
    z
      .object({
        imagePath: z.string().default(""),
      })
      .parse(data ?? { imagePath: "" }),
  )
  .handler(async ({ data }) => {
    try {
      return await compareSingleImage(data.imagePath);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        imagePath: data.imagePath,
        lowestShippingCharge: Infinity,
        bestSupplier: null,
        suppliers: [],
        processingTimeMs: 0,
        error: message,
        step: "compare_single_handler",
      };
    }
  });

const variantInputSchema = z.object({
  path: z.string().optional(),
  name: z.string().optional(),
  sizeKB: z.number().optional(),
  base64: z.string().optional(),
});

export const compareVariantsFn = createServerFn({ method: "POST" })
  .validator(
    (data: {
      variants: Array<{ path?: string; name?: string; sizeKB?: number; base64?: string }>;
    }) =>
      z
        .object({
          variants: z.array(variantInputSchema).default([]),
        })
        .parse(data ?? { variants: [] }),
  )
  .handler(async ({ data }) => {
    try {
      return await compareImageVariants(data.variants as VariantInput[]);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        bestVariant: null,
        variants: [],
        totalProcessingTimeMs: 0,
        error: message,
        step: "compare_variants_handler",
      };
    }
  });
