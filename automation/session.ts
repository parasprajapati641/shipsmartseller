import fs from "node:fs/promises";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import type { BrowserContext, Page } from "playwright";
import { DEFAULT_SESSION_TTL_MS, ENV, MEESHO_URLS, PATHS } from "./config/constants.js";
import { navigationSelectors, resolveSelector } from "./selectors.js";
import { SessionError } from "./errors.js";
import { logger } from "./logger.js";
import { withRetry } from "./retry.js";
import type { MeeshoConnectionStatus } from "./types.js";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const SALT = "shipsmart-meesho-session-v1";

type SessionMeta = {
  version: 1;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
};

type PlaywrightStorageState = Awaited<ReturnType<BrowserContext["storageState"]>>;

/** Ensure session and screenshot directories exist. */
export async function ensureAutomationDirs(): Promise<void> {
  await fs.mkdir(PATHS.sessionDir, { recursive: true });
  await fs.mkdir(PATHS.screenshotsDir, { recursive: true });
}

/** Resolve encrypted session file path (allows override). */
export function getSessionPath(override?: string): string {
  return override ?? PATHS.sessionFile;
}

function deriveKey(secret: string): Buffer {
  if (/^[0-9a-fA-F]{64}$/.test(secret)) {
    return Buffer.from(secret, "hex");
  }
  return scryptSync(secret, SALT, 32);
}

function getEncryptionKey(): Buffer {
  const secret = process.env[ENV.sessionSecret];
  if (secret) {
    return deriveKey(secret);
  }

  logger.warn(
    `${ENV.sessionSecret} not set — using ephemeral dev key. Set a 64-char hex key in production.`,
  );
  return scryptSync("shipsmart-dev-ephemeral", SALT, 32);
}

function computeExpiresAt(state: PlaywrightStorageState): string {
  const cookieExpiries = state.cookies
    .map((c) => c.expires)
    .filter((exp): exp is number => typeof exp === "number" && exp > 0);

  if (cookieExpiries.length > 0) {
    const earliestMs = Math.min(...cookieExpiries) * 1000;
    if (earliestMs > Date.now()) {
      return new Date(earliestMs).toISOString();
    }
  }

  return new Date(Date.now() + DEFAULT_SESSION_TTL_MS).toISOString();
}

async function encryptStorageState(state: PlaywrightStorageState): Promise<Buffer> {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const plaintext = Buffer.from(JSON.stringify(state), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]);
}

async function decryptStorageState(payload: Buffer): Promise<PlaywrightStorageState> {
  if (payload.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) {
    throw new SessionError("Encrypted session file is corrupt or truncated");
  }

  const key = getEncryptionKey();
  const iv = payload.subarray(0, IV_LENGTH);
  const tag = payload.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = payload.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return JSON.parse(decrypted.toString("utf8")) as PlaywrightStorageState;
}

async function writeSessionMeta(expiresAt: string, createdAt?: string): Promise<void> {
  const now = new Date().toISOString();
  const meta: SessionMeta = {
    version: 1,
    createdAt: createdAt ?? now,
    updatedAt: now,
    expiresAt,
  };
  await fs.writeFile(PATHS.sessionMetaFile, JSON.stringify(meta, null, 2), "utf8");
}

async function readSessionMeta(): Promise<SessionMeta | null> {
  try {
    const raw = await fs.readFile(PATHS.sessionMetaFile, "utf8");
    return JSON.parse(raw) as SessionMeta;
  } catch {
    return null;
  }
}

/** Migrate legacy plain JSON session to encrypted format. */
export async function migrateLegacySessionIfNeeded(): Promise<void> {
  try {
    await fs.access(PATHS.sessionFile);
    return;
  } catch {
    // no encrypted session
  }

  try {
    await fs.access(PATHS.legacySessionFile);
  } catch {
    return;
  }

  logger.info("Migrating legacy plain session to encrypted storage");
  const raw = await fs.readFile(PATHS.legacySessionFile, "utf8");
  const state = JSON.parse(raw) as PlaywrightStorageState;
  const encrypted = await encryptStorageState(state);
  await fs.writeFile(PATHS.sessionFile, encrypted);
  await writeSessionMeta(computeExpiresAt(state));
  await fs.unlink(PATHS.legacySessionFile);
  logger.info("Legacy session migrated and plain file removed");
}

