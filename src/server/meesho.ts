import type {
  MeeshoConnectionStatus,
  MeeshoCredentials,
  ShippingComparisonResult,
  SingleImageComparisonResult,
  VariantInput,
} from "../../automation/types.js";

const AUTOMATION_API_URL = process.env.MEESHO_AUTOMATION_API_URL || process.env.AUTOMATION_API_URL;

/** Lazy helper to dynamically load local automation module only when needed. */
async function loadAutomationModule() {
  return await import("../../automation/index.js");
}

/** Check Meesho session/connection status. */
export async function getMeeshoStatus(): Promise<MeeshoConnectionStatus> {
  if (AUTOMATION_API_URL) {
    try {
      const res = await fetch(`${AUTOMATION_API_URL}/meesho/status`);
      if (res.ok) return await res.json();
    } catch (err) {
      console.error("[PRODUCTION PROXY] Failed to fetch status from automation service:", err);
    }
    return { connected: false, sessionExpired: false };
  }

  try {
    const { getConnectionStatus } = await loadAutomationModule();
    return await getConnectionStatus();
  } catch (error) {
    return {
      connected: false,
      sessionExpired: false,
    };
  }
}

/** Authenticate and persist session for Meesho Seller portal. */
export async function connectMeesho(
  credentials?: MeeshoCredentials,
): Promise<{ success: boolean; requiresOtp?: boolean; message: string; status: MeeshoConnectionStatus; step?: string; error?: string }> {
  if (AUTOMATION_API_URL) {
    try {
      const res = await fetch(`${AUTOMATION_API_URL}/meesho/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credentials }),
      });
      const data = await res.json();
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        message: `Automation microservice unreachable at ${AUTOMATION_API_URL}: ${msg}`,
        error: msg,
        step: "network_proxy",
        status: { connected: false },
      };
    }
  }

  try {
    const { getConnectionStatus, login } = await loadAutomationModule();
    // Check if session is already valid
    const existingStatus = await getConnectionStatus().catch(() => ({ connected: false, sessionExpired: false }));
    if (existingStatus.connected && !existingStatus.sessionExpired) {
      return {
        success: true,
        message: "Already authenticated with active Meesho seller session",
        status: existingStatus,
      };
    }

    await login({ credentials });
    const status = await getConnectionStatus();

    return {
      success: true,
      message: "Successfully authenticated with Meesho Seller portal",
      status,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    let status: MeeshoConnectionStatus = { connected: false };
    try {
      const { getConnectionStatus } = await loadAutomationModule();
      status = await getConnectionStatus().catch(() => ({ connected: false }));
    } catch {
      // ignore status load errors
    }
    return {
      success: false,
      message: `Meesho login failed: ${message}`,
      error: message,
      step: "login_automation",
      status,
    };
  }
}

/** Disconnect / clear saved Meesho session. */
export async function disconnectMeesho(): Promise<{ success: boolean; message: string; error?: string }> {
  if (AUTOMATION_API_URL) {
    try {
      const res = await fetch(`${AUTOMATION_API_URL}/meesho/disconnect`, { method: "POST" });
      return await res.json();
    } catch (err) {
      return { success: false, message: "Disconnect proxy failed", error: String(err) };
    }
  }

  try {
    const { clearSession } = await loadAutomationModule();
    await clearSession();
    return { success: true, message: "Meesho session disconnected" };
  } catch (error) {
    return { success: false, message: "Failed to clear Meesho session", error: String(error) };
  }
}

/** Compare shipping charges across supplier cards for a single image. */
export async function compareSingleImage(
  imagePath: string,
): Promise<SingleImageComparisonResult> {
  try {
    const { compareImageSuppliers } = await loadAutomationModule();
    return await compareImageSuppliers(imagePath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      imagePath,
      lowestShippingCharge: Infinity,
      bestSupplier: null,
      suppliers: [],
      processingTimeMs: 0,
      error: message,
    };
  }
}

/** Run full shipping charge comparison across multiple image variants. */
export async function compareImageVariants(
  variants: VariantInput[],
): Promise<ShippingComparisonResult> {
  if (AUTOMATION_API_URL) {
    try {
      const res = await fetch(`${AUTOMATION_API_URL}/meesho/compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variants }),
      });
      return await res.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        bestVariant: null,
        variants: [],
        totalProcessingTimeMs: 0,
        error: `Automation microservice call failed: ${message}`,
      };
    }
  }

  try {
    const { runShippingComparison } = await loadAutomationModule();
    return await runShippingComparison(variants);
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
}
