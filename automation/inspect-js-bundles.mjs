/**
 * Extract selector hints from Meesho panel JS bundles (no login required).
 */
import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, ".inspect-output");

const KEYWORDS = [
  "shipping",
  "logistic",
  "delivery",
  "weight",
  "file",
  "upload",
  "cataloguing",
  "charge",
  "emailOrPhone",
  "removeImage",
  "imagePreview",
];

async function main() {
  await fs.mkdir(OUT, { recursive: true });

  const browser = await chromium.launch({
    headless: false,
    args: ["--disable-blink-features=AutomationControlled"],
  });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });

  const page = await context.newPage();
  const scriptUrls = new Set();

  page.on("response", async (resp) => {
    const url = resp.url();
    if (/\.(js|mjs)(\?|$)/i.test(url) && url.includes("meesho")) {
      scriptUrls.add(url);
    }
  });

  await page.goto("https://supplier.meesho.com/panel/v3/new/root/login", {
    waitUntil: "networkidle",
    timeout: 90000,
  });
  await page.waitForTimeout(3000);

  // Also try product page to load its chunks
  await page
    .goto("https://supplier.meesho.com/panel/v3/new/cataloguing/single/add", {
      waitUntil: "networkidle",
      timeout: 90000,
    })
    .catch(() => undefined);
  await page.waitForTimeout(3000);

  console.log(`Collected ${scriptUrls.size} script URLs`);

  const hits = [];
  for (const url of [...scriptUrls].slice(0, 40)) {
    try {
      const resp = await page.request.get(url);
      const text = await resp.text();
      for (const kw of KEYWORDS) {
        const re = new RegExp(`.{0,80}${kw}.{0,80}`, "gi");
        let m;
        let count = 0;
        while ((m = re.exec(text)) !== null && count < 5) {
          hits.push({ url: url.split("/").pop(), keyword: kw, snippet: m[0].replace(/\s+/g, " ") });
          count++;
        }
      }
    } catch {
      // skip
    }
  }

  await fs.writeFile(
    path.join(OUT, "js-hints.json"),
    JSON.stringify({ scriptCount: scriptUrls.size, hits }, null, 2),
  );
  console.log(`Found ${hits.length} keyword hits -> js-hints.json`);

  // Also dump login page HTML for data attributes
  await page.goto("https://supplier.meesho.com/panel/v3/new/root/login", {
    waitUntil: "domcontentloaded",
  });
  const html = await page.content();
  await fs.writeFile(path.join(OUT, "login-page.html"), html);

  await browser.close();
}

main().catch(console.error);
