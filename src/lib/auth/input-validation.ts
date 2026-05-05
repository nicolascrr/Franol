/**
 * Input validation and sanitization utilities for API routes.
 * Prevents injection attacks and malformed input.
 */

/**
 * Sanitize a string input by:
 * 1. Trimming whitespace
 * 2. Removing null bytes
 * 3. Normalizing unicode (NFC)
 * 4. Enforcing a maximum length
 *
 * Returns empty string if input is invalid or too long.
 */
export function sanitizeStringInput(
  input: unknown,
  maxLength: number = 1000,
): string {
  if (typeof input !== "string") return "";

  const sanitized = input
    .trim()
    .replace(/\0/g, "") // Remove null bytes
    .normalize("NFC"); // Normalize unicode

  if (sanitized.length > maxLength) return "";
  if (sanitized.length === 0) return "";

  return sanitized;
}

/**
 * Validate that a value is a non-empty string within a set of allowed values.
 */
export function validateEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | null {
  if (typeof value !== "string") return null;
  return allowed.includes(value as T) ? (value as T) : null;
}

/**
 * Validate that a number is within a range.
 */
export function validateNumber(
  value: unknown,
  min: number,
  max: number,
): number | null {
  const num = typeof value === "number" ? value : parseInt(String(value), 10);
  if (isNaN(num) || num < min || num > max) return null;
  return num;
}

/**
 * Validate an array of strings, filtering invalid entries.
 */
export function validateStringArray(
  value: unknown,
  maxItemLength: number = 200,
  maxItems: number = 100,
): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().replace(/\0/g, ""))
    .filter((item) => item.length > 0 && item.length <= maxItemLength)
    .slice(0, maxItems);
}
