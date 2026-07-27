/** Shared types for the Meesho shipping charge automation module. */

/** A single image variant to test for shipping charges. */
export type VariantInput = {
  /** File size in kilobytes (from optimizer). */
  sizeKB: number;
  /** Absolute or relative path to the image file on disk. */
  path?: string;
  /** Optional human-readable label; defaults to `${sizeKB}kb`. */
  name?: string;
  /** Base64 or data URL payload from client component. */
  base64?: string;
};

/** Extracted info for a single supplier card on Meesho. */
export type SupplierResult = {
  supplierName: string;
  shippingCharge: number;
  deliveryDays?: string;
  rawText?: string;
  isLowest?: boolean;
};

/** Progress telemetry info. */
export type ProgressInfo = {
  stage: string;
  variantIndex?: number;
  totalVariants?: number;
  variantName?: string;
  message: string;
};

/** Failure diagnostic detail payload. */
export type DiagnosticDetail = {
  step?: string;
  url?: string;
  title?: string;
  screenshot?: string;
  htmlDump?: string;
  domDump?: string;
  selectorsTried?: string[];
  reason?: string;
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
  diagnostics?: DiagnosticDetail;
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
  diagnostics?: DiagnosticDetail;
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
  diagnostics?: DiagnosticDetail;
};

/** Meesho connection status for dashboard / API. */
export type MeeshoConnectionStatus = {
  connected: boolean;
  expiresAt?: string;
  sessionExpired?: boolean;
  requiresOtp?: boolean;
  message?: string;
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
  /** Progress telemetry callback. */
  onProgress?: (progress: ProgressInfo) => void;
};

export type AutomationTimeouts = {
  navigation: number;
  login: number;
  upload: number;
  shippingCalculation: number;
  deleteImage: number;
  elementVisible: number;
  action: number;
  overallVariant: number;
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
