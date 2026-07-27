import type { Locator, Page } from "playwright";

/**
 * Meesho Seller Portal UI selectors.
 *
 * Login selectors verified against automation/.inspect-output/deep-inspection.json
 * (live login page at /panel/v3/new/root/login).
 *
 * Product-page selectors target stable attributes (name, role, type, aria-label).
 * Re-run `MEESHO_HEADED=1 node automation/inspect-after-login.mjs` after Meesho UI changes.
 */

export type SelectorValue =
  | string
  | { role: "button" | "textbox" | "link" | "heading" | "checkbox" | "combobox"; name: string | RegExp }
  | { testId: string };

export type SelectorCategory = {
  [key: string]: SelectorValue;
};

/** Login page — verified live selectors. */
export const loginSelectors: SelectorCategory = {
  emailInput: 'input[name="emailOrPhone"]',
  passwordInput: 'input[name="password"]',
  submitButton: 'button[type="submit"]:has-text("Log in")',
  showPasswordButton: 'button:has-text("Show")',
  otpInput: 'input[name="otp"], input[inputmode="numeric"], input[autocomplete="one-time-code"]',
  otpSubmitButton: { role: "button", name: /verify|submit|continue/i },
  loggedInIndicator: 'a[href*="/panel/v3/new/"], nav, [class*="sidebar"]',
};

/** Product creation page — cataloguing/single/add. */
export const productCreationSelectors: SelectorCategory = {
  pageReady: 'input[type="file"], h1, h2, [class*="cataloguing"], [class*="product"]',
  productTitleInput:
    'input[name="name"], input[name="title"], input[placeholder*="product name" i], textarea[name="name"]',
  categorySelector: '[role="combobox"], input[placeholder*="category" i], [class*="category"] button',
  priceInput: 'input[name="price"], input[name="mrp"], input[placeholder*="price" i], input[placeholder*="mrp" i]',
  weightInput:
    'input[name="weight"], input[name="packageWeight"], input[placeholder*="weight" i], input[placeholder*="gram" i]',
  lengthInput: 'input[name="length"], input[placeholder*="length" i]',
  breadthInput: 'input[name="breadth"], input[name="width"], input[placeholder*="breadth" i]',
  heightInput: 'input[name="height"], input[placeholder*="height" i]',
  saveButton: { role: "button", name: /save|continue|next|submit/i },
};

/** Image upload — file input is the primary target on Meesho cataloguing forms. */
export const imageUploadSelectors: SelectorCategory = {
  fileInput: 'input[type="file"][accept*="image"], input[type="file"]',
  uploadZone: '[class*="upload"], [class*="dropzone"], [class*="image"] label, text=/upload.*image|add.*image|drag.*drop/i',
  imagePreview:
    '[class*="preview"] img, [class*="thumbnail"] img, img[src*="blob:"], img[src*="data:"], [class*="uploaded"] img',
  removeImageButton: { role: "button", name: /remove|delete|clear|close|×|✕/i },
  removeImageIcon: '[aria-label*="remove" i], [aria-label*="delete" i], [class*="remove"], [class*="delete"], button[class*="close"]',
  uploadProgress: '[class*="progress"], [class*="uploading"], [role="progressbar"]',
  uploadComplete: '[class*="preview"] img, [class*="thumbnail"] img, img[src*="blob:"]',
};

/** Shipping charge display — parsed from section text and INR patterns. */
export const shippingChargeSelectors: SelectorCategory = {
  shippingSection:
    '[class*="shipping"], [class*="logistic"], [class*="delivery"], [data-testid*="shipping"], section:has-text("Shipping"), div:has-text("Shipping charge")',
  chargeAmount:
    '[class*="shipping"] [class*="amount"], [class*="shipping"] [class*="charge"], [class*="logistic"] [class*="fee"], text=/₹\\s*[\\d,]+/',
  loadingIndicator: '[class*="loading"], [class*="spinner"], [class*="skeleton"], [aria-busy="true"]',
  calculateButton: { role: "button", name: /calculate|get shipping|shipping charge|check shipping/i },
  errorMessage: '[class*="error"], [role="alert"]',
};

/** Navigation / session validation. */
export const navigationSelectors: SelectorCategory = {
  addProductLink: { role: "link", name: /add product|new product|single add|cataloguing/i },
  catalogMenu: { role: "link", name: /catalog|products|inventory/i },
  userMenu: '[class*="profile"], [class*="avatar"], [data-testid*="user"], [class*="header"] [class*="account"]',
  panelRoot: 'a[href*="/panel/v3/new/"]',
};

export const meeshoSelectors = {
  login: loginSelectors,
  productCreation: productCreationSelectors,
  imageUpload: imageUploadSelectors,
  shippingCharge: shippingChargeSelectors,
  navigation: navigationSelectors,
} as const;

export type MeeshoSelectors = typeof meeshoSelectors;

/**
 * Resolve a SelectorValue config entry into a Playwright Locator.
 */
export function resolveSelector(page: Page, selector: SelectorValue): Locator {
  if (typeof selector === "string") {
    if (selector.startsWith("text=")) {
      return page.locator(selector);
    }
    return page.locator(selector);
  }

  if ("testId" in selector) {
    return page.getByTestId(selector.testId);
  }

  if ("role" in selector) {
    return page.getByRole(selector.role, { name: selector.name });
  }

  throw new Error(`Unsupported selector format: ${JSON.stringify(selector)}`);
}

/** Wait for any of the given selectors to become visible. Returns the first match. */
export async function waitForAnySelector(
  page: Page,
  selectors: SelectorValue[],
  timeoutMs: number,
): Promise<Locator> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    for (const sel of selectors) {
      const locator = resolveSelector(page, sel);
      const visible = await locator
        .first()
        .isVisible({ timeout: 1_000 })
        .catch(() => false);
      if (visible) return locator.first();
    }
    await page.waitForTimeout(500);
  }

  throw new Error(`None of the selectors became visible within ${timeoutMs}ms`);
}
