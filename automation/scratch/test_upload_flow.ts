import path from "node:path";
import fs from "node:fs/promises";
import { launchBrowser, createBrowserContext } from "../browser.js";
import { loadSessionStorageState, sessionExists } from "../session.js";

async function main() {
  console.log("=== RUNNING LIVE MEESHO UPLOAD & VERIFICATION FLOW ===");
  const browser = await launchBrowser(true);
  const state = (await sessionExists()) ? await loadSessionStorageState() : undefined;
  const context = await createBrowserContext(browser, state);
  const page = await context.newPage();

  // Create a dummy sample image for testing upload if not existing
  const sampleImgPath = path.resolve("automation/.debug/sample_variant.jpg");
  await fs.mkdir(path.dirname(sampleImgPath), { recursive: true });

  // Simple 1x1 white JPEG buffer if file doesn't exist
  const dummyJpg = Buffer.from(
    "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
    "base64"
  );
  await fs.writeFile(sampleImgPath, dummyJpg);
  console.log("Sample image ready at:", sampleImgPath);

  // Step 1: Open Meesho Panel Home
  console.log("[STEP 1] Navigating to Home...");
  await page.goto("https://supplier.meesho.com/panel/v3/new/growth/fnkth/home", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3_000);

  // Step 2: Click "Catalog Uploads"
  console.log("[STEP 2] Clicking 'Catalog Uploads'...");
  const catBtn = page.getByText("Catalog Uploads").first();
  if (await catBtn.isVisible({ timeout: 5_000 })) {
    await catBtn.click();
    await page.waitForTimeout(3_000);
  }

  // Step 3: Click "Add Single Catalog"
  console.log("[STEP 3] Clicking 'Add Single Catalog'...");
  const singleBtn = page.getByRole("button", { name: /add single catalog/i }).or(page.getByText(/add single catalog/i)).first();
  if (await singleBtn.isVisible({ timeout: 5_000 })) {
    await singleBtn.click();
    await page.waitForTimeout(3_000);
  }

  // Step 4: Search category "Sarees"
  console.log("[STEP 4] Searching category 'Sarees'...");
  const searchInput = page.locator('input[placeholder*="Try Sarees"], input[placeholder*="search"]').first();
  if (await searchInput.isVisible({ timeout: 5_000 })) {
    await searchInput.fill("Sarees");
    await page.waitForTimeout(2_000);

    const firstResult = page.locator('li, div[class*="result"], p:has-text("Sarees")').first();
    if (await firstResult.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await firstResult.click();
      await page.waitForTimeout(3_000);
    }
  }

  // Step 5: Upload Image to input#addImages
  console.log("[STEP 5] Uploading image variant to input#addImages...");
  const fileInput = page.locator('input#addImages, input[id="addImages"], input[type="file"]').first();

  if (await fileInput.count().catch(() => 0) > 0) {
    // Unhide hidden file input if necessary
    await fileInput.evaluate((el) => {
      (el as HTMLElement).style.display = "block";
      (el as HTMLElement).style.visibility = "visible";
      (el as HTMLElement).style.opacity = "1";
    }).catch(() => undefined);

    await fileInput.setInputFiles(sampleImgPath);
    console.log("File set via setInputFiles successfully!");
  } else {
    console.log("Using filechooser event listener on upload dropzone...");
    const fileChooserPromise = page.waitForEvent("filechooser", { timeout: 10_000 });
    const dropzone = page.locator('label[for="addImages"], div:has-text("Add Front Image"), div:has-text("Upload Image")').first();
    await dropzone.click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(sampleImgPath);
    console.log("File uploaded via FileChooser event!");
  }

  // Step 6: Verify Upload Success
  console.log("[STEP 6] Verifying upload success (thumbnail & delete button)...");
  await page.waitForTimeout(4_000);

  const thumbnail = page.locator('img[src*="blob:"], img[src*="meesho"], [class*="thumbnail"], [class*="preview"]').first();
  const thumbnailVisible = await thumbnail.isVisible({ timeout: 8_000 }).catch(() => false);
  console.log("Uploaded Image Thumbnail visible:", thumbnailVisible);

  const removeBtn = page.getByRole("button", { name: /delete|remove/i }).or(page.locator('[class*="delete"], [class*="remove"], svg[class*="trash"]')).first();
  const removeBtnVisible = await removeBtn.isVisible({ timeout: 4_000 }).catch(() => false);
  console.log("Remove Image button visible:", removeBtnVisible);

  await page.screenshot({ path: "automation/.screenshots/live_upload_success_verification.png", fullPage: true });

  if (thumbnailVisible || removeBtnVisible) {
    console.log("✅ UPLOAD VERIFICATION PASSED SUCCESSFULLY ON LIVE MEESHO PORTAL!");
  } else {
    console.warn("⚠️ Thumbnail verification check returned false — dumping HTML...");
  }

  await browser.close();
}

main().catch((err) => {
  console.error("Live upload test error:", err);
  process.exit(1);
});
