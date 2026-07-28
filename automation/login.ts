import fs from "node:fs/promises";
import path from "node:path";
import { chromium, type Browser, type BrowserContext, type Locator, type Page } from "playwright";
import { createBrowserContext, launchBrowser } from "./browser.js";
import { DEFAULT_TIMEOUTS, ENV, MEESHO_URLS, PATHS } from "./config/constants.js";
import { productCreationSelectors } from "./config/selectors.js";
import { IpBlockedError, LoginError } from "./lib/errors.js";
import { logger } from "./lib/logger.js";
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
import type { AutomationOptions, DiagnosticDetail, MeeshoCredentials } from "./types.js";

export type LoginResult = {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  sessionPath: string;
};

const STEP_TIMEOUT = 15_000; // 15 seconds max per step

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

/** Find the first visible locator from a list of candidate locators. */
async function findFirstVisibleLocator(
  locators: Locator[],
  timeoutMs = 2_000,
): Promise<Locator | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    for (const loc of locators) {
      const visible = await loc
        .first()
        .isVisible({ timeout: 400 })
        .catch(() => false);
      if (visible) return loc.first();
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  return null;
}

/** Log live DOM state for diagnostic logging on failure. */
async function captureFullDiagnostics(
  page: Page,
  stepName: string,
  screenshotsDir?: string,
): Promise<DiagnosticDetail> {
  const url = page.url();
  const title = await page.title().catch(() => "unknown");
  const screenshot = await captureFailureScreenshot(page, `login_${stepName}_failure`, screenshotsDir);

  const debugDir = path.join(PATHS.automationRoot ?? "automation", ".debug");
  await fs.mkdir(debugDir, { recursive: true });
  const htmlDumpPath = path.join(debugDir, `login_${stepName}.html`);
  const domDumpPath = path.join(debugDir, `login_${stepName}_dom.json`);

  const html = await page.content().catch(() => "");
  await fs.writeFile(htmlDumpPath, html, "utf8").catch(() => undefined);

  const domDump = await page
    .evaluate(() => {
      return Array.from(document.querySelectorAll("form, input, button, a")).map((el) => ({
        tag: el.tagName,
        type: el.getAttribute("type"),
        name: el.getAttribute("name"),
        id: el.getAttribute("id"),
        text: el.textContent?.trim().slice(0, 40),
      }));
    })
    .catch(() => []);
  await fs.writeFile(domDumpPath, JSON.stringify(domDump, null, 2), "utf8").catch(() => undefined);

  return {
    step: stepName,
    url,
    title,
    screenshot,
    htmlDump: htmlDumpPath,
    domDump: domDumpPath,
  };
}

/**
 * Handle interactive OTP by launching a headed browser, bringing it to front,
 * and waiting until the user submits the OTP manually. Encrypts and saves session once complete.
 */
export async function handleOtpInteractively(
  email: string,
  password?: string,
  sessionPath?: string,
  timeoutMs = 120_000,
): Promise<LoginResult> {
  logger.info("OTP required — launching headed browser window for manual OTP entry", { email });

  const browser = await launchBrowser(false); // Headed mode
  const context = await createBrowserContext(browser);
  const page = await context.newPage();
  await page.bringToFront().catch(() => undefined);

  await page.goto(MEESHO_URLS.login, { waitUntil: "domcontentloaded" });

  const emailInput = page.locator('input[name="emailOrPhone"], input[name="email"]').first();
  if (await emailInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await emailInput.fill(email);
    const passInput = page.locator('input[name="password"]').first();
    if (password && (await passInput.isVisible({ timeout: 2_000 }).catch(() => false))) {
      await passInput.fill(password);
    }
    const submitBtn = page.getByRole("button", { name: /log in|login|submit/i }).first();
    if (await submitBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await submitBtn.click().catch(() => undefined);
    }
  }

  logger.info("Headed browser window open — waiting for user to complete OTP entry");

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const url = page.url();
    if (
      (url.includes("/panel/v3/new/") || url.includes("/dashboard") || url.includes("/cataloguing")) &&
      !url.includes("login") &&
      !url.includes("otp") &&
      !url.includes("auth")
    ) {
      logger.info("OTP verification complete — logged in successfully!");
      const savedPath = await saveSession(context, sessionPath);
      return { browser, context, page, sessionPath: savedPath };
    }
    await page.waitForTimeout(1_500);
  }

  await captureFailureScreenshot(page, "otp_timeout");
  await context.close().catch(() => undefined);
  await browser.close().catch(() => undefined);
  throw new LoginError("OTP verification timed out after 120 seconds.");
}

