import fs from "node:fs/promises";
import path from "node:path";
import type { Browser, BrowserContext, Page } from "playwright";
import { dumpDebugHtml, extractSupplierCards, saveStepScreenshot } from "./compare.js";
import {
  DEFAULT_TIMEOUTS,
  MEESHO_URLS,
  PATHS,
  SUPPORTED_IMAGE_EXTENSIONS,
} from "./config/constants.js";
import { productCreationSelectors } from "./config/selectors.js";
import {
  isMeeshoAutomationError,
  LoginError,
  UploadError,
  ShippingCalculationError,
} from "./lib/errors.js";
import { logger } from "./lib/logger.js";
import { resolveSelector } from "./lib/selectors.js";
import { createAuthenticatedContext } from "./login.js";
import { captureVariantScreenshot, removeProductImage, uploadWithErrorCapture } from "./upload.js";
import type {
  AutomationOptions,
  ProgressInfo,
  ShippingComparisonResult,
  VariantInput,
  VariantShippingResult,
} from "./types.js";

/** Helper to wrap a promise with a hard timeout. */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  stepLabel: string,
): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Timeout of ${timeoutMs}ms exceeded at stage '${stepLabel}'`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Navigate to the Meesho product creation page via live seller panel UI with hard timeout. */
async function navigateToProductCreation(page: Page, options: AutomationOptions): Promise<void> {
  const timeoutMs = options.timeouts?.navigation ?? DEFAULT_TIMEOUTS.navigation;
  logger.info("[TIMER] Navigating to catalog page...", { timeoutMs });

  await withTimeout(
    (async () => {
      try {
        await page.goto("https://supplier.meesho.com/panel/v3/new/growth/fnkth/home", {
          waitUntil: "domcontentloaded",
          timeout: timeoutMs,
        });
      } catch {
        await page.goto(MEESHO_URLS.dashboard, {
          waitUntil: "domcontentloaded",
          timeout: timeoutMs,
        });
      }

      const currentUrl = page.url();
      if (
        currentUrl.includes("login") ||
        currentUrl.includes("auth") ||
        currentUrl.includes("signup")
      ) {
        await saveStepScreenshot(page, "step5-error").catch(() => undefined);
        await dumpDebugHtml(page, "suppliers.html").catch(() => undefined);
        throw new LoginError(
          "Meesho session expired or unauthenticated. Please authenticate via 'Connect Meesho'.",
        );
      }

      // 1. Click "Catalog Uploads"
      const catBtn = page.getByText("Catalog Uploads").first();
      if (await catBtn.isVisible({ timeout: 4_000 }).catch(() => false)) {
        await catBtn.click();
        await page.waitForTimeout(1_500);
      }

      // 2. Click "Add Single Catalog"
      const singleBtn = page
        .getByRole("button", { name: /add single catalog/i })
        .or(page.getByText(/add single catalog/i))
        .first();
      if (await singleBtn.isVisible({ timeout: 4_000 }).catch(() => false)) {
        await singleBtn.click();
        await page.waitForTimeout(1_500);
      }

      // 3. Search category "Sarees" and select item
      const searchInput = page
        .locator('input[placeholder*="Try Sarees"], input[placeholder*="search"]')
        .first();
      if (await searchInput.isVisible({ timeout: 4_000 }).catch(() => false)) {
        await searchInput.fill("Sarees");
        await page.waitForTimeout(1_000);

        const firstResult = page.locator('li, div[class*="result"], p:has-text("Sarees")').first();
        if (await firstResult.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await firstResult.click();
          await page.waitForTimeout(1_500);
        }
      }

      await saveStepScreenshot(page, "step1-dashboard");
    })(),
    timeoutMs,
    "Navigate to catalog page",
  );
}

function parseSizeKBFromName(name?: string): number {
  if (!name) return 0;
  const match = name.match(/_?(\d+)kb/i);
  return match ? parseInt(match[1], 10) : 0;
}

async function ensureVariantFilePath(variant: VariantInput): Promise<string> {
  if (variant.path) {
    try {
      await fs.access(variant.path);
      return path.resolve(variant.path);
    } catch {
      // ignore
    }
  }
  if (variant.base64) {
    const tempDir = path.join(PATHS.automationRoot ?? "automation", ".temp_variants");
    await fs.mkdir(tempDir, { recursive: true });
    const cleanBase64 = variant.base64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(cleanBase64, "base64");
    const safeName = (variant.name ?? `${variant.sizeKB}kb`).replace(/[^a-z0-9_-]/gi, "_");
    const filePath = path.join(tempDir, `variant_${safeName}.jpg`);
    await fs.writeFile(filePath, buffer);
    return filePath;
  }
  throw new Error(`Variant ${variant.name ?? variant.sizeKB} missing path or base64 data`);
}

/** Test a single variant: upload → wait for shipping → parse → extract suppliers → screenshot → remove. */
async function testVariant(
  page: Page,
  variant: VariantInput,
  options: AutomationOptions,
  variantIndex: number,
  totalVariants: number,
): Promise<VariantShippingResult> {
  const start = Date.now();
  const variantName = variant.name ?? `${variant.sizeKB}kb`;
  const sizeKB = variant.sizeKB ?? parseSizeKBFromName(variantName);

  const reportProgress = (stage: string, message: string) => {
    logger.info(`[PROGRESS] ${stage}: ${message}`);
    options.onProgress?.({
      stage,
      variantIndex,
      totalVariants,
      variantName,
      message,
    });
  };

  let imageFilePath = "";
  try {
    imageFilePath = await ensureVariantFilePath(variant);

    // 1. Upload stage (20s timeout max)
    reportProgress(
      "upload",
      `Uploading variant ${variantIndex + 1}/${totalVariants} (${variantName})...`,
    );
    const uploadStart = Date.now();
    await saveStepScreenshot(page, "step2-upload");

    const uploadTimeoutMs = options.timeouts?.upload ?? DEFAULT_TIMEOUTS.upload;
    await withTimeout(
      uploadWithErrorCapture(page, imageFilePath, options),
      uploadTimeoutMs,
      "Upload image",
    );
    logger.info(`[TIMER] Upload image stage completed in ${Date.now() - uploadStart}ms`);
    await saveStepScreenshot(page, "step3-after-upload");

    // 2. Read shipping cards stage (20s timeout max)
    reportProgress("shipping", `Extracting shipping rates for ${variantName}...`);
    const shippingStart = Date.now();
    const shippingTimeoutMs =
      options.timeouts?.shippingCalculation ?? DEFAULT_TIMEOUTS.shippingCalculation;

    const suppliers = await withTimeout(
      extractSupplierCards(page),
      shippingTimeoutMs,
      "Read shipping cards",
    );
    logger.info(`[TIMER] Read shipping cards stage completed in ${Date.now() - shippingStart}ms`);

    await saveStepScreenshot(page, "step4-suppliers");

    const lowestCharge =
      suppliers.length > 0 ? Math.min(...suppliers.map((s) => s.shippingCharge)) : 49;
    const bestSupplier =
      suppliers.find((s) => s.shippingCharge === lowestCharge) ?? suppliers[0] ?? null;

    const screenshot = await captureVariantScreenshot(
      page,
      variantName,
      options.screenshotsDir ?? PATHS.screenshotsDir,
    );

    // 3. Delete uploaded image stage (10s timeout max)
    reportProgress("delete", `Deleting uploaded variant ${variantName}...`);
    const deleteStart = Date.now();
    const deleteTimeoutMs = options.timeouts?.deleteImage ?? DEFAULT_TIMEOUTS.deleteImage;

    await withTimeout(
      removeProductImage(page, options).catch(() => undefined),
      deleteTimeoutMs,
      "Delete uploaded image",
    );
    logger.info(`[TIMER] Delete image stage completed in ${Date.now() - deleteStart}ms`);

    const result: VariantShippingResult = {
      sizeKB,
      variantName,
      shippingCharge: lowestCharge,
      imagePath: imageFilePath,
      screenshot,
      processingTimeMs: Date.now() - start,
      status: "success",
      suppliers,
      bestSupplier,
    };

    logger.info("Variant test complete", {
      name: variantName,
      charge: lowestCharge,
      suppliersCount: suppliers.length,
      ms: result.processingTimeMs,
    });

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Variant test failed — stopping immediately", {
      name: variantName,
      error: message,
    });

    const screenshot = await saveStepScreenshot(page, "step5-error").catch(() => "");
    const htmlDump = await dumpDebugHtml(page, "suppliers.html").catch(() => undefined);

    await removeProductImage(page, options).catch(() => undefined);

    return {
      sizeKB,
      variantName,
      shippingCharge: Infinity,
      imagePath: imageFilePath || (variant.path ? path.resolve(variant.path) : ""),
      screenshot,
      processingTimeMs: Date.now() - start,
      status: "failed",
      error: `Failed during variant '${variantName}': ${message}${htmlDump ? ` (HTML dump: ${htmlDump})` : ""}`,
      diagnostics: {
        step: "testVariant",
        url: page.url(),
        title: await page.title().catch(() => ""),
        screenshot,
        htmlDump,
        reason: message,
      },
    };
  }
}

/** Pick the variant with the lowest shipping charge from successful results. */
function selectBestVariant(results: VariantShippingResult[]): VariantShippingResult | null {
  const successful = results.filter(
    (r) => r.status === "success" && Number.isFinite(r.shippingCharge),
  );
  if (successful.length === 0) return null;
  return successful.reduce((best, current) =>
    current.shippingCharge < best.shippingCharge ? current : best,
  );
}

/**
 * Main orchestrator: authenticate, test all variants, return the one with lowest shipping charge.
 * Enforces strict bounded timeouts and stops immediately if an upload fails.
 */
export async function runShippingComparison(
  variants: VariantInput[],
  options: AutomationOptions = {},
): Promise<ShippingComparisonResult> {
  if (variants.length === 0) {
    return {
      success: false,
      bestVariant: null,
      variants: [],
      totalProcessingTimeMs: 0,
      error: "No variants provided for shipping comparison",
    };
  }

  const totalStart = Date.now();
  logger.info("[TIMER] Starting shipping comparison orchestrator", {
    variantCount: variants.length,
  });

  options.onProgress?.({
    stage: "preparing",
    message: "Preparing image variants...",
  });

  let browser: Browser | undefined;
  let context: BrowserContext | undefined;
  let page: Page | undefined;

  try {
    options.onProgress?.({
      stage: "session",
      message: "Launching browser & verifying saved Meesho session...",
    });
    const launchStart = Date.now();

    const auth = await createAuthenticatedContext(options);
    browser = auth.browser;
    context = auth.context;
    page = auth.page;
    logger.info(
      `[TIMER] Browser launch & session verification completed in ${Date.now() - launchStart}ms`,
    );

    options.onProgress?.({
      stage: "navigation",
      message: "Navigating to Meesho Catalog upload panel...",
    });
    const navStart = Date.now();
    await navigateToProductCreation(page, options);
    logger.info(`[TIMER] Navigation to catalog panel completed in ${Date.now() - navStart}ms`);

    const results: VariantShippingResult[] = [];

    for (let i = 0; i < variants.length; i++) {
      const variant = variants[i];
      const result = await testVariant(page, variant, options, i, variants.length);
      results.push(result);

      if (result.status === "failed") {
        logger.warn(
          `Stopping comparison workflow immediately after variant ${result.variantName} failure`,
        );
        break;
      }
    }

    const best = selectBestVariant(results);
    const totalProcessingTimeMs = Date.now() - totalStart;

    const anySuccess = results.some((r) => r.status === "success");
    let failureError: string | undefined;

    if (!anySuccess) {
      const firstFailed = results.find((r) => r.error);
      failureError = firstFailed?.error ?? "No variants could be processed successfully";
      if (page) {
        await saveStepScreenshot(page, "step5-error").catch(() => undefined);
        await dumpDebugHtml(page, "suppliers.html").catch(() => undefined);
      }
    }

    logger.info("[TIMER] Shipping comparison complete", {
      bestVariant: best?.variantName ?? "none",
      bestCharge: best?.shippingCharge ?? null,
      totalMs: totalProcessingTimeMs,
    });

    return {
      success: anySuccess,
      bestVariant: best
        ? {
            sizeKB: best.sizeKB,
            variantName: best.variantName,
            shippingCharge: best.shippingCharge,
            imagePath: best.imagePath,
            screenshot: best.screenshot,
          }
        : null,
      variants: results,
      totalProcessingTimeMs,
      error: anySuccess ? undefined : failureError,
      diagnostics: anySuccess ? undefined : results.find((r) => r.diagnostics)?.diagnostics,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Shipping comparison orchestrator error", { error: message });

    let errScreenshot: string | undefined;
    let htmlDump: string | undefined;
    if (page) {
      errScreenshot = await saveStepScreenshot(page, "step5-error").catch(() => undefined);
      htmlDump = await dumpDebugHtml(page, "suppliers.html").catch(() => undefined);
    }

    return {
      success: false,
      bestVariant: null,
      variants: [],
      totalProcessingTimeMs: Date.now() - totalStart,
      error: `Shipping comparison failed: ${message}`,
      diagnostics: {
        step: "orchestrator",
        url: page?.url(),
        title: await page?.title().catch(() => ""),
        screenshot: errScreenshot,
        htmlDump,
        reason: message,
      },
    };
  } finally {
    if (context) await context.close().catch(() => undefined);
    if (browser) await browser.close().catch(() => undefined);
    logger.debug("Browser & context closed cleanly");
  }
}

/**
 * Discover variant image files in a directory.
 */
export async function discoverVariantsFromDirectory(dir: string): Promise<VariantInput[]> {
  const absoluteDir = path.resolve(dir);
  const entries = await fs.readdir(absoluteDir);

  const variants: VariantInput[] = entries
    .filter((f) => SUPPORTED_IMAGE_EXTENSIONS.some((ext) => f.toLowerCase().endsWith(ext)))
    .sort((a, b) => {
      const aMatch = a.match(/_(\d+)kb/i);
      const bMatch = b.match(/_(\d+)kb/i);
      if (aMatch && bMatch) return parseInt(aMatch[1], 10) - parseInt(bMatch[1], 10);
      return a.localeCompare(b);
    })
    .map((f) => {
      const name = f.replace(/\.[^.]+$/, "");
      return {
        sizeKB: parseSizeKBFromName(name),
        name,
        path: path.join(absoluteDir, f),
      };
    });

  logger.info("Discovered variants", { dir: absoluteDir, count: variants.length });
  return variants;
}

/** Format comparison result for CLI / logging output. */
export function formatComparisonSummary(result: ShippingComparisonResult): string {
  const lines: string[] = ["", "=== Meesho Shipping Comparison Results ===", ""];

  for (const r of result.variants) {
    const status = r.error ? `FAILED (${r.error})` : `₹${r.shippingCharge}`;
    lines.push(`  ${r.variantName.padEnd(20)} ${status.padStart(20)}  (${r.processingTimeMs}ms)`);
  }

  lines.push("");
  if (result.bestVariant) {
    lines.push(
      `  Best variant: ${result.bestVariant.variantName} — ₹${result.bestVariant.shippingCharge}`,
    );
    lines.push(`  Image: ${result.bestVariant.imagePath}`);
    if (result.bestVariant.screenshot) {
      lines.push(`  Screenshot: ${result.bestVariant.screenshot}`);
    }
  } else {
    lines.push("  No successful variant tests.");
  }

  lines.push(`  Total time: ${result.totalProcessingTimeMs}ms`);
  lines.push("");
  return lines.join("\n");
}

export { isMeeshoAutomationError };
