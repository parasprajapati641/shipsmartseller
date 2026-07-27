import { createServerFn } from "@tanstack/react-start";
import {
  connectMeesho,
  disconnectMeesho,
  getMeeshoStatus,
  compareSingleImage,
  compareImageVariants,
} from "../server/meesho";
import type { VariantInput } from "../../automation/types";

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
  .validator((data?: { email?: string; password?: string }) => data ?? {})
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
        status: { connected: false },
      };
    }
  });

export const disconnectMeeshoFn = createServerFn({ method: "POST" }).handler(async () => {
  try {
    return await disconnectMeesho();
  } catch (error) {
    return { success: false, message: "Disconnect failed" };
  }
});

export const compareSingleImageFn = createServerFn({ method: "POST" })
  .validator((data: { imagePath: string }) => data)
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
      };
    }
  });

export const compareVariantsFn = createServerFn({ method: "POST" })
  .validator((data: { variants: VariantInput[] }) => data)
  .handler(async ({ data }) => {
    try {
      return await compareImageVariants(data.variants);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        bestVariant: null,
        variants: [],
        totalProcessingTimeMs: 0,
        error: message,
      };
    }
  });
