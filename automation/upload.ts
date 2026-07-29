import fs from "node:fs/promises";
import path from "node:path";
import type { Page } from "playwright";
import { DEFAULT_TIMEOUTS, PATHS } from "./config/constants.js";
import { imageUploadSelectors, resolveSelector } from "./selectors.js";
import { UploadError } from "./errors.js";
import { logger } from "./logger.js";
import { captureFailureScreenshot } from "./login.js";
import type { AutomationOptions } from "./types.js";

/**
 * Production-grade Meesho catalog image upload handler.
 * Leverages direct DOM input setInputFiles, filechooser event handlers,
 * DragEvent dispatchers, and verification of thumbnails and remove buttons.
 */
export async function uploadProductImage(
  page: Page,
  imagePath: string,
  options: AutomationOptions = {},
): Promise<void> {
  const absolutePath = path.resolve(imagePath);
  const selectorsTried: string[] = [];

  try {
    await fs.access(absolutePath);
  } catch {
    throw new UploadError(`Image file not found on disk: ${absolutePath}`);
  }

  logger.info("Starting live-verified image upload workflow", { path: absolutePath });

  // 1. Direct input#addImages or input[type="file"] handler
  selectorsTried.push("input#addImages", 'input[type="file"]');
  const fileInput = page
    .locator('input#addImages, input[id="addImages"], input[type="file"]')
    .first();

  let uploadTriggered = false;

  if ((await fileInput.count().catch(() => 0)) > 0) {
    logger.info("Found catalog image input element");
    try {
      await fileInput
        .evaluate((el) => {
          (el as HTMLElement).style.display = "block";
          (el as HTMLElement).style.visibility = "visible";
          (el as HTMLElement).style.opacity = "1";
        })
        .catch(() => undefined);

      await fileInput.setInputFiles(absolutePath);
      uploadTriggered = true;
      logger.info("File attached via setInputFiles");
    } catch (e) {
      logger.warn("setInputFiles failed, attempting FileChooser event fallback", {
        error: String(e),
      });
    }
  }

  // 2. Native FileChooser event trigger fallback
  if (!uploadTriggered) {
    const uploadTargets = [
      page.locator('label[for="addImages"]'),
      page.locator('label[for*="file"]'),
      page.getByRole("button", { name: /add image|upload image|select image|choose file/i }),
      page.locator('div:has-text("Add Front Image")'),
      page.locator('div:has-text("Upload Image")'),
      page.locator('[class*="dropzone"]'),
      page.locator('[class*="upload"]'),
    ];

    for (const target of uploadTargets) {
      const targetName = String(target);
      selectorsTried.push(targetName);
      if (
        await target
          .first()
          .isVisible({ timeout: 1_000 })
          .catch(() => false)
      ) {
        logger.info("Attempting click for FileChooser event", { target: targetName });
        try {
          const chooserPromise = page.waitForEvent("filechooser", { timeout: 5_000 });
          await target.first().click({ force: true });
          const chooser = await chooserPromise;
          await chooser.setFiles(absolutePath);
          uploadTriggered = true;
          logger.info("File attached via FileChooser event");
          break;
        } catch (e) {
          logger.warn("FileChooser attempt failed", { error: String(e) });
        }
      }
    }
  }

  // 3. Real DragEvent fallback
  if (!uploadTriggered) {
    logger.info("Attempting real DragEvent dispatch with DataTransfer");
    selectorsTried.push("dragAndDropDispatch");
    const dropzone = page
      .locator('[class*="dropzone"], [class*="upload-box"], label[for="addImages"]')
      .first();
    if (await dropzone.isVisible({ timeout: 2_000 }).catch(() => false)) {
      const buffer = await fs.readFile(absolutePath);
      const fileName = path.basename(absolutePath);
      const mimeType = fileName.endsWith(".png") ? "image/png" : "image/jpeg";

      await dropzone
        .evaluate(
          async (el, { base64, name, type }) => {
            const res = await fetch(`data:${type};base64,${base64}`);
            const blob = await res.blob();
            const file = new File([blob], name, { type });
            const dt = new DataTransfer();
            dt.items.add(file);

            el.dispatchEvent(
              new DragEvent("dragenter", { bubbles: true, cancelable: true, dataTransfer: dt }),
            );
            el.dispatchEvent(
              new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer: dt }),
            );
            el.dispatchEvent(
              new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: dt }),
            );
          },
          { base64: buffer.toString("base64"), name: fileName, type: mimeType },
        )
        .catch(() => undefined);

      uploadTriggered = true;
      logger.info("Dispatched DragEvent with DataTransfer");
    }
  }

  // 4. Strict Upload Success Verification
  logger.info(
    "Verifying upload completion (spinner detached, thumbnail visible, delete button active)",
  );

  // Wait for loading spinners to clear
  await page
    .waitForSelector('[class*="spinner"], [class*="loading"], [class*="progress"]', {
      state: "detached",
      timeout: 8_000,
    })
    .catch(() => undefined);
  await page.waitForTimeout(2_000);

  const thumbnailLocators = [
    page.locator('img[src*="blob:"]'),
    page.locator('img[src*="meesho"]'),
    page.locator('[class*="thumbnail"] img'),
    page.locator('[class*="preview"] img'),
    page.locator('[class*="uploaded-image"]'),
  ];

  let thumbnailVisible = false;
  for (const thumbLoc of thumbnailLocators) {
    if ((await thumbLoc.count().catch(() => 0)) > 0) {
      thumbnailVisible = await thumbLoc
        .first()
        .isVisible({ timeout: 3_000 })
        .catch(() => false);
      if (thumbnailVisible) break;
    }
  }

  const removeBtnLocators = [
    page.getByRole("button", { name: /delete|remove/i }),
    page.locator('[class*="delete"]'),
    page.locator('[class*="remove"]'),
    page.locator('svg[class*="trash"]'),
    page.locator('[aria-label*="delete"]'),
  ];

  let removeBtnVisible = false;
  for (const rmLoc of removeBtnLocators) {
    if ((await rmLoc.count().catch(() => 0)) > 0) {
      removeBtnVisible = await rmLoc
        .first()
        .isVisible({ timeout: 2_000 })
        .catch(() => false);
      if (removeBtnVisible) break;
    }
  }

  if (!thumbnailVisible && !removeBtnVisible) {
    const screenshot = await captureFailureScreenshot(
      page,
      "upload_verification_failed",
      options.screenshotsDir,
    );
    const url = page.url();
    const title = await page.title().catch(() => "unknown");
    throw new UploadError(
      `Image upload verification failed — thumbnail or remove button did not appear. URL: ${url} | Title: "${title}" | Selectors tried: ${selectorsTried.join(", ")} | Screenshot: ${screenshot}`,
    );
  }

  logger.info("✅ Image upload verified successfully", { thumbnailVisible, removeBtnVisible });
}

