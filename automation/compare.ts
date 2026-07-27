import path from "node:path";
import type { Page } from "playwright";
import { DEFAULT_TIMEOUTS, MEESHO_URLS, PATHS } from "./config/constants.js";
import { createAuthenticatedContext, captureFailureScreenshot } from "./login.js";
import { logger } from "./lib/logger.js";
import { extractInrAmount } from "./parser.js";
import { waitForShippingCalculation } from "./shipping.js";
import { captureVariantScreenshot, removeProductImage, uploadWithErrorCapture } from "./upload.js";
import type {
  AutomationOptions,
  SingleImageComparisonResult,
  SupplierResult,
} from "./types.js";

/** Supplier card selectors for Meesho seller portal. */
export const supplierCardSelectors = {
  cardContainer:
    '[class*="supplier-card"], [class*="supplierCard"], [class*="logistic-card"], [class*="courier-card"], [class*="fulfillment"], [class*="shipping-option"], div[class*="card"]:has-text("₹")',
  supplierName:
    '[class*="supplier-name"], [class*="supplierName"], [class*="name"], [class*="title"], h3, h4, strong',
  shippingCharge:
    '[class*="shipping-charge"], [class*="charge"], [class*="amount"], [class*="price"], text=/₹\\s*[\\d,]+/',
  deliveryDays:
    '[class*="delivery"], [class*="eta"], [class*="time"], text=/day|days|express/i',
};

/**
 * Extract all supplier cards from the page DOM.
 */
