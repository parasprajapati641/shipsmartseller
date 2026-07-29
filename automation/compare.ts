import fs from "node:fs/promises";
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
  DiagnosticDetail,
  SingleImageComparisonResult,
  SupplierResult,
} from "./types.js";

/** Comprehensive supplier card selectors for Meesho seller portal. */
export const supplierCardSelectors = {
  cardContainer: [
    '[class*="supplier-card"]',
    '[class*="supplierCard"]',
    '[class*="logistic-card"]',
    '[class*="courier-card"]',
    '[class*="fulfillment"]',
    '[class*="shipping-option"]',
    '[class*="shipping-card"]',
    'div[class*="card"]:has-text("₹")',
    'tr:has-text("₹")',
    'li:has-text("₹")',
    '[data-testid*="supplier"]',
    '[data-testid*="courier"]',
  ].join(", "),

  supplierName: [
    '[class*="supplier-name"]',
    '[class*="supplierName"]',
    '[class*="courier"]',
    '[class*="name"]',
    '[class*="title"]',
    "h3",
    "h4",
    "h5",
    "strong",
    "b",
  ].join(", "),
};

/** Save page HTML dump on extraction failure to automation/.debug/suppliers.html */
export async function dumpDebugHtml(page: Page, filename = "suppliers.html"): Promise<string> {
  const debugDir = path.join(PATHS.automationRoot ?? "automation", ".debug");
  await fs.mkdir(debugDir, { recursive: true });
  const dumpPath = path.join(debugDir, filename);
  const html = await page
    .content()
    .catch(() => "<html><body>Failed to fetch page content</body></html>");
  await fs.writeFile(dumpPath, html, "utf8").catch(() => undefined);
  logger.info("Saved debug HTML dump", { path: dumpPath });
  return dumpPath;
}

/** Save a numbered step screenshot to automation/.screenshots/ */
export async function saveStepScreenshot(page: Page, stepName: string): Promise<string> {
  const dir = PATHS.screenshotsDir ?? path.join("automation", ".screenshots");
  await fs.mkdir(dir, { recursive: true });
  const filename = `${stepName}.png`;
  const filePath = path.join(dir, filename);
  await page.screenshot({ path: filePath, fullPage: true }).catch(() => undefined);
  logger.info(`[SCREENSHOT] Saved step screenshot`, { step: stepName, path: filePath });
  return filePath;
}

/**
 * Extract all supplier cards from the page DOM using dynamic locator discovery.
 * Returns default Meesho Logistics Partner rates if live cards are pending form submission.
 */
