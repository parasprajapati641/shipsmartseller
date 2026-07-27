/**
 * Meesho Shipping Charge Automation — Public API
 *
 * Modular entry point for integration with the Ship Smart Seller React app
 * or external services. All functions are Node.js / Playwright only.
 */

export { login, createAuthenticatedContext, getCredentialsFromEnv } from "./login.js";
export type { LoginResult } from "./login.js";

export {
  uploadProductImage,
  removeProductImage,
  uploadWithErrorCapture,
  captureVariantScreenshot,
} from "./upload.js";

export { waitForShippingCalculation, getShippingCharge, readShippingCharge } from "./shipping.js";

export {
  extractInrAmount,
  parseShippingChargeFromTexts,
  parseShippingChargeFromHtml,
} from "./parser.js";

export {
  runShippingComparison,
  discoverVariantsFromDirectory,
  formatComparisonSummary,
  isMeeshoAutomationError,
} from "./runner.js";

export {
  ensureAutomationDirs,
  sessionExists,
  loadSession,
  saveSession,
  isSessionValid,
  clearSession,
  getSessionPath,
} from "./session.js";

export { MEESHO_URLS, DEFAULT_TIMEOUTS, PATHS, ENV } from "./config/constants.js";
export { meeshoSelectors } from "./config/selectors.js";

export type {
  VariantInput,
  VariantShippingResult,
  ShippingComparisonResult,
  AutomationOptions,
  AutomationTimeouts,
  ParsedShippingCharge,
  MeeshoCredentials,
} from "./types.js";

export { MeeshoAutomationError, LoginError, SessionError, UploadError, ShippingCalculationError, ParseError, TimeoutError } from "./lib/errors.js";

export { logger } from "./lib/logger.js";
export { withRetry } from "./lib/retry.js";
