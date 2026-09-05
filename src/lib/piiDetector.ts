/**
 * Lightweight client-side PII detector (Directive 13)
 * Scans text for common sensitive patterns (emails, telephone numbers)
 * Non-blocking advisory check before transmission to the Gemini model.
 */

export interface PiiDetectionResult {
  hasPii: boolean;
  types: ("email" | "phone")[];
  matches: string[];
}

// RFC 5322 compliant simplified email regex
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

// International and North American phone number patterns:
// Matches e.g. +1 (555) 123-4567, 555-123-4567, 555 123 4567, (555) 123 4567, +91 98765 43210, 123-456-7890
const PHONE_REGEX = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;

export function detectPii(text: string): PiiDetectionResult {
  if (!text || typeof text !== "string") {
    return { hasPii: false, types: [], matches: [] };
  }

  const emails = text.match(EMAIL_REGEX) || [];
  const phones = text.match(PHONE_REGEX) || [];

  const types: ("email" | "phone")[] = [];
  if (emails.length > 0) types.push("email");
  if (phones.length > 0) types.push("phone");

  const combined = Array.from(new Set([...emails, ...phones]));

  return {
    hasPii: types.length > 0,
    types,
    matches: combined,
  };
}
