import type { Browser, BrowserContext } from "playwright";
import { BROWSER_USER_AGENT, ENV, IS_SERVERLESS } from "./config/constants.js";
import { logger } from "./logger.js";

const DEFAULT_VIEWPORT = { width: 1366, height: 900 };

let sharedBrowser: Browser | undefined;
let sharedBrowserHeadless: boolean | undefined;

/** Whether automation is running in a Node.js environment. */
export function isNodeRuntime(): boolean {
  return typeof process !== "undefined" && Boolean(process.versions?.node);
}

/** Safely resolve Playwright chromium launcher without top-level import crashes. */
async function getChromium() {
  try {
    const pw = await import("playwright");
    return pw.chromium;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Cannot find or load Playwright package in production: ${message}. ` +
        `Set MEESHO_AUTOMATION_API_URL to point to a dedicated automation service (Render/Railway/VPS) or configure PLAYWRIGHT_WS_ENDPOINT.`,
    );
  }
}

/** Get proxy settings from environment if configured (e.g. residential proxy). */
function getProxyOptions() {
  const proxyServer = process.env.MEESHO_PROXY_SERVER || process.env.HTTP_PROXY || process.env.HTTPS_PROXY;
  if (!proxyServer) return undefined;

  const username = process.env.MEESHO_PROXY_USERNAME;
  const password = process.env.MEESHO_PROXY_PASSWORD;

  logger.info("Configuring proxy for Playwright browser", { server: proxyServer });

  return {
    server: proxyServer,
    ...(username && password ? { username, password } : {}),
  };
}

/**
 * Launch Chromium with support for local execution, remote WebSocket CDP endpoint (Browserless/VPS/EC2),
 * proxy servers, or serverless chromium fallback.
 */
export async function launchBrowser(headless?: boolean): Promise<Browser> {
  if (!isNodeRuntime()) {
    throw new Error("Playwright requires Node.js runtime environment");
  }

  const isProductionLinux =
    process.platform === "linux" ||
    Boolean(process.env.RENDER) ||
    Boolean(process.env.RAILWAY_ENVIRONMENT) ||
    process.env.NODE_ENV === "production";

  const resolvedHeadless = isProductionLinux ? true : (headless ?? process.env[ENV.headed] !== "1");

  if (sharedBrowser?.isConnected() && sharedBrowserHeadless === resolvedHeadless) {
    logger.debug("Reusing shared browser instance");
    return sharedBrowser;
  }

  if (sharedBrowser) {
    await sharedBrowser.close().catch(() => undefined);
    sharedBrowser = undefined;
  }

  const chromium = await getChromium();
  const proxy = getProxyOptions();

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
          ...(proxy ? { proxy } : {}),
        });
        sharedBrowserHeadless = resolvedHeadless;
        return sharedBrowser;
      }
    } catch (err) {
      logger.warn("Serverless @sparticuz/chromium launch attempt failed", { error: String(err) });
    }
  }

  // Strategy 3: Chromium Launch
  const linuxArgs = [
    "--disable-blink-features=AutomationControlled",
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--no-first-run",
    "--no-zygote",
    "--disable-features=IsolateOrigins,site-per-process",
  ];

  // In Production / Linux (Render, Docker, Railway, EC2, VPS), use bundled Chromium without channel fallbacks
  if (isProductionLinux) {
    logger.info("Launching Playwright bundled Chromium in Linux/Production environment", {
      headless: resolvedHeadless,
      hasProxy: Boolean(proxy),
    });
    try {
      sharedBrowser = await chromium.launch({
        headless: resolvedHeadless,
        args: linuxArgs,
        ...(proxy ? { proxy } : {}),
      });
      sharedBrowserHeadless = resolvedHeadless;

      sharedBrowser.on("disconnected", () => {
        sharedBrowser = undefined;
        sharedBrowserHeadless = undefined;
      });

      return sharedBrowser;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error("Failed to launch Playwright bundled Chromium in production Linux environment", { error: message });
      throw new Error(`Production Linux Chromium launch failed: ${message}`);
    }
  }

  // Local development fallbacks (Windows / Mac)
  const launchOptions = {
    headless: resolvedHeadless,
    args: linuxArgs,
    ...(proxy ? { proxy } : {}),
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
        throw new Error(`Browser launch failed on local server: ${message}`);
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
