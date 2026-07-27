import {
  clearSession,
  compareImageSuppliers,
  getConnectionStatus,
  login,
  runShippingComparison,
  type MeeshoConnectionStatus,
  type MeeshoCredentials,
  type ShippingComparisonResult,
  type SingleImageComparisonResult,
  type VariantInput,
} from "../../automation/index.js";

/** Check Meesho session/connection status. */
export async function getMeeshoStatus(): Promise<MeeshoConnectionStatus> {
  try {
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
): Promise<{ success: boolean; message: string; status: MeeshoConnectionStatus }> {
  try {
    const result = await login({ credentials });
    const status = await getConnectionStatus();
    return {
      success: true,
      message: "Successfully authenticated with Meesho Seller portal",
      status,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = await getConnectionStatus();
    return {
      success: false,
      message: `Meesho login failed: ${message}`,
      status,
    };
  }
}

/** Disconnect / clear saved Meesho session. */
export async function disconnectMeesho(): Promise<{ success: boolean; message: string }> {
  try {
    await clearSession();
    return { success: true, message: "Meesho session disconnected" };
  } catch (error) {
    return { success: false, message: "Failed to clear Meesho session" };
  }
}

/** Compare shipping charges across supplier cards for a single image. */
export async function compareSingleImage(
  imagePath: string,
): Promise<SingleImageComparisonResult> {
  return await compareImageSuppliers(imagePath);
}

/** Run full shipping charge comparison across multiple image variants. */
export async function compareImageVariants(
  variants: VariantInput[],
): Promise<ShippingComparisonResult> {
  return await runShippingComparison(variants);
}
