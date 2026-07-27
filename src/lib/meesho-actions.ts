import { createServerFn } from "@tanstack/react-start";
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
  .validator((data: unknown) => {
    try {
      if (data && typeof data === "object") {
        return data as { email?: string; password?: string };
      }
    } catch {
      // safe fallback for malformed validator payload
    }
    return {};
  })
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
    return { success: false, message: "Disconnect failed", error: message, step: "disconnect_handler" };
  }
});

export const compareSingleImageFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    try {
      if (data && typeof data === "object" && "imagePath" in data) {
        return data as { imagePath: string };
      }
    } catch {
      // safe fallback
    }
    return { imagePath: "" };
  })
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

export const compareVariantsFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    try {
      if (data && typeof data === "object" && "variants" in data && Array.isArray((data as any).variants)) {
        return data as { variants: VariantInput[] };
      }
    } catch {
      // safe fallback
    }
    return { variants: [] };
  })
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
        step: "compare_variants_handler",
      };
    }
  });
