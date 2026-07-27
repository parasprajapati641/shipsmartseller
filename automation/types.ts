/** Shared types for the Meesho shipping charge automation module. */

/** A single image variant to test for shipping charges. */
export type VariantInput = {
  /** File size in kilobytes (from optimizer). */
  sizeKB: number;
  /** Absolute or relative path to the image file on disk. */
  path: string;
  /** Optional human-readable label; defaults to `${sizeKB}kb`. */
  name?: string;
};

/** Extracted info for a single supplier card on Meesho. */
export type SupplierResult = {
  supplierName: string;
  shippingCharge: number;
  deliveryDays?: string;
  rawText?: string;
  isLowest?: boolean;
};

/** Result of testing a single variant for shipping charge. */
export type VariantShippingResult = {
  sizeKB: number;
  variantName: string;
  shippingCharge: number;
  imagePath: string;
  screenshot: string;
  processingTimeMs: number;
  status: "success" | "failed";
  suppliers?: SupplierResult[];
  bestSupplier?: SupplierResult | null;
  error?: string;
};

/** Result of extracting supplier shipping charges for a single image. */
export type SingleImageComparisonResult = {
  success: boolean;
  imagePath: string;
  sizeKB?: number;
  lowestShippingCharge: number;
  bestSupplier: SupplierResult | null;
  suppliers: SupplierResult[];
  screenshot?: string;
  processingTimeMs: number;
  error?: string;
};

/** Full comparison result across all variants. */
export type ShippingComparisonResult = {
  success: boolean;
  bestVariant: {
    sizeKB: number;
    variantName: string;
    shippingCharge: number;
    imagePath: string;
    screenshot?: string;
  } | null;
  variants: VariantShippingResult[];
  totalProcessingTimeMs: number;
  error?: string;
};

/** Meesho connection status for dashboard / API. */
export type MeeshoConnectionStatus = {
  connected: boolean;
  expiresAt?: string;
  sessionExpired?: boolean;
};

/** Browser launch and runtime options. */
export type AutomationOptions = {
  /** Run browser in headless mode. Defaults to true unless MEESHO_HEADED=1. */
  headless?: boolean;
  /** Override default timeouts (ms). */
  timeouts?: Partial<AutomationTimeouts>;
  /** Directory for failure/debug screenshots. */
  screenshotsDir?: string;
  /** Path to persisted session (encrypted). */
  sessionPath?: string;
  /** Skip session reuse and force re-login. */
  forceLogin?: boolean;
};

export type AutomationTimeouts = {
  navigation: number;
  login: number;
  upload: number;
  shippingCalculation: number;
  elementVisible: number;
  action: number;
};

/** Parsed shipping charge from page content. */
export type ParsedShippingCharge = {
  amount: number;
  currency: "INR";
  rawText: string;
};

/** Login credentials source. */
export type MeeshoCredentials = {
  email: string;
  password: string;
};

