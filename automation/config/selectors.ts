/**
 * Meesho Seller Portal UI selectors.
 *
 * IMPORTANT: These selectors are PLACEHOLDERS based on common Meesho supplier
 * portal patterns. They MUST be verified and updated against the live Meesho UI
 * using browser DevTools before production use.
 *
 * When Meesho updates their UI:
 *   1. Open the relevant page in Chrome DevTools
 *   2. Inspect elements and prefer stable attributes (data-testid, aria-label, role)
 *   3. Update the matching entry below
 *   4. Re-run `npm run automation:login` to validate
 *
 * Selector format:
 *   - string  → CSS selector or Playwright text selector (prefix with "text=")
 *   - object  → Playwright locator options { role, name } etc.
 */

export type SelectorValue =
  | string
  | { role: "button" | "textbox" | "link" | "heading" | "checkbox"; name: string | RegExp }
  | { testId: string };

export type SelectorCategory = {
  [key: string]: SelectorValue;
};

/** Login page selectors. */
export const loginSelectors: SelectorCategory = {
  /** Email / mobile input on login form. */
  emailInput:
    'input[type="email"], input[name="email"], input[placeholder*="mail" i], input[placeholder*="mobile" i]',
  /** Password input. */
  passwordInput: 'input[type="password"], input[name="password"]',
  /** Primary login / sign-in button. */
  submitButton: { role: "button", name: /sign in|log in|continue|login/i },
  /** OTP input (shown when Meesho uses OTP flow). */
  otpInput: 'input[type="tel"], input[name="otp"], input[placeholder*="otp" i]',
  /** OTP submit button. */
  otpSubmitButton: { role: "button", name: /verify|submit|continue/i },
  /** Element indicating successful login (dashboard nav, user menu, etc.). */
  loggedInIndicator: '[data-testid="dashboard"], nav, [class*="sidebar"], [class*="header"]',
};

/** Product creation page selectors. */
export const productCreationSelectors: SelectorCategory = {
  /** Page heading or container confirming product creation form loaded. */
  pageReady: 'h1, h2, [class*="product"], [data-testid*="product"]',
  /** Product title / name input (may be required before shipping calc). */
  productTitleInput:
    'input[name="title"], input[placeholder*="title" i], input[placeholder*="product name" i]',
  /** Category selector trigger. */
  categorySelector: '[data-testid*="category"], [class*="category"]',
  /** MRP / price input that may trigger shipping recalculation. */
  priceInput:
    'input[name="price"], input[name="mrp"], input[placeholder*="price" i], input[placeholder*="mrp" i]',
  /** Weight input (grams) — shipping charge often depends on weight. */
  weightInput: 'input[name="weight"], input[placeholder*="weight" i], input[placeholder*="gram" i]',
  /** Save / continue button on product form. */
  saveButton: { role: "button", name: /save|continue|next/i },
};

/** Image upload selectors. */
export const imageUploadSelectors: SelectorCategory = {
  /** Hidden file input for product images. */
  fileInput: 'input[type="file"][accept*="image"], input[type="file"]',
  /** Upload zone / drop area (click target fallback). */
  uploadZone: '[class*="upload"], [class*="dropzone"], [data-testid*="upload"]',
  /** Uploaded image preview container. */
  imagePreview: '[class*="preview"], [class*="thumbnail"], img[src*="blob"], img[src*="data:"]',
  /** Remove / delete image button on preview. */
  removeImageButton: { role: "button", name: /remove|delete|close|×|✕/i },
  /** Alternative remove via icon button. */
  removeImageIcon:
    '[aria-label*="remove" i], [aria-label*="delete" i], [class*="remove"], [class*="delete"]',
};

/** Shipping charge display selectors. */
export const shippingChargeSelectors: SelectorCategory = {
  /** Container showing shipping / logistics charge. */
  shippingSection:
    '[class*="shipping"], [class*="logistics"], [data-testid*="shipping"], [data-testid*="logistic"]',
  /** Text node or element containing the charge amount. */
  chargeAmount: '[class*="shipping"] [class*="amount"], [class*="charge"], [class*="fee"]',
  /** Loading indicator while shipping is being calculated. */
  loadingIndicator: '[class*="loading"], [class*="spinner"], [class*="skeleton"]',
  /** "Calculate shipping" trigger button if manual calc is required. */
  calculateButton: { role: "button", name: /calculate|get shipping|shipping charge/i },
  /** Error message when shipping calculation fails. */
  errorMessage: '[class*="error"], [role="alert"]',
};

/** Navigation selectors. */
export const navigationSelectors: SelectorCategory = {
  /** Link to add new product from dashboard. */
  addProductLink: { role: "link", name: /add product|new product|list product/i },
  /** Catalog / products menu item. */
  catalogMenu: { role: "link", name: /catalog|products|inventory/i },
  /** User profile / account menu (session validity check). */
  userMenu: '[class*="profile"], [class*="avatar"], [data-testid*="user"]',
};

/** Combined selector config — single import for all categories. */
export const meeshoSelectors = {
  login: loginSelectors,
  productCreation: productCreationSelectors,
  imageUpload: imageUploadSelectors,
  shippingCharge: shippingChargeSelectors,
  navigation: navigationSelectors,
} as const;

export type MeeshoSelectors = typeof meeshoSelectors;
