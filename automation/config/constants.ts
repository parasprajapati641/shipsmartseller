import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTOMATION_ROOT = path.resolve(__dirname, "..");

/**
 * Meesho Seller Portal URLs — verified via automation/.inspect-output/deep-inspection.json
 */
export const MEESHO_URLS = {
  /** Seller login page (email + password on same form). */
  login: "https://supplier.meesho.com/panel/v3/new/root/login",
  /** Single product cataloguing / add page. */
  productCreation: "https://supplier.meesho.com/panel/v3/new/cataloguing/single/add",
  /** Panel home — used for session validation (redirects to login when expired). */
  dashboard: "https://supplier.meesho.com/panel/v3/new/",
} as const;

/** Default timeout values (milliseconds). Override via AutomationOptions.timeouts. */
export const DEFAULT_TIMEOUTS = {
  navigation: 60_000,
  login: 180_000,
  upload: 45_000,
  shippingCalculation: 90_000,
  elementVisible: 30_000,
  action: 15_000,
} as const;

/** Retry configuration for transient failures. */
export const RETRY_CONFIG = {
  maxAttempts: 3,
  initialDelayMs: 1_000,
  maxDelayMs: 8_000,
  backoffMultiplier: 2,
} as const;

/** Paths relative to automation/ root. */
export const PATHS = {
  automationRoot: AUTOMATION_ROOT,
  sessionDir: path.join(AUTOMATION_ROOT, ".session"),
  sessionFile: path.join(AUTOMATION_ROOT, ".session", "meesho-session.enc"),
  sessionMetaFile: path.join(AUTOMATION_ROOT, ".session", "meesho-session.meta.json"),
  legacySessionFile: path.join(AUTOMATION_ROOT, ".session", "meesho-session.json"),
  screenshotsDir: path.join(AUTOMATION_ROOT, ".screenshots"),
  testVariantsDir: path.join(AUTOMATION_ROOT, "test-variants"),
  tempVariantsDir: path.join(AUTOMATION_ROOT, ".tmp-variants"),
} as const;

/** Environment variable names. */
export const ENV = {
  email: "MEESHO_SELLER_EMAIL",
  password: "MEESHO_SELLER_PASSWORD",
  sessionSecret: "MEESHO_SESSION_SECRET",
  headed: "MEESHO_HEADED",
  logLevel: "MEESHO_LOG_LEVEL",
} as const;

/** Default session TTL when cookie expiry cannot be parsed (7 days). */
export const DEFAULT_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Variant naming convention matching dashboard downloads: `{basename}_{targetKB}kb.jpg` */
export const VARIANT_FILENAME_PATTERN = /^(.+)_(\d+)kb\.jpg$/i;

/** Supported image MIME types for upload. */
export const SUPPORTED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"] as const;

/** Chrome user agent used to avoid bot blocking (verified on login page inspection). */
export const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