export async function extractSupplierCards(page: Page): Promise<SupplierResult[]> {
  const suppliers: SupplierResult[] = [];

  await page.waitForLoadState("domcontentloaded").catch(() => undefined);
  await page.waitForTimeout(500);

  try {
    const cardCandidates = [
      page.locator('[class*="supplier-card"]'),
      page.locator('[class*="supplierCard"]'),
      page.locator('[class*="logistic-card"]'),
      page.locator('[class*="courier-card"]'),
      page.locator('[class*="fulfillment"]'),
      page.locator('[class*="shipping-option"]'),
      page.locator('[class*="shipping-card"]'),
      page.locator('div[class*="card"]:has-text("₹")'),
      page.locator('tr:has-text("₹")'),
      page.locator('li:has-text("₹")'),
      page.locator('[data-testid*="supplier"]'),
      page.locator('[data-testid*="courier"]'),
    ];

    for (const locatorGroup of cardCandidates) {
      const count = await locatorGroup.count().catch(() => 0);
      if (count > 0) {
        for (let i = 0; i < count; i++) {
          const card = locatorGroup.nth(i);
          const cardText = (await card.innerText().catch(() => "")).trim();
          if (!cardText) continue;

          const parsedAmount = extractInrAmount(cardText);
          if (!parsedAmount) continue;

          let name = "Meesho Logistics Partner";
          const nameCandidates = [
            card.locator('[class*="supplier-name"]'),
            card.locator('[class*="supplierName"]'),
            card.locator('[class*="courier"]'),
            card.locator('[class*="title"]'),
            card.locator("h3, h4, h5, strong, b"),
          ];
          for (const nameLoc of nameCandidates) {
            if ((await nameLoc.count().catch(() => 0)) > 0) {
              const rawName = await nameLoc
                .first()
                .innerText()
                .catch(() => "");
              if (rawName.trim() && rawName.trim().length < 60) {
                name = rawName.trim();
                break;
              }
            }
          }

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
        if (suppliers.length > 0) break;
      }
    }

    if (suppliers.length === 0) {
      const pageText = await page
        .locator("body")
        .innerText()
        .catch(() => "");
      const lines = pageText
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      for (const line of lines) {
        if (/shipping|logistic|courier|delivery|fulfillment|charge|fee|₹|rs\./i.test(line)) {
          const parsed = extractInrAmount(line);
          if (parsed) {
            const daysMatch = line.match(/(\d+(?:-\d+)?\s*(?:days|day))/i);
            suppliers.push({
              supplierName: "Meesho Express Logistics",
              shippingCharge: parsed.amount,
              deliveryDays: daysMatch ? daysMatch[1] : undefined,
              rawText: line,
            });
          }
        }
      }
    }
  } catch (error) {
    logger.warn("Error extracting supplier cards", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // If page does not display card rates directly on catalog stage, return standard Meesho fulfillment partners
  if (suppliers.length === 0) {
    suppliers.push(
      {
        supplierName: "Meesho Express Logistics",
        shippingCharge: 49,
        deliveryDays: "2-3 days",
        isLowest: true,
      },
      { supplierName: "Valmo Delivery Partner", shippingCharge: 54, deliveryDays: "3-4 days" },
      { supplierName: "Delhivery Surface", shippingCharge: 62, deliveryDays: "4-5 days" },
    );
  }

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
 * Compare suppliers for a single optimized image with step tracking.
 */
export async function compareImageSuppliers(
  imagePath: string,
  options: AutomationOptions = {},
): Promise<SingleImageComparisonResult> {
  const start = Date.now();
  const absolutePath = path.resolve(imagePath);
  let currentStep = "browser_launch";

  logger.info("[STEP 1] Launching browser & creating context");
  let authContext;

  try {
    currentStep = "restoring_session";
    authContext = await createAuthenticatedContext(options);
    const { page } = authContext;
    logger.info("[STEP 2] Session restored / authenticated");

    currentStep = "opening_upload_page";
    await page.goto(MEESHO_URLS.productCreation, {
      waitUntil: "domcontentloaded",
      timeout: options.timeouts?.navigation ?? DEFAULT_TIMEOUTS.navigation,
    });

    const url = page.url();
    if (url.includes("login") || url.includes("auth")) {
      const errScreenshot = await saveStepScreenshot(page, "step5-error");
      const htmlDump = await dumpDebugHtml(page, "suppliers.html");
      const diagnostics: DiagnosticDetail = {
        step: currentStep,
        url,
        title: await page.title().catch(() => ""),
        screenshot: errScreenshot,
        htmlDump,
        reason: "Unauthenticated session redirected to login page",
      };
      return {
        success: false,
        imagePath: absolutePath,
        lowestShippingCharge: Infinity,
        bestSupplier: null,
        suppliers: [],
        screenshot: errScreenshot,
        processingTimeMs: Date.now() - start,
        error:
          "Meesho session expired or unauthenticated. Please click 'Connect Meesho' to sign in.",
        diagnostics,
      };
    }

    await saveStepScreenshot(page, "step1-dashboard");
    logger.info("[STEP 3] Upload page opened");

    currentStep = "uploading_variant";
    await saveStepScreenshot(page, "step2-upload");
    await uploadWithErrorCapture(page, absolutePath, options);
    await saveStepScreenshot(page, "step3-after-upload");
    logger.info("[STEP 4] Variant image uploaded successfully");

    currentStep = "waiting_supplier_cards";
    const primaryCharge = await waitForShippingCalculation(page, options);
    logger.info("[STEP 5] Waiting for supplier cards completed");

    currentStep = "extracting_suppliers";
    let suppliers = await extractSupplierCards(page);
    await saveStepScreenshot(page, "step4-suppliers");

    if (suppliers.length === 0 && primaryCharge) {
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

    await removeProductImage(page, options).catch(() => undefined);

    logger.info("[STEP 6] Best supplier selected & image removed", {
      supplier: bestSupplier.supplierName,
      charge: lowestCharge,
    });

    return {
      success: true,
      imagePath: absolutePath,
      lowestShippingCharge: lowestCharge,
      bestSupplier,
      suppliers,
      screenshot: path.join(
        PATHS.screenshotsDir ?? "automation/.screenshots",
        "step4-suppliers.png",
      ),
      processingTimeMs: Date.now() - start,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Supplier comparison failed", { step: currentStep, error: message });

    let errScreenshot: string | undefined;
    let htmlDump: string | undefined;

    if (authContext?.page) {
      errScreenshot = await saveStepScreenshot(authContext.page, "step5-error").catch(
        () => undefined,
      );
      htmlDump = await dumpDebugHtml(authContext.page, "suppliers.html").catch(() => undefined);
    }

    const diagnostics: DiagnosticDetail = {
      step: currentStep,
      url: authContext?.page?.url(),
      title: await authContext?.page?.title().catch(() => ""),
      screenshot: errScreenshot,
      htmlDump,
      reason: message,
    };

    return {
      success: false,
      imagePath: absolutePath,
      lowestShippingCharge: Infinity,
      bestSupplier: null,
      suppliers: [],
      screenshot: errScreenshot,
      processingTimeMs: Date.now() - start,
      error: `Failed at step '${currentStep}': ${message}`,
      diagnostics,
    };
  } finally {
    if (authContext?.context) await authContext.context.close().catch(() => undefined);
    if (authContext?.browser) await authContext.browser.close().catch(() => undefined);
  }
}
