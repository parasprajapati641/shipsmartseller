/**
 * Interactive inspection: opens login, waits for manual auth, then dumps product page DOM.
 * Run: MEESHO_HEADED=1 node automation/inspect-after-login.mjs
 * Complete login in the browser window within 3 minutes.
 */
import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, ".inspect-output");
const LOGIN_TIMEOUT_MS = 180_000;
const PRODUCT_URL = "https://supplier.meesho.com/panel/v3/new/cataloguing/single/add";

async function dumpDom(page, label) {
  await page.waitForLoadState("networkidle", { timeout: 45000 }).catch(() => undefined);
  await page.waitForTimeout(3000);

  const info = await page.evaluate(() => {
    const pick = (el) => ({
      tag: el.tagName.toLowerCase(),
      id: el.id || null,
      name: el.getAttribute("name"),
      type: el.getAttribute("type"),
      placeholder: el.getAttribute("placeholder"),
      ariaLabel: el.getAttribute("aria-label"),
      dataTestId: el.getAttribute("data-testid"),
      role: el.getAttribute("role"),
      className: (el.className?.toString?.() || "").slice(0, 200),
      text: (el.textContent || "").trim().slice(0, 150),
      accept: el.getAttribute("accept"),
    });

    const allInputs = [...document.querySelectorAll("input, textarea, select, button, [role='button']")].map(pick);
    const fileInputs = [...document.querySelectorAll('input[type="file"]')].map(pick);

    const shippingTexts = [...document.querySelectorAll("*")]
      .filter((el) => {
        const t = (el.textContent || "").trim();
        return (
          el.children.length === 0 &&
          /shipping|logistic|delivery|charge|weight|gram|₹|rs\.|upload|remove|delete|preview|image/i.test(t) &&
          t.length < 250
        );
      })
      .slice(0, 100)
      .map((el) => ({
        tag: el.tagName.toLowerCase(),
        text: (el.textContent || "").trim(),
        className: (el.className?.toString?.() || "").slice(0, 200),
        id: el.id || null,
        dataTestId: el.getAttribute("data-testid"),
        ariaLabel: el.getAttribute("aria-label"),
        parentClass: (el.parentElement?.className?.toString?.() || "").slice(0, 100),
      }));

    return {
      url: location.href,
      title: document.title,
      allInputs,
      fileInputs,
      shippingTexts,
      bodySnippet: document.body?.innerText?.slice(0, 5000) || "",
    };
  });

  const shot = path.join(OUT, `${label}.png`);
  await page.screenshot({ path: shot, fullPage: true });
  return { ...info, screenshot: shot, label };
}

async function waitForLogin(page) {
  console.log("Please log in manually in the browser window...");
  const deadline = Date.now() + LOGIN_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const url = page.url();
    if (
      url.includes("/panel/v3/") &&
      !url.includes("/root/login") &&
      !url.includes("/auth/signup")
    ) {
      console.log("Login detected:", url);
      return;
    }
    await page.waitForTimeout(2000);
  }
  throw new Error("Login timeout — complete login within 3 minutes");
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });

  const browser = await chromium.launch({
    headless: false,
    args: ["--disable-blink-features=AutomationControlled", "--no-sandbox"],
  });
  const context = await browser.newContext({
    viewport: { width: 1366, height: 900 },
    locale: "en-IN",
    timezoneId: "Asia/Kolkata",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });

  const page = await context.newPage();
  await page.goto("https://supplier.meesho.com/panel/v3/new/root/login", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  await waitForLogin(page);

  // Save session for reuse
  const sessionPath = path.join(__dirname, ".session", "meesho-session.json");
  await fs.mkdir(path.dirname(sessionPath), { recursive: true });
  await context.storageState({ path: sessionPath });
  console.log("Session saved to", sessionPath);

  const results = [];

  // Try dashboard URLs
  const urls = [
    "https://supplier.meesho.com/panel/v3/new/",
    PRODUCT_URL,
    "https://supplier.meesho.com/panel/v3/new/cataloguing/single",
    "https://supplier.meesho.com/panel/v3/new/cataloguing",
  ];

  for (const url of urls) {
    console.log(`\nInspecting: ${url}`);
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
      const label = url.split("/").slice(-2).join("_") || "page";
      const info = await dumpDom(page, `loggedin_${label}`);
      results.push(info);
      console.log(`  URL: ${info.url}, inputs: ${info.allInputs.length}, files: ${info.fileInputs.length}`);
      if (info.fileInputs.length) console.log("  FILE INPUTS:", JSON.stringify(info.fileInputs, null, 2));
      if (info.shippingTexts.length) {
        console.log("  SHIPPING TEXTS:", JSON.stringify(info.shippingTexts.slice(0, 20), null, 2));
      }
    } catch (e) {
      console.error(`  ERROR: ${e.message}`);
    }
  }

  await fs.writeFile(path.join(OUT, "logged-in-inspection.json"), JSON.stringify(results, null, 2));
  console.log("\nSaved logged-in-inspection.json. Browser closing in 5s...");
  await page.waitForTimeout(5000);
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
