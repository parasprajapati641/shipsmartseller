import type { Page } from "playwright";
import { DEFAULT_TIMEOUTS } from "./config/constants.js";
import { shippingChargeSelectors } from "./config/selectors.js";
import { ShippingCalculationError } from "./lib/errors.js";
import { logger } from "./lib/logger.js";
import { withRetry } from "./lib/retry.js";
import { resolveSelector } from "./lib/selectors.js";
import { captureFailureScreenshot } from "./login.js";
import { parseShippingChargeFromTexts } from "./parser.js";
import type { AutomationOptions, ParsedShippingCharge } from "./types.js";

/**
 * Wait for Meesho to finish calculating shipping charge after image upload.
 */
export async function waitForShippingCalculation(
  page: Page,
  options: AutomationOptions = {},
): Promise<ParsedShippingCharge> {
  const timeouts = { ...DEFAULT_TIMEOUTS, ...options.timeouts };

  logger.info("Waiting for shipping charge calculation");

  // Click calculate button if manual trigger is required
  const calcBtn = resolveSelector(page, shippingChargeSelectors.calculateButton);
  const calcVisible = await calcBtn
    .first()
    .isVisible({ timeout: 2_000 })
    .catch(() => false);

  if (calcVisible) {
    logger.debug("Clicking calculate shipping button");
    await calcBtn.first().click().catch(() => undefined);
  }

  // Wait for loading indicator to finish
  const loading = resolveSelector(page, shippingChargeSelectors.loadingIndicator);
  const loadingVisible = await loading
    .first()
    .isVisible({ timeout: 1_500 })
    .catch(() => false);

  if (loadingVisible) {
    logger.debug("Shipping calculation in progress…");
    await loading
      .first()
      .waitFor({ state: "hidden", timeout: timeouts.shippingCalculation })
      .catch(() => undefined);
  }

  // Poll for charge appearance
  const deadline = Date.now() + timeouts.shippingCalculation;
  let lastError: Error | undefined;

  while (Date.now() < deadline) {
    try {
      const charge = await readShippingCharge(page);
      logger.info("Shipping charge calculated", { amount: charge.amount, raw: charge.rawText });
      return charge;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      await page.waitForTimeout(1_000);
    }
  }

  const screenshot = await captureFailureScreenshot(
    page,
    "shipping_calc_timeout",
    options.screenshotsDir,
  );
  throw new ShippingCalculationError(
    `Shipping charge not available within ${timeouts.shippingCalculation}ms: ${lastError?.message ?? "unknown"}`,
    { screenshotPath: screenshot },
  );
}

/**
 * Read the current shipping charge from the page DOM.
 */
export async function readShippingCharge(page: Page): Promise<ParsedShippingCharge> {
  const texts: string[] = [];

  // Try dedicated shipping section first
  const section = resolveSelector(page, shippingChargeSelectors.shippingSection);
  const sectionCount = await section.count().catch(() => 0);
  if (sectionCount > 0) {
    for (let i = 0; i < Math.min(sectionCount, 3); i++) {
      const text = await section.nth(i).innerText().catch(() => "");
      if (text) texts.push(text);
    }
  }

  // Try dedicated charge amount selector
  const amountEl = resolveSelector(page, shippingChargeSelectors.chargeAmount);
  const amountCount = await amountEl.count().catch(() => 0);
  if (amountCount > 0) {
    for (let i = 0; i < Math.min(amountCount, 3); i++) {
      const text = await amountEl.nth(i).innerText().catch(() => "");
      if (text) texts.push(text);
    }
  }

  // Fallback: scan visible page text for INR amounts near shipping keywords
  if (texts.length === 0) {
    const bodyText = await page.locator("body").innerText().catch(() => "");
    const relevantLines = bodyText
      .split("\n")
      .filter((line) => /shipping|logistic|delivery|charge|fee|₹|rs\./i.test(line));
    texts.push(...relevantLines);
  }

  if (texts.length === 0) {
    throw new ShippingCalculationError("No shipping charge text found on page");
  }

  return parseShippingChargeFromTexts(texts);
}

/** Retry-wrapped shipping calculation with error capture. */
export async function getShippingCharge(
  page: Page,
  options: AutomationOptions = {},
): Promise<ParsedShippingCharge> {
  return withRetry(() => waitForShippingCalculation(page, options), {
    label: "shipping-calculation",
    maxAttempts: 2,
    shouldRetry: (error) => {
      if (error instanceof ShippingCalculationError) {
        return error.message.includes("not available") || error.message.includes("timeout");
      }
      return false;
    },
  });
}