/**
 * Dynamic production-grade automated login with Access Denied / IP Block detection.
 */
export async function automatedLogin(
  page: Page,
  credentials: MeeshoCredentials,
  timeoutMs: number = STEP_TIMEOUT,
): Promise<{ requiresOtp?: boolean }> {
  logger.info("Starting production automated login", { email: credentials.email });
  page.setDefaultTimeout(STEP_TIMEOUT);

  let response = null;
  try {
    response = await page.goto(MEESHO_URLS.login, { waitUntil: "domcontentloaded", timeout: STEP_TIMEOUT });
  } catch {
    response = await page.goto("https://supplier.meesho.com/", { waitUntil: "domcontentloaded", timeout: STEP_TIMEOUT }).catch(() => null);
  }

  // 1. Detect Access Denied / 403 / IP Block before trying to locate any input fields
  const title = (await page.title().catch(() => "")).trim();
  const statusCode = response?.status() ?? 200;
  const content = await page.content().catch(() => "");

  const isIpBlocked =
    statusCode === 403 ||
    title.toLowerCase().includes("access denied") ||
    title.toLowerCase().includes("403 forbidden") ||
    title.toLowerCase().includes("attention required") ||
    content.toLowerCase().includes("access denied") ||
    content.toLowerCase().includes("cloudflare ray id") ||
    content.toLowerCase().includes("block script");

  if (isIpBlocked) {
    logger.error("Meesho IP block / Access Denied detected on navigation", { title, statusCode, url: page.url() });
    const diag = await captureFullDiagnostics(page, "ip_blocked");
    throw new IpBlockedError(
      "Meesho blocked this server IP before the login page loaded.",
      { screenshotPath: diag.screenshot },
    );
  }

  const loginLink = page.getByRole("link", { name: /login/i }).or(page.locator('a[href*="login"]'));
  if (await loginLink.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
    await loginLink.first().click().catch(() => undefined);
    await page.waitForTimeout(2_000);
  }

  const otpLocators = [
    page.locator('input[name="otp"]'),
    page.locator('input[inputmode="numeric"]'),
    page.getByPlaceholder(/otp/i),
  ];
  const initialOtp = await findFirstVisibleLocator(otpLocators, 1_500);
  if (initialOtp) {
    logger.warn("OTP required before login submission");
    return { requiresOtp: true };
  }

  const emailCandidateLocators = [
    page.locator('input[name="emailOrPhone"]'),
    page.locator('input[name="email"]'),
    page.locator('input[name="phone"]'),
    page.locator('input[name="mobile"]'),
    page.getByPlaceholder(/email|phone|mobile/i),
    page.getByLabel(/email|phone|mobile/i),
    page.locator('input[type="text"], input[type="email"], input[type="tel"]').first(),
  ];

  const emailInput = await findFirstVisibleLocator(emailCandidateLocators, 10_000);

  if (!emailInput) {
    const diag = await captureFullDiagnostics(page, "email_input_missing");
    throw new LoginError(`Could not locate email/phone input. URL: ${diag.url} | Title: "${diag.title}" | Screenshot: ${diag.screenshot}`);
  }

  await emailInput.fill(credentials.email);

  const passwordCandidateLocators = [
    page.locator('input[name="password"]'),
    page.getByPlaceholder(/password/i),
    page.getByLabel(/password/i),
    page.locator('input[type="password"]').first(),
  ];

  const passwordInput = await findFirstVisibleLocator(passwordCandidateLocators, 3_000);

  if (passwordInput) {
    await passwordInput.fill(credentials.password);
  }

  const submitCandidateLocators = [
    page.getByRole("button", { name: /log in|login|sign in|continue|next|submit/i }),
    page.locator('button[type="submit"]'),
    page.locator('button:has-text("Log in"), button:has-text("Login")'),
  ];

  const submitBtn = await findFirstVisibleLocator(submitCandidateLocators, 3_000);

  if (submitBtn) {
    const isEnabled = await submitBtn.isEnabled({ timeout: 1_000 }).catch(() => false);
    if (isEnabled) {
      await submitBtn.click();
    } else {
      if (passwordInput) {
        await passwordInput.press("Enter").catch(() => undefined);
      } else {
        await emailInput.press("Enter").catch(() => undefined);
      }
    }
  }

  if (!passwordInput) {
    const nextPasswordInput = await findFirstVisibleLocator(passwordCandidateLocators, 4_000);
    if (nextPasswordInput) {
      await nextPasswordInput.fill(credentials.password);
      const nextSubmitBtn = await findFirstVisibleLocator(submitCandidateLocators, 3_000);
      if (nextSubmitBtn) {
        await nextSubmitBtn.click().catch(() => nextPasswordInput.press("Enter"));
      }
    }
  }

  const postSubmitOtp = await findFirstVisibleLocator(otpLocators, 3_000);
  if (postSubmitOtp) {
    logger.warn("OTP screen detected post-submission");
    return { requiresOtp: true };
  }

  const deadline = Date.now() + STEP_TIMEOUT;
  while (Date.now() < deadline) {
    const url = page.url();
    if (
      (url.includes("/panel/v3/new/") || url.includes("/dashboard") || url.includes("/cataloguing")) &&
      !url.includes("login") &&
      !url.includes("auth")
    ) {
      logger.info("Automated login verified — redirected to panel", { url });
      return { requiresOtp: false };
    }
    await page.waitForTimeout(1_000);
  }

  const loggedInIndicator = page.locator('a[href*="/panel/v3/new/"], nav, [class*="sidebar"]');
  const loggedIn = await loggedInIndicator.first().isVisible({ timeout: 3_000 }).catch(() => false);

  if (loggedIn) {
    logger.info("Automated login verified via panel indicator");
    return { requiresOtp: false };
  }

  const diag = await captureFullDiagnostics(page, "login_redirect_timeout");
  throw new LoginError(`Login timed out — stayed at URL: ${diag.url} | Title: "${diag.title}" | Screenshot: ${diag.screenshot}`);
}

