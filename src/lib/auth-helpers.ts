/**
 * Authentication and URL helper utilities for ShipSmart Seller.
 * Ensures consistent canonical domain usage and redirect formatting across auth flows.
 */

export const PRODUCTION_DOMAIN = "https://shipsmartseller.vercel.app";

/**
 * Returns the canonical base URL for the application.
 * Uses window.location.origin when in a browser environment,
 * falling back to the production domain https://shipsmartseller.vercel.app.
 */
export function getCanonicalSiteUrl(): string {
  if (typeof window !== "undefined" && window.location && window.location.origin) {
    // Avoid returning local file origins or invalid strings
    if (
      window.location.origin.startsWith("http://") ||
      window.location.origin.startsWith("https://")
    ) {
      return window.location.origin;
    }
  }
  return PRODUCTION_DOMAIN;
}

/**
 * Formats a absolute redirect callback URL for Supabase Auth calls (signUp, resetPasswordForEmail, etc.).
 * @param path Optional subpath (defaults to "/auth/callback")
 */
export function getAuthCallbackUrl(path: string = "/auth/callback"): string {
  const baseUrl = getCanonicalSiteUrl();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}

/**
 * Formats auth errors into user-friendly messages.
 */
export function formatAuthError(error: unknown): string {
  if (!error) return "An unexpected error occurred during authentication.";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return "Authentication request failed. Please try again.";
}
