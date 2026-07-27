import { ENV } from "./config/constants.js";

export type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const SENSITIVE_KEYS = /password|secret|cookie|otp|token|credential|authorization/i;

function resolveLogLevel(): LogLevel {
  const env = process.env[ENV.logLevel]?.toLowerCase();
  if (env && env in LOG_LEVELS) return env as LogLevel;
  return "info";
}

const currentLevel = resolveLogLevel();

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function sanitizeMeta(meta?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!meta) return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (SENSITIVE_KEYS.test(key)) {
      out[key] = "[redacted]";
    } else {
      out[key] = value;
    }
  }
  return out;
}

function formatMessage(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
  const ts = new Date().toISOString();
  const safeMeta = sanitizeMeta(meta);
  const metaStr = safeMeta && Object.keys(safeMeta).length > 0 ? ` ${JSON.stringify(safeMeta)}` : "";
  return `[${ts}] [meesho-automation] [${level.toUpperCase()}] ${message}${metaStr}`;
}

export const logger = {
  debug(message: string, meta?: Record<string, unknown>): void {
    if (shouldLog("debug")) console.debug(formatMessage("debug", message, meta));
  },

  info(message: string, meta?: Record<string, unknown>): void {
    if (shouldLog("info")) console.info(formatMessage("info", message, meta));
  },

  warn(message: string, meta?: Record<string, unknown>): void {
    if (shouldLog("warn")) console.warn(formatMessage("warn", message, meta));
  },

  error(message: string, meta?: Record<string, unknown>): void {
    if (shouldLog("error")) console.error(formatMessage("error", message, meta));
  },
};