/**
 * Launch browser, perform login (or reuse session), and return authenticated context.
 * Automatically handles OTP in a headed browser window if required.
 */
export async function login(
  options: AutomationOptions & { credentials?: MeeshoCredentials } = {},
): Promise<LoginResult> {
  await ensureAutomationDirs();

  const headless = options.headless ?? process.env[ENV.headed] !== "1";
  const sessionPath = options.sessionPath;
  const credentials = options.credentials ?? getCredentialsFromEnv();

  if (!credentials) {
    throw new LoginError("No credentials provided for Meesho login. Enter email and password in the dashboard.");
  }

  logger.info("Launching browser for login", { headless });

  const browser = await launchBrowser(headless);
  const context = await createBrowserContext(browser);
  const page = await context.newPage();
  page.setDefaultTimeout(STEP_TIMEOUT);

  try {
    const { requiresOtp } = await automatedLogin(page, credentials, STEP_TIMEOUT);

    if (requiresOtp) {
      logger.info("Switching to interactive headed OTP handler");
      await context.close().catch(() => undefined);
      await browser.close().catch(() => undefined);
      return await handleOtpInteractively(credentials.email, credentials.password, sessionPath);
    }

    const savedPath = await saveSession(context, sessionPath);
    return { browser, context, page, sessionPath: savedPath };
  } catch (error) {
    const screenshot = await captureFailureScreenshot(page, "login_failure", options.screenshotsDir);
    await context.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
    await clearSession(sessionPath);

    if (error instanceof IpBlockedError) {
      throw error;
    }

    throw new LoginError(
      `Login failed: ${error instanceof Error ? error.message : String(error)}`,
      { screenshotPath: screenshot, cause: error },
    );
  }
}

/**
 * Create an authenticated browser context, reusing saved session when valid.
 * Only logs in when required.
 */
export async function createAuthenticatedContext(
  options: AutomationOptions & { credentials?: MeeshoCredentials } = {},
): Promise<LoginResult> {
  await ensureAutomationDirs();

  const headless = options.headless ?? process.env[ENV.headed] !== "1";
  const sessionPath = options.sessionPath;

  const browser = await launchBrowser(headless);

  if (!options.forceLogin && (await sessionExists(sessionPath))) {
    const state = await loadSession(sessionPath);
    const context = await createBrowserContext(browser, state);
    const page = await context.newPage();
    page.setDefaultTimeout(STEP_TIMEOUT);

    const valid = await isSessionValid(page, STEP_TIMEOUT);

    if (valid) {
      logger.info("Reusing valid persisted session — skipping login");
      return { browser, context, page, sessionPath: getSessionPath(sessionPath) };
    }

    logger.warn("Persisted session expired — re-authenticating");
    await context.close();
    await clearSession(sessionPath);
  }

  await browser.close();
  return login({ ...options, forceLogin: true });
}
