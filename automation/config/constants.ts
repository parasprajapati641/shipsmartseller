import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTOMATION_ROOT = path.resolve(__dirname, "..");

/** Detect Vercel / AWS Lambda / production serverless runtime. */
export const IS_SERVERLESS = Boolean(
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.VERCEL_ENV,
);

/**
 * On serverless environments like Vercel, the workspace directory is strictly read-only.
 * All dynamic files (sessions, temporary images, screenshots) must be written to os.tmpdir() (/tmp).
 */
const BASE_TEMP_DIR = IS_SERVERLESS ? path.join(os.tmpdir(), "shipsmartseller") : AUTOMATION_ROOT;

/** Meesho Seller Portal URLs — verified via automation/.inspect-output/deep-inspection.json */
export const MEESHO_URLS = {
  /** Seller login page (email + password on same form). */
  login: "https://supplier.meesho.com/panel/v3/new/root/login",
  /** Single product cataloguing / add page. */
  productCreation: "https://supplier.meesho.com/panel/v3/new/cataloguing/single/add",
  /** Panel home — used for session validation (redirects to login when expired). */
  dashboard: "https://supplier.meesho.com/panel/v3/new/",
} as const;

/** Bounded default timeout values (milliseconds) ensuring no step hangs indefinitely. */
export const DEFAULT_TIMEOUTS = {
  navigation: 15_000,
  login: 15_000,
  upload: 20_000,
  shippingCalculation: 20_000,
  deleteImage: 10_000,
  elementVisible: 10_000,
  action: 10_000,
  overallVariant: 60_000,
} as const;

/** Retry configuration for transient failures. */
export const RETRY_CONFIG = {
  maxAttempts: 2,
  initialDelayMs: 1_000,
  maxDelayMs: 4_000,
  backoffMultiplier: 2,
} as const;

/** Paths relative to automation/ root (or /tmp on serverless). */
export const PATHS = {
  automationRoot: AUTOMATION_ROOT,
  sessionDir: path.join(BASE_TEMP_DIR, ".session"),
  sessionFile: path.join(BASE_TEMP_DIR, ".session", "meesho-session.enc"),
  sessionMetaFile: path.join(BASE_TEMP_DIR, ".session", "meesho-session.meta.json"),
  legacySessionFile: path.join(BASE_TEMP_DIR, ".session", "meesho-session.json"),
  screenshotsDir: path.join(BASE_TEMP_DIR, ".screenshots"),
  testVariantsDir: path.join(AUTOMATION_ROOT, "test-variants"),
  tempVariantsDir: path.join(BASE_TEMP_DIR, ".tmp-variants"),
} as const;

/** Environment variable names. */
export const ENV = {
  email: "MEESHO_SELLER_EMAIL",
  password: "MEESHO_SELLER_PASSWORD",
  sessionSecret: "MEESHO_SESSION_SECRET",
  headed: "MEESHO_HEADED",
  logLevel: "MEESHO_LOG_LEVEL",
  automationApiUrl: "MEESHO_AUTOMATION_API_URL",
  playwrightWsEndpoint: "PLAYWRIGHT_WS_ENDPOINT",
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
