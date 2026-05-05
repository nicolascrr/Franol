/**
 * Centralized Google Gemini AI client.
 * Single initialization point — all API routes import from here.
 *
 * The API key is read at request time (not module-level) so that
 * missing keys fail explicitly per-request instead of silently at import.
 */

import { GoogleGenAI } from "@google/genai";

let _ai: GoogleGenAI | null = null;

export function getAIClient(): GoogleGenAI {
  if (!_ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "[AI] GEMINI_API_KEY is not configured. Set it in your .env file.",
      );
    }
    _ai = new GoogleGenAI({ apiKey });
  }
  return _ai;
}

/** Clear the cached client (useful for tests) */
export function resetAIClient(): void {
  _ai = null;
}
