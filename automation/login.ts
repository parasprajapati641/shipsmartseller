import path from "node:path";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { DEFAULT_TIMEOUTS, ENV, MEESHO_URLS, PATHS } from "./config/constants.js";
import { loginSelectors, productCreationSelectors } from "./config/selectors.js";
import { LoginError } from "./lib/errors.js";
import { logger } from "./lib/logger.js";
import { withRetry } from "./lib/retry.js";
import { resolveSelector } from "./lib/selectors.js";
import {
  clearSession,
  ensureAutomationDirs,
  getSessionPath,
  isSessionValid,
  loadSession,
  saveSession,
  sessionExists,
} from "./session.js";
import type { AutomationOptions, MeeshoCredentials } from "./types.js";

export type LoginResult = {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  sessionPath: string;
};

/** Read credentials from environment variables or custom options. */
export function getCredentialsFromEnv(): MeeshoCredentials | null {
  const email = process.env[ENV.email];
  const password = process.env[ENV.password];
  if (!email || !password) return null;
  return { email, password };
}

/** Take a failure screenshot and return its path. */
export async function captureFailureScreenshot(
  page: Page,
  label: string,
  screenshotsDir?: string,
): Promise<string> {
  await ensureAutomationDirs();
  const dir = screenshotsDir ?? PATHS.screenshotsDir;
  const safeName = label.replace(/[^a-z0-9_-]/gi, "_").toLowerCase();
  const filePath = path.join(dir, `${safeName}_${Date.now()}.png`);
  await page.screenshot({ path: filePath, fullPage: true }).catch(() => undefined);
  logger.info("Failure screenshot captured", { path: filePath });
  return filePath;
}

/** Fill minimal fields on product creation form if prompted. */
export async function fillMinimalProductFields(
  page: Page,
  _options: AutomationOptions = {},
): Promise<void> {
  const titleInput = resolveSelector(page, productCreationSelectors.productTitleInput);
  const isVisible = await titleInput
    .first()
    .isVisible({ timeout: 1_000 })
    .catch(() => false);
  if (isVisible) {
    await titleInput.first().fill("Test Product").catch(() => undefined);
  }
}

/**
 * Perform interactive login when credentials are not in env.
 * Opens a headed browser and waits for the user to complete login manually.
 */
export async function interactiveLogin(page: Page, timeoutMs: number): Promise<void> {
  logger.info("Interactive login mode — complete login in the browser window");
  await page.goto(MEESHO_URLS.login, { waitUntil: "domcontentloaded" });

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const url = page.url();
    if (
      !url.includes("login") &&
      !url.includes("signin") &&
      !url.includes("auth") &&
      url.includes("meesho.com")
    ) {
      logger.info("Interactive login detected as complete", { url });
      return;
    }
    await page.waitForTimeout(2_000);
  }

  throw new LoginError("Interactive login timed out. Complete login within the allotted time.");
}

/**
 * Automated login using email/password from env or credentials argument.
 */