/** Check whether an encrypted session file exists on disk. */
export async function sessionExists(sessionPath?: string): Promise<boolean> {
  await migrateLegacySessionIfNeeded();
  const file = getSessionPath(sessionPath);
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

/** Load and decrypt Playwright storageState from disk. */
export async function loadSessionStorageState(
  sessionPath?: string,
): Promise<PlaywrightStorageState> {
  await migrateLegacySessionIfNeeded();
  const file = getSessionPath(sessionPath);

  if (!(await sessionExists(file))) {
    throw new SessionError(`No saved session found. Run login first.`);
  }

  const payload = await fs.readFile(file);
  const state = await decryptStorageState(payload);
  logger.info("Loaded encrypted session");
  return state;
}

/** Encrypt and persist Playwright storageState after successful login. */
export async function saveSession(context: BrowserContext, sessionPath?: string): Promise<string> {
  await ensureAutomationDirs();
  const file = getSessionPath(sessionPath);
  const state = await context.storageState();
  const encrypted = await encryptStorageState(state);
  await fs.writeFile(file, encrypted);

  const existingMeta = await readSessionMeta();
  const expiresAt = computeExpiresAt(state);
  await writeSessionMeta(expiresAt, existingMeta?.createdAt);

  logger.info("Encrypted session saved");
  return file;
}

/** Connection status for API / dashboard (does not launch browser). */
export async function getConnectionStatus(): Promise<MeeshoConnectionStatus> {
  await migrateLegacySessionIfNeeded();

  if (!(await sessionExists())) {
    return { connected: false };
  }

  const meta = await readSessionMeta();
  if (!meta) {
    return { connected: true };
  }

  const expired = Date.now() > new Date(meta.expiresAt).getTime();
  if (expired) {
    return {
      connected: false,
      sessionExpired: true,
      expiresAt: meta.expiresAt,
    };
  }

  return {
    connected: true,
    expiresAt: meta.expiresAt,
  };
}

/**
 * Validate that a persisted session is still active by navigating to the panel
 * and checking for login redirect.
 */
export async function isSessionValid(page: Page, timeoutMs = 30_000): Promise<boolean> {
  try {
    await withRetry(
      async () => {
        await page.goto(MEESHO_URLS.productCreation, {
          waitUntil: "domcontentloaded",
          timeout: timeoutMs,
        });
      },
      { label: "session-validation-navigation", maxAttempts: 2 },
    );

    const url = page.url();
    if (
      url.includes("login") ||
      url.includes("signin") ||
      url.includes("auth") ||
      url.includes("/root/")
    ) {
      logger.warn("Session appears expired / unauthenticated — redirected to login", { url });
      return false;
    }

    const indicator = resolveSelector(page, navigationSelectors.panelRoot);
    const visible = await indicator
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    if (visible || url.includes("/panel/v3/new/")) {
      logger.info("Session is valid");
      return true;
    }

    logger.warn("Session validation failed — no panel indicator found");
    return false;
  } catch (error) {
    logger.warn("Session validation error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/** Delete persisted session files. */
export async function clearSession(sessionPath?: string): Promise<void> {
  const file = getSessionPath(sessionPath);
  await fs.unlink(file).catch(() => undefined);
  await fs.unlink(PATHS.sessionMetaFile).catch(() => undefined);
  await fs.unlink(PATHS.legacySessionFile).catch(() => undefined);
  logger.info("Session cleared");
}

/** @deprecated Use loadSessionStorageState — kept for CLI compatibility. */
export async function loadSession(sessionPath?: string): Promise<PlaywrightStorageState> {
  return loadSessionStorageState(sessionPath);
}
