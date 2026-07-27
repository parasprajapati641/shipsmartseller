import type { Browser, BrowserContext } from "playwright";
import { chromium } from "playwright";
import { BROWSER_USER_AGENT, ENV, IS_SERVERLESS } from "./config/constants.js";
import { logger } from "./logger.js";

const DEFAULT_VIEWPORT = { width: 1366, height: 900 };

let sharedBrowser: Browser | undefined;
let sharedBrowserHeadless: boolean | undefined;

/** Whether automation is running in a Node.js environment. */
export function isNodeRuntime(): boolean {
  return typeof process !== "undefined" && Boolean(process.versions?.node);
}

/**
 * Launch Chromium with support for local execution, remote WebSocket CDP endpoint (Browserless/VPS/EC2),
 * or serverless chromium fallback.
 */
export async function launchBrowser(headless?: boolean): Promise<Browser> {
  if (!isNodeRuntime()) {
    throw new Error("Playwright requires Node.js runtime environment");
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

  // Strategy 1: Remote WebSocket Endpoint (Browserless.io, Render, Railway, EC2, VPS)
  const wsEndpoint = process.env.PLAYWRIGHT_WS_ENDPOINT || process.env.BROWSERLESS_WS_ENDPOINT;
  if (wsEndpoint) {
    logger.info("Connecting to remote Playwright browser via WebSocket CDP", { endpoint: wsEndpoint });
    try {
      sharedBrowser = await chromium.connectOverCDP(wsEndpoint);
      sharedBrowserHeadless = resolvedHeadless;
      return sharedBrowser;
    } catch (err) {
      logger.error("Failed to connect to remote Playwright WebSocket endpoint", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Strategy 2: Serverless Chromium (@sparticuz/chromium) if running on Vercel/AWS Lambda
  if (IS_SERVERLESS) {
    try {
      // @ts-ignore optional dynamic import for serverless chromium environment
      const sparticuz: any = await import("@sparticuz/chromium").catch(() => null);
      if (sparticuz?.default) {
        logger.info("Launching serverless @sparticuz/chromium executable");
        const executablePath = await sparticuz.default.executablePath();
        sharedBrowser = await chromium.launch({
          args: sparticuz.default.args,
          executablePath,
          headless: sparticuz.default.headless === true,
        });
        sharedBrowserHeadless = resolvedHeadless;
        return sharedBrowser;
      }
    } catch (err) {
      logger.warn("Serverless @sparticuz/chromium launch attempt failed", { error: String(err) });
    }
  }

  // Strategy 3: Standard Local Chromium / Chrome / Edge Launch
  const launchOptions = {
    headless: resolvedHeadless,
    args: ["--disable-blink-features=AutomationControlled", "--no-sandbox", "--disable-setuid-sandbox"],
  };

  try {
    sharedBrowser = await chromium.launch(launchOptions);
  } catch (err) {
    logger.warn("Standard Playwright chromium launch failed, trying system Chrome channel...");
    try {
      sharedBrowser = await chromium.launch({ ...launchOptions, channel: "chrome" });
    } catch {
      logger.warn("Chrome channel launch failed, trying system Edge channel...");
      try {
        sharedBrowser = await chromium.launch({ ...launchOptions, channel: "msedge" });
      } catch (finalErr) {
        const message = finalErr instanceof Error ? finalErr.message : String(finalErr);
        logger.error("All browser launch strategies failed", { error: message });
        throw new Error(
          `Browser launch failed on server: Chromium binary not found. ` +
            `When running in Vercel Serverless, set PLAYWRIGHT_WS_ENDPOINT to a Browserless/VPS endpoint or deploy to Render/Railway. Details: ${message}`,
        );
      }
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
