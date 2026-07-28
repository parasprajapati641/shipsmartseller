/**
 * Application Error Logger for ShipSmart Seller Platform
 */
export function reportAppError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;

  const message =
    error instanceof Response
      ? `Response ${error.status}${error.url ? ` at ${error.url}` : ""}`
      : error instanceof Error
        ? error.message
        : String(error);

  console.error("[ShipSmart Runtime Error]", message, {
    route: window.location.pathname,
    ...context,
  });
}
