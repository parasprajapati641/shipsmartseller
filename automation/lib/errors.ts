/** Base error for all Meesho automation failures. */
export class MeeshoAutomationError extends Error {
  readonly code: string;
  readonly screenshotPath?: string;
  readonly cause?: unknown;

  constructor(message: string, code: string, options?: { screenshotPath?: string; cause?: unknown }) {
    super(message);
    this.name = "MeeshoAutomationError";
    this.code = code;
    this.screenshotPath = options?.screenshotPath;
    this.cause = options?.cause;
  }
}

export class LoginError extends MeeshoAutomationError {
  constructor(message: string, options?: { screenshotPath?: string; cause?: unknown }) {
    super(message, "LOGIN_FAILED", options);
    this.name = "LoginError";
  }
}

export class IpBlockedError extends MeeshoAutomationError {
  readonly reason: string = "MEESHO_IP_BLOCKED";
  constructor(message: string, options?: { screenshotPath?: string; cause?: unknown }) {
    super(message, "MEESHO_IP_BLOCKED", options);
    this.name = "IpBlockedError";
  }
}

export class SessionError extends MeeshoAutomationError {
  constructor(message: string, options?: { screenshotPath?: string; cause?: unknown }) {
    super(message, "SESSION_INVALID", options);
    this.name = "SessionError";
  }
}

export class UploadError extends MeeshoAutomationError {
  constructor(message: string, options?: { screenshotPath?: string; cause?: unknown }) {
    super(message, "UPLOAD_FAILED", options);
    this.name = "UploadError";
  }
}

export class ShippingCalculationError extends MeeshoAutomationError {
  constructor(message: string, options?: { screenshotPath?: string; cause?: unknown }) {
    super(message, "SHIPPING_CALC_FAILED", options);
    this.name = "ShippingCalculationError";
  }
}

export class ParseError extends MeeshoAutomationError {
  constructor(message: string, options?: { screenshotPath?: string; cause?: unknown }) {
    super(message, "PARSE_FAILED", options);
    this.name = "ParseError";
  }
}

export class TimeoutError extends MeeshoAutomationError {
  constructor(message: string, options?: { screenshotPath?: string; cause?: unknown }) {
    super(message, "TIMEOUT", options);
    this.name = "TimeoutError";
  }
}

export function isMeeshoAutomationError(error: unknown): error is MeeshoAutomationError {
  return error instanceof MeeshoAutomationError;
}
