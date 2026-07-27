/**
 * Headed inspection with anti-bot evasion for Meesho supplier portal.
 */
import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, ".inspect-output");

async function extractPageInfo(page) {
  return page.evaluate(() => {
    const pick = (el) => ({
      tag: el.tagName.toLowerCase(),
      id: el.id || null,
      name: el.getAttribute("name"),
      type: el.getAttribute("type"),
      placeholder: el.getAttribute("placeholder"),
      ariaLabel: el.getAttribute("aria-label"),
      dataTestId: el.getAttribute("data-testid"),
      className: (el.className?.toString?.() || "").slice(0, 150),
      text: (el.textContent || "").trim().slice(0, 100),
      accept: el.getAttribute("accept"),
    });

    return {
      url: location.href,
      title: document.title,
      inputs: [...document.querySelectorAll("input, textarea, select, button")].slice(0, 100).map(pick),
      fileInputs: [...document.querySelectorAll('input[type="file"]')].map(pick),
      links: [...document.querySelectorAll("a[href]")]
        .slice(0, 30)
        .map((a) => ({ text: a.textContent?.trim().slice(0, 60), href: a.getAttribute("href") })),
      shippingTexts: [...document.querySelectorAll("*")]
        .filter((el) => {
          const t = (el.textContent || "").toLowerCase();
          return (
            el.children.length === 0 &&
            /shipping|logistic|delivery|charge|weight|gram|₹|rs\.|upload|catalog/i.test(t) &&
            t.length < 150
          );
        })
        .slice(0, 50)
        .map((el) => ({
          tag: el.tagName.toLowerCase(),
          text: (el.textContent || "").trim(),
          className: (el.className?.toString?.() || "").slice(0, 150),
          id: el.id || null,
        })),
    };
  });
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });

  const browser = await chromium.launch({
    headless: false,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
      "--disable-dev-shm-usage",
    ],
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
  const results = [];

  const urls = [
    "https://supplier.meesho.com/",
    "https://supplier.meesho.com/panel/v3/new/cataloguing/single/add",
  ];

  for (const url of urls) {
    console.log(`Navigating: ${url}`);
    try {
      const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
      await page.waitForTimeout(5000);
      const info = await extractPageInfo(page);
      info.status = resp?.status();
      const shot = path.join(OUT, `headed_${Date.now()}.png`);
      await page.screenshot({ path: shot, fullPage: true });
      info.screenshot = shot;
      results.push(info);
      console.log(`  status=${resp?.status()} url=${info.url} title=${info.title}`);
      console.log(`  inputs=${info.inputs.length} fileInputs=${info.fileInputs.length}`);
    } catch (e) {
      results.push({ url, error: String(e) });
      console.error(`  ERROR: ${e.message}`);
    }
  }

  await fs.writeFile(path.join(OUT, "headed-inspection.json"), JSON.stringify(results, null, 2));
  console.log("Done. Closing in 3s...");
  await page.waitForTimeout(3000);
  await browser.close();
}

main().catch(console.error);