export async function extractSupplierCards(page: Page): Promise<SupplierResult[]> {
  const suppliers: SupplierResult[] = [];

  try {
    // Attempt 1: Locate explicit card elements
    const cardLocators = page.locator(supplierCardSelectors.cardContainer);
    const count = await cardLocators.count();

    if (count > 0) {
      logger.info(`Found ${count} supplier card containers`);
      for (let i = 0; i < count; i++) {
        const card = cardLocators.nth(i);
        const cardText = (await card.innerText().catch(() => "")).trim();
        if (!cardText) continue;

        const parsedAmount = extractInrAmount(cardText);
        if (!parsedAmount) continue;

        // Name extraction
        let name = "Meesho Partner";
        const nameEl = card.locator(supplierCardSelectors.supplierName);
        if ((await nameEl.count()) > 0) {
          const rawName = await nameEl.first().innerText().catch(() => "");
          if (rawName.trim()) name = rawName.trim();
        } else {
          // Fallback to first non-empty line
          const firstLine = cardText.split("\n")[0]?.trim();
          if (firstLine && firstLine.length < 50 && !firstLine.includes("₹")) {
            name = firstLine;
          }
        }

        // Delivery days extraction
        let deliveryDays: string | undefined;
        const daysMatch = cardText.match(/(\d+(?:-\d+)?\s*(?:days|day|business days))/i);
        if (daysMatch) {
          deliveryDays = daysMatch[1];
        }

        suppliers.push({
          supplierName: name,
          shippingCharge: parsedAmount.amount,
          deliveryDays,
          rawText: cardText,
        });
      }
    }

    // Fallback: If no cards parsed, scan page text sections for shipping charges
    if (suppliers.length === 0) {
      logger.debug("No explicit supplier cards found, scanning page sections...");
      const pageText = await page.locator("body").innerText().catch(() => "");
      const lines = pageText.split("\n").map((l) => l.trim()).filter(Boolean);

      let currentSupplier = "Meesho Express";
      for (const line of lines) {
        const parsed = extractInrAmount(line);
        if (parsed) {
          const daysMatch = line.match(/(\d+(?:-\d+)?\s*(?:days|day))/i);
          suppliers.push({
            supplierName: currentSupplier,
            shippingCharge: parsed.amount,
            deliveryDays: daysMatch ? daysMatch[1] : undefined,
            rawText: line,
          });
        }
      }
    }
  } catch (error) {
    logger.warn("Error extracting supplier cards", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Deduplicate and mark lowest
  const uniqueSuppliers = deduplicateSuppliers(suppliers);

  if (uniqueSuppliers.length > 0) {
    const minCharge = Math.min(...uniqueSuppliers.map((s) => s.shippingCharge));
    for (const s of uniqueSuppliers) {
      if (s.shippingCharge === minCharge) {
        s.isLowest = true;
      }
    }
  }

  return uniqueSuppliers;
}

function deduplicateSuppliers(suppliers: SupplierResult[]): SupplierResult[] {
  const seen = new Map<string, SupplierResult>();
  for (const s of suppliers) {
    const key = `${s.supplierName}_${s.shippingCharge}`;
    if (!seen.has(key)) {
      seen.set(key, s);
    }
  }
  return Array.from(seen.values());
}

/**
 * Compare suppliers for a single optimized image:
 * 1. Authenticate / reuse session
 * 2. Upload optimized image
 * 3. Wait until shipping charges appear
 * 4. Extract every supplier card (name, shipping charge, delivery days)
 * 5. Return structured JSON
 */
export async function compareImageSuppliers(
  imagePath: string,
  options: AutomationOptions = {},
): Promise<SingleImageComparisonResult> {
  const start = Date.now();
  const absolutePath = path.resolve(imagePath);
  logger.info("Starting supplier comparison for single image", { path: absolutePath });

  let authContext;
  try {
    authContext = await createAuthenticatedContext(options);
    const { page } = authContext;

    // Navigate to product creation page
    await page.goto(MEESHO_URLS.productCreation, {
      waitUntil: "domcontentloaded",
      timeout: options.timeouts?.navigation ?? DEFAULT_TIMEOUTS.navigation,
    });

    // Upload image
    await uploadWithErrorCapture(page, absolutePath, options);

    // Wait until shipping charges appear
    const primaryCharge = await waitForShippingCalculation(page, options);

    // Extract all supplier cards
    let suppliers = await extractSupplierCards(page);

    // Fallback: If no supplier card list extracted, wrap primary charge
    if (suppliers.length === 0) {
      suppliers = [
        {
          supplierName: "Meesho Standard Fulfillment",
          shippingCharge: primaryCharge.amount,
          rawText: primaryCharge.rawText,
          isLowest: true,
        },
      ];
    }

    const lowestCharge = Math.min(...suppliers.map((s) => s.shippingCharge));
    const bestSupplier = suppliers.find((s) => s.shippingCharge === lowestCharge) ?? suppliers[0];

    const screenshot = await captureVariantScreenshot(
      page,
      `compare_${path.basename(imagePath)}`,
      options.screenshotsDir ?? PATHS.screenshotsDir,
    );

    // Cleanup image from form
    await removeProductImage(page, options).catch(() => undefined);

    const result: SingleImageComparisonResult = {
      success: true,
      imagePath: absolutePath,
      lowestShippingCharge: lowestCharge,
      bestSupplier,
      suppliers,
      screenshot,
      processingTimeMs: Date.now() - start,
    };

    logger.info("Supplier comparison complete", {
      image: path.basename(imagePath),
      lowestCharge,
      supplierCount: suppliers.length,
    });

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Supplier comparison failed", { image: imagePath, error: message });

    let screenshotPath: string | undefined;
    if (authContext?.page) {
      screenshotPath = await captureFailureScreenshot(
        authContext.page,
        `compare_error_${Date.now()}`,
        options.screenshotsDir ?? PATHS.screenshotsDir,
      ).catch(() => undefined);
    }

    return {
      success: false,
      imagePath: absolutePath,
      lowestShippingCharge: Infinity,
      bestSupplier: null,
      suppliers: [],
      screenshot: screenshotPath,
      processingTimeMs: Date.now() - start,
      error: message,
    };
  } finally {
    if (authContext?.context) {
      await authContext.context.close().catch(() => undefined);
    }
    if (authContext?.browser) {
      await authContext.browser.close().catch(() => undefined);
    }
  }
}
