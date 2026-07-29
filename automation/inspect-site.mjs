/**
 * One-off site inspection script — extracts DOM structure from Meesho seller portal.
 * Run: node automation/inspect-site.mjs
 */
import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, ".inspect-output");

const URLS = [
  "https://supplier.meesho.com/",
  "https://supplier.meesho.com/panel/v3/new/cataloguing/single/add",
  "https://supplier.meesho.com/panel/v3/home",
];

async function extractPageInfo(page, label) {
  const url = page.url();
  const title = await page.title();

  const info = await page.evaluate(() => {
    const pick = (el) => ({
      tag: el.tagName.toLowerCase(),
      id: el.id || null,
      name: el.getAttribute("name"),
      type: el.getAttribute("type"),
      placeholder: el.getAttribute("placeholder"),
      ariaLabel: el.getAttribute("aria-label"),
      dataTestId: el.getAttribute("data-testid"),
      className: (el.className?.toString?.() || "").slice(0, 120),
      text: (el.textContent || "").trim().slice(0, 80),
      accept: el.getAttribute("accept"),
      href: el.getAttribute("href"),
    });

    const inputs = [
      ...document.querySelectorAll("input, textarea, select, button, a, [role='button']"),
    ]
      .slice(0, 80)
      .map(pick);

    const fileInputs = [...document.querySelectorAll('input[type="file"]')].map(pick);

    const shippingTexts = [...document.querySelectorAll("*")]
      .filter((el) => {
        const t = (el.textContent || "").toLowerCase();
        return (
          el.children.length === 0 &&
          /shipping|logistic|delivery|charge|weight|gram|₹|rs\./i.test(t) &&
          t.length < 200
        );
      })
      .slice(0, 40)
      .map((el) => ({
        tag: el.tagName.toLowerCase(),
        text: (el.textContent || "").trim(),
        className: (el.className?.toString?.() || "").slice(0, 120),
        id: el.id || null,
        dataTestId: el.getAttribute("data-testid"),
      }));

    const headings = [...document.querySelectorAll("h1,h2,h3,h4")].slice(0, 15).map(pick);

    return { inputs, fileInputs, shippingTexts, headings };
  });

  return { label, url, title, ...info };
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: "en-IN",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  const results = [];

  for (const targetUrl of URLS) {
    console.log(`Navigating to ${targetUrl}...`);
    try {
      const resp = await page.goto(targetUrl, { waitUntil: "networkidle", timeout: 60000 });
      await page.waitForTimeout(3000);
      const screenshot = path.join(OUT, `${targetUrl.replace(/[^a-z0-9]+/gi, "_")}.png`);
      await page.screenshot({ path: screenshot, fullPage: true });

      const info = await extractPageInfo(page, targetUrl);
      info.status = resp?.status();
      info.screenshot = screenshot;
      results.push(info);
      console.log(`  -> ${page.url()} (${resp?.status()}) title: ${info.title}`);
    } catch (err) {
      results.push({ label: targetUrl, error: String(err) });
      console.error(`  -> ERROR: ${err.message}`);
    }
  }

  await fs.writeFile(path.join(OUT, "inspection.json"), JSON.stringify(results, null, 2));
  console.log(`\nSaved to ${OUT}/inspection.json`);
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
