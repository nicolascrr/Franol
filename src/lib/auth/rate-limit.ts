/**
 * Simple in-memory rate limiter for login attempts.
 * Uses a sliding window: tracks attempts per IP in the last `windowMs` milliseconds.
 *
 * In a multi-instance deployment, replace this with Redis-backed rate limiting.
 */

interface AttemptRecord {
  timestamp: number;
}

const attempts = new Map<string, AttemptRecord[]>();

/** Maximum login attempts per window */
const MAX_ATTEMPTS = 5;

/** Window duration in milliseconds (15 minutes) */
const WINDOW_MS = 15 * 60 * 1000;

/** Lockout duration in milliseconds (30 minutes after exceeding) */
const LOCKOUT_MS = 30 * 60 * 1000;

/** Clean up stale entries older than 1 hour (runs every call) */
function cleanup() {
  const cutoff = Date.now() - 60 * 60 * 1000;
  const keysToDelete: string[] = [];
  attempts.forEach((records, key) => {
    const filtered = records.filter((r) => r.timestamp > cutoff);
    if (filtered.length === 0) {
      keysToDelete.push(key);
    } else {
      attempts.set(key, filtered);
    }
  });
  keysToDelete.forEach((key) => attempts.delete(key));
}

export interface RateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  retryAfterMs: number;
}

/**
 * Check if a login attempt is allowed for the given identifier (IP address).
 * Returns whether the attempt is allowed and metadata for rate-limit headers.
 */
export function checkRateLimit(identifier: string): RateLimitResult {
  cleanup();

  const now = Date.now();
  const windowStart = now - WINDOW_MS;
  const records = attempts.get(identifier) || [];

  // Filter to only attempts within the sliding window
  const recentAttempts = records.filter((r) => r.timestamp > windowStart);

  // Check if currently in lockout period
  if (recentAttempts.length >= MAX_ATTEMPTS) {
    const oldestInWindow = recentAttempts[0].timestamp;
    const lockoutEnd = oldestInWindow + LOCKOUT_MS;
    const retryAfterMs = Math.max(0, lockoutEnd - now);

    if (retryAfterMs > 0) {
      return {
        allowed: false,
        remainingAttempts: 0,
        retryAfterMs,
      };
    }
    // Lockout expired — reset
    attempts.set(identifier, []);
    return {
      allowed: true,
      remainingAttempts: MAX_ATTEMPTS - 1,
      retryAfterMs: 0,
    };
  }

  // Record this attempt
  recentAttempts.push({ timestamp: now });
  attempts.set(identifier, recentAttempts);

  return {
    allowed: true,
    remainingAttempts: MAX_ATTEMPTS - recentAttempts.length,
    retryAfterMs: 0,
  };
}

/**
 * Reset rate limit for a given identifier (e.g., after successful login).
 */
export function resetRateLimit(identifier: string): void {
  attempts.delete(identifier);
}