/**
 * Remove the currently uploaded product image before testing the next variant.
 */
export async function removeProductImage(
  page: Page,
  _options: AutomationOptions = {},
): Promise<void> {
  logger.debug("Removing uploaded product image");

  const removeBtnCandidates = [
    page.getByRole("button", { name: /delete|remove/i }),
    page.locator('[class*="delete"]'),
    page.locator('[class*="remove"]'),
    page.locator('svg[class*="trash"]'),
    page.locator('[aria-label*="delete"]'),
  ];

  for (const btnLoc of removeBtnCandidates) {
    if ((await btnLoc.count().catch(() => 0)) > 0) {
      const visible = await btnLoc
        .first()
        .isVisible({ timeout: 1_000 })
        .catch(() => false);
      if (visible) {
        await btnLoc
          .first()
          .click()
          .catch(() => undefined);
        await page.waitForTimeout(1_000);
        logger.debug("Clicked remove image button");
        return;
      }
    }
  }

  const fileInput = page.locator('input#addImages, input[type="file"]').first();
  if ((await fileInput.count().catch(() => 0)) > 0) {
    await fileInput.setInputFiles([]).catch(() => undefined);
    logger.debug("Cleared file input as remove fallback");
  }
}

/** Capture a success/debug screenshot for a variant test. */
export async function captureVariantScreenshot(
  page: Page,
  variantName: string,
  screenshotsDir?: string,
): Promise<string> {
  const dir = screenshotsDir ?? PATHS.screenshotsDir;
  await fs.mkdir(dir, { recursive: true });
  const safeName = variantName.replace(/[^a-z0-9_-]/gi, "_").toLowerCase();
  const filePath = path.join(dir, `variant_${safeName}_${Date.now()}.png`);
  await page.screenshot({ path: filePath, fullPage: true }).catch(() => undefined);
  return filePath;
}

/** Wrapper that captures screenshot on upload failure. */
export async function uploadWithErrorCapture(
  page: Page,
  imagePath: string,
  options: AutomationOptions = {},
): Promise<void> {
  try {
    await uploadProductImage(page, imagePath, options);
  } catch (error) {
    const screenshot = await captureFailureScreenshot(
      page,
      "upload_failure",
      options.screenshotsDir,
    );
    throw new UploadError(
      `Failed to upload ${imagePath}: ${error instanceof Error ? error.message : String(error)}`,
      { screenshotPath: screenshot, cause: error },
    );
  }
}

/** Wait until product creation form is ready for uploads. */
export async function waitForProductFormReady(
  page: Page,
  options: AutomationOptions = {},
): Promise<void> {
  const timeouts = { ...DEFAULT_TIMEOUTS, ...options.timeouts };
  const ready = page.locator('input#addImages, input[type="file"], [class*="dropzone"]');
  await ready
    .first()
    .waitFor({ state: "visible", timeout: timeouts.elementVisible })
    .catch(() => {
      logger.warn("Product creation page upload element ready indicator not found — continuing");
    });
}
