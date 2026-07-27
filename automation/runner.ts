import fs from "node:fs/promises";
import path from "node:path";
import type { Browser, BrowserContext, Page } from "playwright";
import { DEFAULT_TIMEOUTS, MEESHO_URLS, PATHS, SUPPORTED_IMAGE_EXTENSIONS } from "./config/constants.js";
import { productCreationSelectors } from "./config/selectors.js";
import { createAuthenticatedContext, captureFailureScreenshot } from "./login.js";
import { logger } from "./lib/logger.js";
import { isMeeshoAutomationError } from "./lib/errors.js";
import { resolveSelector } from "./lib/selectors.js";
import { getShippingCharge } from "./shipping.js";
import {
  captureVariantScreenshot,
  removeProductImage,
  uploadWithErrorCapture,
} from "./upload.js";
import type {
  AutomationOptions,
  ShippingComparisonResult,
  VariantInput,
  VariantShippingResult,
} from "./types.js";

/** Navigate to the Meesho product creation page. */
async function navigateToProductCreation(page: Page, options: AutomationOptions): Promise<void> {
  const timeouts = { ...DEFAULT_TIMEOUTS, ...options.timeouts };
  logger.info("Navigating to product creation page", { url: MEESHO_URLS.productCreation });

  await page.goto(MEESHO_URLS.productCreation, {
    waitUntil: "domcontentloaded",
    timeout: timeouts.navigation,
  });

  const ready = resolveSelector(page, productCreationSelectors.pageReady);
  await ready
    .first()
    .waitFor({ state: "visible", timeout: timeouts.elementVisible })
    .catch(() => {
      logger.warn("Product creation page ready indicator not found — continuing");
    });
}

/** Test a single variant: upload → wait for shipping → parse → screenshot → remove. */
async function testVariant(
  page: Page,
  variant: VariantInput,
  options: AutomationOptions,
): Promise<VariantShippingResult> {
  const start = Date.now();
  logger.info("Testing variant", { name: variant.name, path: variant.path });

  try {
    await uploadWithErrorCapture(page, variant.path, options);
    const charge = await getShippingCharge(page, options);
    const screenshot = await captureVariantScreenshot(
      page,
      variant.name,
      options.screenshotsDir ?? PATHS.screenshotsDir,
    );

    await removeProductImage(page, options);

    const result: VariantShippingResult = {
      variantName: variant.name,
      shippingCharge: charge.amount,
      imagePath: path.resolve(variant.path),
      screenshot,
      processingTimeMs: Date.now() - start,
    };

    logger.info("Variant test complete", {
      name: variant.name,
      charge: charge.amount,
      ms: result.processingTimeMs,
    });

    return result;
  } catch (error) {
    const screenshot = await captureFailureScreenshot(
      page,
      `variant_${variant.name}_failure`,
      options.screenshotsDir ?? PATHS.screenshotsDir,
    ).catch(() => "");

    await removeProductImage(page, options).catch(() => undefined);

    const message = error instanceof Error ? error.message : String(error);
    logger.error("Variant test failed", { name: variant.name, error: message });

    return {
      variantName: variant.name,
      shippingCharge: Infinity,
      imagePath: path.resolve(variant.path),
      screenshot,
      processingTimeMs: Date.now() - start,
      error: message,
    };
  }
}

/** Pick the variant with the lowest shipping charge from successful results. */
function selectBestVariant(results: VariantShippingResult[]): VariantShippingResult | null {
  const successful = results.filter((r) => r.error === undefined && Number.isFinite(r.shippingCharge));
  if (successful.length === 0) return null;
  return successful.reduce((best, current) =>
    current.shippingCharge < best.shippingCharge ? current : best,
  );
}

/**
 * Main orchestrator: authenticate, test all variants, return the one with lowest shipping charge.
 *
 * @example
 * ```ts
 * const result = await runShippingComparison([
 *   { name: "5kb", path: "./variants/product_5kb.jpg" },
 *   { name: "10kb", path: "./variants/product_10kb.jpg" },
 * ]);
 * console.log(result.best?.shippingCharge);
 * ```
 */
export async function runShippingComparison(
  variants: VariantInput[],
  options: AutomationOptions = {},
): Promise<ShippingComparisonResult> {
  if (variants.length === 0) {
    throw new Error("No variants provided for shipping comparison");
  }

  const totalStart = Date.now();
  logger.info("Starting shipping comparison", { variantCount: variants.length });

  let browser: Browser | undefined;
  let context: BrowserContext | undefined;
  let page: Page | undefined;

  try {
    const auth = await createAuthenticatedContext(options);
    browser = auth.browser;
    context = auth.context;
    page = auth.page;

    await navigateToProductCreation(page, options);

    const results: VariantShippingResult[] = [];
    for (const variant of variants) {
      const result = await testVariant(page, variant, options);
      results.push(result);
    }

    const best = selectBestVariant(results);
    const totalProcessingTimeMs = Date.now() - totalStart;

    logger.info("Shipping comparison complete", {
      bestVariant: best?.variantName ?? "none",
      bestCharge: best?.shippingCharge ?? null,
      totalMs: totalProcessingTimeMs,
    });

    return { best, results, totalProcessingTimeMs };
  } finally {
    if (context) await context.close().catch(() => undefined);
    if (browser) await browser.close().catch(() => undefined);
    logger.debug("Browser closed");
  }
}

/**
 * Discover variant image files in a directory.
 * Matches dashboard naming: `{basename}_{targetKB}kb.jpg`
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
    .map((f) => ({
      name: f.replace(/\.[^.]+$/, ""),
      path: path.join(absoluteDir, f),
    }));

  logger.info("Discovered variants", { dir: absoluteDir, count: variants.length });
  return variants;
}

/** Format comparison result for CLI / logging output. */
export function formatComparisonSummary(result: ShippingComparisonResult): string {
  const lines: string[] = [
    "",
    "=== Meesho Shipping Comparison Results ===",
    "",
  ];

  for (const r of result.results) {
    const status = r.error ? `FAILED (${r.error})` : `₹${r.shippingCharge}`;
    lines.push(`  ${r.variantName.padEnd(20)} ${status.padStart(20)}  (${r.processingTimeMs}ms)`);
  }

  lines.push("");
  if (result.best) {
    lines.push(`  Best variant: ${result.best.variantName} — ₹${result.best.shippingCharge}`);
    lines.push(`  Image: ${result.best.imagePath}`);
    lines.push(`  Screenshot: ${result.best.screenshot}`);
  } else {
    lines.push("  No successful variant tests.");
  }

  lines.push(`  Total time: ${result.totalProcessingTimeMs}ms`);
  lines.push("");
  return lines.join("\n");
}

export { isMeeshoAutomationError };
