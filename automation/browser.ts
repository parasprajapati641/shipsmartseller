import type { Browser, BrowserContext } from "playwright";
import { chromium } from "playwright";
import { BROWSER_USER_AGENT, ENV } from "./config/constants.js";
import { logger } from "./logger.js";

const DEFAULT_VIEWPORT = { width: 1366, height: 900 };

let sharedBrowser: Browser | undefined;
let sharedBrowserHeadless: boolean | undefined;

/** Whether automation is running in a Node.js environment. */
export function isNodeRuntime(): boolean {
  return typeof process !== "undefined" && Boolean(process.versions?.node);
}

/** Launch Chromium with anti-detection settings used during live inspection. */
export async function launchBrowser(headless?: boolean): Promise<Browser> {
  if (!isNodeRuntime()) {
    throw new Error("Playwright requires Node.js runtime");
  }

  const resolvedHeadless = headless ?? process.env[ENV.headed] !== "1";

  if (sharedBrowser?.isConnected() && sharedBrowserHeadless === resolvedHeadless) {
    logger.debug("Reusing shared browser instance");
    return sharedBrowser;
  }

  if (sharedBrowser) {
    await sharedBrowser.close().catch(() => undefined);
    sharedBrowser = undefined;
  }

  const launchOptions = {
    headless: resolvedHeadless,
    args: ["--disable-blink-features=AutomationControlled", "--no-sandbox"],
  };

  try {
    sharedBrowser = await chromium.launch(launchOptions);
  } catch (err) {
    logger.warn("Standard Playwright chromium launch failed, trying system Chrome channel...");
    try {
      sharedBrowser = await chromium.launch({ ...launchOptions, channel: "chrome" });
    } catch {
      logger.warn("Chrome channel launch failed, trying system Edge channel...");
      sharedBrowser = await chromium.launch({ ...launchOptions, channel: "msedge" });
    }
  }
  sharedBrowserHeadless = resolvedHeadless;

  sharedBrowser.on("disconnected", () => {
    sharedBrowser = undefined;
    sharedBrowserHeadless = undefined;
  });

  return sharedBrowser;
}

/** Create a browser context with Meesho-appropriate defaults. */
export async function createBrowserContext(
  browser: Browser,
  storageState?: any,
): Promise<BrowserContext> {
  const contextOptions: Parameters<Browser["newContext"]>[0] = {
    viewport: DEFAULT_VIEWPORT,
    locale: "en-IN",
    timezoneId: "Asia/Kolkata",
    userAgent: BROWSER_USER_AGENT,
  };

  if (storageState) {
    contextOptions.storageState = storageState;
  }

  const context = await browser.newContext(contextOptions);

  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });

  return context;
}

/** Close the shared browser instance if open. */
export async function closeSharedBrowser(): Promise<void> {
  if (sharedBrowser) {
    await sharedBrowser.close().catch(() => undefined);
    sharedBrowser = undefined;
    sharedBrowserHeadless = undefined;
    logger.debug("Shared browser closed");
  }
}

/** Close a specific browser (and clear shared reference if same). */
export async function closeBrowser(browser?: Browser): Promise<void> {
  if (!browser) return;
  if (browser === sharedBrowser) {
    await closeSharedBrowser();
    return;
  }
  await browser.close().catch(() => undefined);
}
