import { ENV } from "../config/constants.js";

export type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function resolveLogLevel(): LogLevel {
  const env = process.env[ENV.logLevel]?.toLowerCase();
  if (env && env in LOG_LEVELS) return env as LogLevel;
  return "info";
}

const currentLevel = resolveLogLevel();

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function formatMessage(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
  const ts = new Date().toISOString();
  const metaStr = meta && Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";
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
