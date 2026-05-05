/**
 * Timing-safe string comparison to prevent timing attacks on password checks.
 *
 * Uses a constant-time algorithm that always compares every character
 * regardless of where the strings differ, making it impossible to infer
 * the correct password by measuring response times.
 */

/**
 * Compare two strings in constant time.
 * Returns true if they are identical, false otherwise.
 *
 * The algorithm XORs the character codes and accumulates the result,
 * so the execution time does not depend on where the first difference occurs.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  // Convert to same-length comparison by checking length separately
  // (length is not secret in most cases, but we minimize the timing leak)
  const aLen = a.length;
  const bLen = b.length;

  // Always compare the full length of the longer string
  const maxLen = Math.max(aLen, bLen);

  let result = aLen ^ bLen; // Non-zero if lengths differ

  for (let i = 0; i < maxLen; i++) {
    const aCode = i < aLen ? a.charCodeAt(i) : 0;
    const bCode = i < bLen ? b.charCodeAt(i) : 0;
    result |= aCode ^ bCode;
  }

  return result === 0;
}
