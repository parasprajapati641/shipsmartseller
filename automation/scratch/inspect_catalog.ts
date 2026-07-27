import { launchBrowser, createBrowserContext } from "../browser.js";
import { loadSessionStorageState, sessionExists } from "../session.js";

async function main() {
  console.log("=== STEP 6: SEARCH CATEGORY & REACH IMAGE UPLOAD DROPZONE ===");
  const browser = await launchBrowser(true);
  const state = (await sessionExists()) ? await loadSessionStorageState() : undefined;
  const context = await createBrowserContext(browser, state);
  const page = await context.newPage();

  // Navigate to Meesho Panel Home
  await page.goto("https://supplier.meesho.com/panel/v3/new/growth/fnkth/home", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3_000);

  // Click "Catalog Uploads"
  const catBtn = page.getByText("Catalog Uploads").first();
  if (await catBtn.isVisible({ timeout: 5_000 })) {
    await catBtn.click();
    await page.waitForTimeout(3_000);
  }

  // Click "Add Single Catalog"
  const singleBtn = page.getByRole("button", { name: /add single catalog/i }).or(page.getByText(/add single catalog/i)).first();
  if (await singleBtn.isVisible({ timeout: 5_000 })) {
    await singleBtn.click();
    await page.waitForTimeout(3_000);
  }

  console.log("Category page URL:", page.url());

  // Search category
  const searchInput = page.locator('input[placeholder*="Try Sarees"], input[placeholder*="search"]').first();
  if (await searchInput.isVisible({ timeout: 5_000 })) {
    console.log("Searching 'Sarees' in category search...");
    await searchInput.fill("Sarees");
    await page.waitForTimeout(2_000);

    // Pick first search result / suggestion item
    const firstResult = page.locator('li, div[class*="result"], div[class*="item"], p:has-text("Sarees")').first();
    if (await firstResult.isVisible({ timeout: 3_000 }).catch(() => false)) {
      console.log("Clicking first category search result...");
      await firstResult.click();
      await page.waitForTimeout(3_000);
    }
  }

  // Look for "Add Product" or "Continue" button if present
  const continueBtn = page.getByRole("button", { name: /add product|continue|next|select/i }).or(page.getByText(/add product|continue/i)).first();
  if (await continueBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    console.log("Clicking Add Product / Continue button...");
    await continueBtn.click();
    await page.waitForTimeout(3_000);
  }

  console.log("Final Upload Page URL:", page.url());
  console.log("Final Page Title:", await page.title());

  // Inspect exact image file input and dropzone
  const uploadElements = await page.evaluate(() => {
    const fileInputs = Array.from(document.querySelectorAll('input[type="file"]')).map((el) => ({
      tag: "INPUT_FILE",
      id: el.getAttribute("id"),
      name: el.getAttribute("name"),
      class: el.getAttribute("class"),
      accept: el.getAttribute("accept"),
    }));

    const clickables = Array.from(document.querySelectorAll('button, div, label, p, span'))
      .map((el) => ({
        tag: el.tagName,
        class: el.getAttribute("class"),
        text: el.textContent?.trim().slice(0, 50),
      }))
      .filter((el) => /add front image|add primary image|upload front image|upload image|add image|drag and drop|select files/i.test(el.text || ""));

    return { fileInputs, clickables };
  });

  console.log("FINAL FILE INPUTS:", JSON.stringify(uploadElements.fileInputs, null, 2));
  console.log("FINAL UPLOAD BUTTONS/TARGETS:", JSON.stringify(uploadElements.clickables, null, 2));

  await page.screenshot({ path: "automation/.screenshots/final_image_upload_screen.png", fullPage: true });

  await browser.close();
  console.log("=== INSPECTION COMPLETE ===");
}

main().catch((err) => {
  console.error("Error during inspection:", err);
  process.exit(1);
});
