import fs from "node:fs/promises";
import path from "node:path";
import type { Page } from "playwright";
import { DEFAULT_TIMEOUTS, PATHS } from "./config/constants.js";
import { imageUploadSelectors, productCreationSelectors, resolveSelector } from "./selectors.js";
import { UploadError } from "./errors.js";
import { logger } from "./logger.js";
import { withRetry } from "./retry.js";
import { captureFailureScreenshot, fillMinimalProductFields } from "./login.js";
import type { AutomationOptions } from "./types.js";

/**
 * Upload a product image to the Meesho product creation form.
 *
 * Strategy:
 *   1. Fill minimal required fields if present
 *   2. Locate hidden file input and set files directly (most reliable)
 *   3. Fallback: click upload zone to trigger file chooser
 */
export async function uploadProductImage(
  page: Page,
  imagePath: string,
  options: AutomationOptions = {},
): Promise<void> {
  const timeouts = { ...DEFAULT_TIMEOUTS, ...options.timeouts };
  const absolutePath = path.resolve(imagePath);

  try {
    await fs.access(absolutePath);
  } catch {
    throw new UploadError(`Image file not found: ${absolutePath}`);
  }

  logger.info("Uploading product image", { path: absolutePath, sizeKB: undefined });

  await fillMinimalProductFields(page, options);

  await withRetry(
    async () => {
      const fileInput = resolveSelector(page, imageUploadSelectors.fileInput);
      const inputCount = await fileInput.count();

      if (inputCount > 0) {
        await fileInput.first().setInputFiles(absolutePath);
      } else {
        const uploadZone = resolveSelector(page, imageUploadSelectors.uploadZone);
        const [fileChooser] = await Promise.all([
          page.waitForEvent("filechooser", { timeout: timeouts.upload }),
          uploadZone.first().click(),
        ]);
        await fileChooser.setFiles(absolutePath);
      }
    },
    { label: "image-upload", maxAttempts: 2 },
  );

  const progress = resolveSelector(page, imageUploadSelectors.uploadProgress);
  const progressVisible = await progress
    .first()
    .isVisible({ timeout: 3_000 })
    .catch(() => false);

  if (progressVisible) {
    await progress
      .first()
      .waitFor({ state: "hidden", timeout: timeouts.upload })
      .catch(() => undefined);
  }

  const preview = resolveSelector(page, imageUploadSelectors.uploadComplete);
  await preview
    .first()
    .waitFor({ state: "visible", timeout: timeouts.upload })
    .catch(() => {
      logger.warn("Image preview not detected — upload may still have succeeded");
    });

  logger.info("Image upload complete", { path: absolutePath });
}

/**
 * Remove the currently uploaded product image before testing the next variant.
 */
export async function removeProductImage(
  page: Page,
  options: AutomationOptions = {},
): Promise<void> {
  const timeouts = { ...DEFAULT_TIMEOUTS, ...options.timeouts };

  logger.debug("Removing uploaded product image");

  const removeBtn = resolveSelector(page, imageUploadSelectors.removeImageButton);
  const removeIcon = resolveSelector(page, imageUploadSelectors.removeImageIcon);

  const btnVisible = await removeBtn
    .first()
    .isVisible({ timeout: 3_000 })
    .catch(() => false);

  if (btnVisible) {
    await removeBtn.first().click();
  } else {
    const iconVisible = await removeIcon
      .first()
      .isVisible({ timeout: 3_000 })
      .catch(() => false);
    if (iconVisible) {
      await removeIcon.first().click();
    } else {
      const fileInput = resolveSelector(page, imageUploadSelectors.fileInput);
      if (await fileInput.first().isVisible({ timeout: 1_000 }).catch(() => false)) {
        await fileInput.first().setInputFiles([]);
        logger.debug("Cleared file input as remove fallback");
        return;
      }
      logger.warn("No remove button found — image may persist between variant tests");
      return;
    }
  }

  const preview = resolveSelector(page, imageUploadSelectors.imagePreview);
  await preview
    .first()
    .waitFor({ state: "hidden", timeout: timeouts.action })
    .catch(() => undefined);

  logger.debug("Product image removed");
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
  await page.screenshot({ path: filePath, fullPage: true });
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
    const screenshot = await captureFailureScreenshot(page, "upload_failure", options.screenshotsDir);
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
  const ready = resolveSelector(page, productCreationSelectors.pageReady);
  await ready
    .first()
    .waitFor({ state: "visible", timeout: timeouts.elementVisible })
    .catch(() => {
      logger.warn("Product creation page ready indicator not found — continuing");
    });
}
