import { RETRY_CONFIG } from "../config/constants.js";
import { logger } from "./logger.js";

export type RetryOptions = {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  /** Return true to retry, false to abort immediately. */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  label?: string;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function defaultShouldRetry(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("timeout") ||
      msg.includes("net::") ||
      msg.includes("navigation") ||
      msg.includes("target closed") ||
      msg.includes("detached") ||
      msg.includes("interrupted")
    );
  }
  return false;
}

/**
 * Execute an async function with exponential backoff retry on transient failures.
 */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const maxAttempts = options.maxAttempts ?? RETRY_CONFIG.maxAttempts;
  const initialDelayMs = options.initialDelayMs ?? RETRY_CONFIG.initialDelayMs;
  const maxDelayMs = options.maxDelayMs ?? RETRY_CONFIG.maxDelayMs;
  const backoffMultiplier = options.backoffMultiplier ?? RETRY_CONFIG.backoffMultiplier;
  const shouldRetry = options.shouldRetry ?? defaultShouldRetry;
  const label = options.label ?? "operation";

  let lastError: unknown;
  let delay = initialDelayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const isLastAttempt = attempt >= maxAttempts;

      if (isLastAttempt || !shouldRetry(error, attempt)) {
        throw error;
      }

      logger.warn(`Retrying ${label}`, {
        attempt,
        maxAttempts,
        delayMs: delay,
        error: error instanceof Error ? error.message : String(error),
      });

      await sleep(delay);
      delay = Math.min(delay * backoffMultiplier, maxDelayMs);
    }
  }

  throw lastError;
}
