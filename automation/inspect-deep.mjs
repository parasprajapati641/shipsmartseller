/**
 * Deep inspection of Meesho login + product creation pages (headed, anti-bot).
 */
import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, ".inspect-output");

async function launchBrowser() {
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
  return { browser, context };
}

async function dumpDom(page, label) {
  await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => undefined);
  await page.waitForTimeout(2000);

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
      className: (el.className?.toString?.() || "").slice(0, 180),
      text: (el.textContent || "").trim().slice(0, 120),
      accept: el.getAttribute("accept"),
      href: el.getAttribute("href"),
    });

    const allInputs = [
      ...document.querySelectorAll(
        "input, textarea, select, button, [role='button'], [role='textbox']",
      ),
    ].map(pick);
    const fileInputs = [...document.querySelectorAll('input[type="file"]')].map(pick);
    const labels = [...document.querySelectorAll("label")].slice(0, 40).map(pick);

    const shippingTexts = [...document.querySelectorAll("*")]
      .filter((el) => {
        const t = (el.textContent || "").trim();
        return (
          el.children.length === 0 &&
          /shipping|logistic|delivery charge|shipping charge|weight|gram|₹|rs\.|upload image|remove|delete image|catalog/i.test(
            t,
          ) &&
          t.length < 200
        );
      })
      .slice(0, 80)
      .map((el) => ({
        tag: el.tagName.toLowerCase(),
        text: (el.textContent || "").trim(),
        className: (el.className?.toString?.() || "").slice(0, 180),
        id: el.id || null,
        dataTestId: el.getAttribute("data-testid"),
        ariaLabel: el.getAttribute("aria-label"),
      }));

    return {
      url: location.href,
      title: document.title,
      allInputs,
      fileInputs,
      labels,
      shippingTexts,
      bodySnippet: document.body?.innerText?.slice(0, 3000) || "",
    };
  });

  const shot = path.join(OUT, `${label.replace(/[^a-z0-9]+/gi, "_")}.png`);
  await page.screenshot({ path: shot, fullPage: true });
  return { ...info, screenshot: shot, label };
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const { browser, context } = await launchBrowser();
  const page = await context.newPage();
  const results = [];

  const pages = [
    { url: "https://supplier.meesho.com/panel/v3/new/root/login", label: "login" },
    {
      url: "https://supplier.meesho.com/panel/v3/new/cataloguing/single/add",
      label: "product_add",
    },
    { url: "https://supplier.meesho.com/panel/v3/home", label: "dashboard" },
  ];

  for (const { url, label } of pages) {
    console.log(`\n=== ${label}: ${url} ===`);
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
      const info = await dumpDom(page, label);
      results.push(info);
      console.log(`Final URL: ${info.url}`);
      console.log(`Title: ${info.title}`);
      console.log(`Inputs: ${info.allInputs.length}, File inputs: ${info.fileInputs.length}`);
      if (info.allInputs.length) {
        console.log("Sample inputs:", JSON.stringify(info.allInputs.slice(0, 10), null, 2));
      }
      if (info.shippingTexts.length) {
        console.log("Shipping-related:", JSON.stringify(info.shippingTexts.slice(0, 15), null, 2));
      }
    } catch (e) {
      console.error(`ERROR: ${e.message}`);
      results.push({ label, url, error: String(e) });
    }
  }

  await fs.writeFile(path.join(OUT, "deep-inspection.json"), JSON.stringify(results, null, 2));
  console.log("\nSaved deep-inspection.json");
  await browser.close();
}

main().catch(console.error);
