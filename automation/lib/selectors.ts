import type { Locator, Page } from "playwright";
import type { SelectorValue } from "../config/selectors.js";

/**
 * Resolve a SelectorValue config entry into a Playwright Locator.
 *
 * Supports:
 *   - CSS string selectors
 *   - "text=..." Playwright text selectors
 *   - { role, name } role-based selectors
 *   - { testId } data-testid selectors
 */
export function resolveSelector(page: Page, selector: SelectorValue): Locator {
  if (typeof selector === "string") {
    if (selector.startsWith("text=")) {
      return page.locator(selector);
    }
    return page.locator(selector);
  }

  if ("testId" in selector) {
    return page.getByTestId(selector.testId);
  }

  if ("role" in selector) {
    return page.getByRole(selector.role, { name: selector.name });
  }

  throw new Error(`Unsupported selector format: ${JSON.stringify(selector)}`);
}

/** Wait for any of the given selectors to become visible. Returns the first match. */
export async function waitForAnySelector(
  page: Page,
  selectors: SelectorValue[],
  timeoutMs: number,
): Promise<Locator> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    for (const sel of selectors) {
      const locator = resolveSelector(page, sel);
      const visible = await locator
        .first()
        .isVisible({ timeout: 1_000 })
        .catch(() => false);
      if (visible) return locator.first();
    }
    await page.waitForTimeout(500);
  }

  throw new Error(`None of the selectors became visible within ${timeoutMs}ms`);
}