export async function automatedLogin(
  page: Page,
  credentials: MeeshoCredentials,
  timeoutMs: number,
): Promise<void> {
  logger.info("Starting automated login", { email: credentials.email });

  await withRetry(
    () => page.goto(MEESHO_URLS.login, { waitUntil: "domcontentloaded", timeout: timeoutMs }),
    { label: "login-navigation" },
  );

  // Email step
  const emailInput = resolveSelector(page, loginSelectors.emailInput);
  await emailInput.first().waitFor({ state: "visible", timeout: timeoutMs });
  await emailInput.first().fill(credentials.email);

  const submitBtn = resolveSelector(page, loginSelectors.submitButton);
  await submitBtn.first().click();

  // Password step (may appear on same or next screen)
  const passwordInput = resolveSelector(page, loginSelectors.passwordInput);
  const passwordVisible = await passwordInput
    .first()
    .isVisible({ timeout: 10_000 })
    .catch(() => false);

  if (passwordVisible) {
    await passwordInput.first().fill(credentials.password);
    await submitBtn.first().click();
  }

  // OTP step — if detected, wait for user in headed mode or fail in headless
  const otpInput = resolveSelector(page, loginSelectors.otpInput);
  const otpVisible = await otpInput
    .first()
    .isVisible({ timeout: 5_000 })
    .catch(() => false);

  if (otpVisible) {
    logger.warn("OTP required — set MEESHO_HEADED=1 and complete OTP manually, or use interactive login");
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const url = page.url();
      if (!url.includes("login") && !url.includes("otp") && url.includes("meesho.com/panel")) {
        logger.info("OTP login completed");
        return;
      }
      await page.waitForTimeout(2_000);
    }
    throw new LoginError("OTP login timed out.");
  }

  // Wait for redirect to dashboard
  await page.waitForURL(/meesho\.com\/(panel|dashboard)/, { timeout: timeoutMs }).catch(async () => {
    const indicator = resolveSelector(page, loginSelectors.loggedInIndicator);
    await indicator.first().waitFor({ state: "visible", timeout: 15_000 });
  });

  logger.info("Automated login successful", { url: page.url() });
}

/**
 * Launch browser, perform login (or reuse session), and return authenticated context.
 */
export async function login(
  options: AutomationOptions & { credentials?: MeeshoCredentials } = {},
): Promise<LoginResult> {
  await ensureAutomationDirs();

  const headless = options.headless ?? process.env[ENV.headed] !== "1";
  const timeouts = { ...DEFAULT_TIMEOUTS, ...options.timeouts };
  const sessionPath = options.sessionPath;

  logger.info("Launching browser for login", { headless });

  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: "en-IN",
    timezoneId: "Asia/Kolkata",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(timeouts.elementVisible);

  try {
    const credentials = options.credentials ?? getCredentialsFromEnv();

    if (credentials) {
      await automatedLogin(page, credentials, timeouts.login);
    } else {
      logger.warn(`Env vars ${ENV.email} / ${ENV.password} not set — using interactive login`);
      await interactiveLogin(page, timeouts.login);
    }

    const savedPath = await saveSession(context, sessionPath);
    return { browser, context, page, sessionPath: savedPath };
  } catch (error) {
    const screenshot = await captureFailureScreenshot(page, "login_failure", options.screenshotsDir);
    await context.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
    await clearSession(sessionPath);

    throw new LoginError(
      `Login failed: ${error instanceof Error ? error.message : String(error)}`,
      { screenshotPath: screenshot, cause: error },
    );
  }
}

/**
 * Create an authenticated browser context, reusing saved session when valid.
 * Falls back to login if session is missing or expired.
 */
export async function createAuthenticatedContext(
  options: AutomationOptions & { credentials?: MeeshoCredentials } = {},
): Promise<LoginResult> {
  await ensureAutomationDirs();

  const headless = options.headless ?? process.env[ENV.headed] !== "1";
  const sessionPath = options.sessionPath;
  const timeouts = { ...DEFAULT_TIMEOUTS, ...options.timeouts };

  const browser = await chromium.launch({ headless });

  if (!options.forceLogin && (await sessionExists(sessionPath))) {
    const state = await loadSession(sessionPath);
    const context = await browser.newContext({ storageState: state });
    const page = await context.newPage();
    page.setDefaultTimeout(timeouts.elementVisible);

    const valid = await isSessionValid(page, timeouts.navigation);

    if (valid) {
      logger.info("Reusing valid persisted session");
      return { browser, context, page, sessionPath: getSessionPath(sessionPath) };
    }

    logger.warn("Persisted session expired — re-authenticating");
    await context.close();
    await clearSession(sessionPath);
  }

  // Need fresh login — close the browser we opened and delegate to login()
  await browser.close();
  return login({ ...options, forceLogin: true });
}
