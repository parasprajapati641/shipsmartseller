/**
 * Parse shipping charge amounts from Meesho page text/DOM content.
 *
 * Handles common Indian currency formats:
 *   ₹49, ₹ 49.00, Rs. 49, INR 49, 49/-, etc.
 */

import { ParseError } from "./lib/errors.js";
import { logger } from "./lib/logger.js";
import type { ParsedShippingCharge } from "./types.js";

/** Regex patterns for INR amounts, ordered from most to least specific. */
const INR_PATTERNS: RegExp[] = [
  /(?:₹|Rs\.?\s*|INR\s*)([\d,]+(?:\.\d{1,2})?)/gi,
  /([\d,]+(?:\.\d{1,2})?)\s*(?:₹|\/\-|INR)/gi,
  /shipping[\s\S]{0,40}?([\d,]+(?:\.\d{1,2})?)/gi,
  /logistic[s]?[\s\S]{0,40}?([\d,]+(?:\.\d{1,2})?)/gi,
  /charge[\s\S]{0,30}?([\d,]+(?:\.\d{1,2})?)/gi,
];

function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/,/g, "").trim();
  const value = parseFloat(cleaned);
  if (Number.isNaN(value) || value < 0) return null;
  return value;
}

/**
 * Extract the first valid INR amount from a text string.
 */
export function extractInrAmount(text: string): ParsedShippingCharge | null {
  for (const pattern of INR_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const amount = parseAmount(match[1]);
      if (amount !== null) {
        return { amount, currency: "INR", rawText: match[0].trim() };
      }
    }
  }
  return null;
}

/**
 * Extract shipping charge from multiple candidate text blocks.
 * Returns the smallest positive amount found (shipping charges are typically single values).
 */
export function parseShippingChargeFromTexts(texts: string[]): ParsedShippingCharge {
  const candidates: ParsedShippingCharge[] = [];

  for (const text of texts) {
    const parsed = extractInrAmount(text);
    if (parsed) candidates.push(parsed);
  }

  if (candidates.length === 0) {
    throw new ParseError(
      `Could not parse shipping charge from text: ${texts.join(" | ").slice(0, 200)}`,
    );
  }

  // Prefer the candidate whose surrounding text mentions shipping/logistics
  const shippingContext = candidates.find((c) =>
    /shipping|logistic|delivery|charge|fee/i.test(c.rawText),
  );
  if (shippingContext) return shippingContext;

  // Otherwise return the first valid amount
  logger.debug("Multiple charge candidates found, using first", {
    count: candidates.length,
    amounts: candidates.map((c) => c.amount),
  });
  return candidates[0];
}

/**
 * Parse shipping charge from raw page HTML or innerText.
 */
export function parseShippingChargeFromHtml(html: string): ParsedShippingCharge {
  // Strip HTML tags for text extraction
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return parseShippingChargeFromTexts([text]);
}
