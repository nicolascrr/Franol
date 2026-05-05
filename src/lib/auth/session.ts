/**
 * HMAC-SHA256 signed session tokens.
 *
 * Token format:  <base64url(payload)>.<hex(hmac-sha256)>
 *
 * Uses the Web Crypto API (crypto.subtle) which works in both:
 *   - Edge Runtime (Next.js middleware)
 *   - Node.js runtime (API routes)
 *
 * The HMAC is keyed with APP_PASSWORD (or SESSION_SECRET if set), so:
 *   - Tokens cannot be forged without knowing the secret
 *   - Changing the password invalidates all active sessions
 *   - No database or extra dependencies needed
 */

/** Session cookie maximum age in milliseconds (24 hours) */
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

interface SessionPayload {
  authenticated: boolean;
  timestamp: number;
}

// ────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────

/**
 * Create a signed session token.
 * Returns: <base64url(payload)>.<hmac_hex>
 */
export async function signSession(payload: SessionPayload): Promise<string> {
  const secret = getSecret();
  const payloadB64 = base64urlEncode(JSON.stringify(payload));
  const signature = await hmacSign(payloadB64, secret);
  return `${payloadB64}.${signature}`;
}

/**
 * Verify a signed session token.
 * Returns the parsed payload if valid (signature OK + not expired),
 * or null if the token is invalid, tampered, or expired.
 */
export async function verifySession(token: string): Promise<SessionPayload | null> {
  if (!token || typeof token !== "string") return null;

  const dotIndex = token.indexOf(".");
  if (dotIndex === -1) return null;

  const payloadB64 = token.substring(0, dotIndex);
  const providedSignature = token.substring(dotIndex + 1);

  // Verify HMAC signature
  const secret = getSecret();
  const expectedSignature = await hmacSign(payloadB64, secret);

  if (!timingSafeCompare(providedSignature, expectedSignature)) {
    return null; // Tampered or forged
  }

  // Decode payload
  let payload: SessionPayload;
  try {
    const json = base64urlDecode(payloadB64);
    payload = JSON.parse(json);
  } catch {
    return null;
  }

  // Validate fields
  if (!payload.authenticated) return null;

  const timestamp = typeof payload.timestamp === "number" ? payload.timestamp : 0;
  if (timestamp <= 0 || Date.now() - timestamp > SESSION_MAX_AGE_MS) {
    return null; // Expired
  }

  return payload;
}

// ────────────────────────────────────────────
// Internal helpers
// ────────────────────────────────────────────

/**
 * Get the HMAC signing secret from environment.
 * Uses SESSION_SECRET if set, otherwise falls back to APP_PASSWORD.
 */
function getSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.APP_PASSWORD;
  if (!secret) {
    throw new Error(
      "[Session] No signing secret. Set SESSION_SECRET or APP_PASSWORD in .env.",
    );
  }
  return secret;
}

/**
 * HMAC-SHA256 sign a string using the Web Crypto API.
 * Returns the hex digest.
 */
async function hmacSign(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(data),
  );

  // ArrayBuffer → hex string
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Timing-safe string comparison.
 * Compares every character regardless of where the first difference is,
 * making it impossible to infer the expected value by measuring response time.
 */
function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Base64url encode (URL-safe base64 without padding).
 */
function base64urlEncode(str: string): string {
  return Buffer.from(str, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Base64url decode.
 */
function base64urlDecode(b64url: string): string {
  let b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const padding = b64.length % 4;
  if (padding === 2) b64 += "==";
  else if (padding === 3) b64 += "=";

  return Buffer.from(b64, "base64").toString("utf-8");
}
