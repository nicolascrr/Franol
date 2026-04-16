/**
 * Tense mapping utilities — French ↔ Spanish (Rioplatense)
 *
 * Provides:
 * - Tense lists for each language (from JSON data files)
 * - Bidirectional mapping between French and Spanish tense keys
 * - Lookup helpers for quiz configuration and AI prompt engineering
 *
 * @see src/data/tenses-fr.json
 * @see src/data/tenses-es.json
 */

import tensesFrData from "@/data/tenses-fr.json";
import tensesEsData from "@/data/tenses-es.json";
import type { LangCode } from "@/lib/lang";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TenseEntry {
  key: string;
  label: string;
}

// ---------------------------------------------------------------------------
// Tense lists (loaded from JSON)
// ---------------------------------------------------------------------------

export const TENSES_FR: TenseEntry[] = tensesFrData;
export const TENSES_ES: TenseEntry[] = tensesEsData;

// ---------------------------------------------------------------------------
// Bidirectional tense mapping
// ---------------------------------------------------------------------------

/**
 * Maps a French tense key to its Spanish equivalent.
 *
 * Note: `passe_compose` and `passe_simple` both map to `preterito_indefinido`.
 * Note: `futur_proche` maps to `ir_a_infinitif` (periphrastic form).
 */
export const TENSE_MAP_FR_TO_ES: Record<string, string> = {
  present: "presente",
  passe_compose: "preterito_indefinido",
  imparfait: "imperfecto",
  plus_que_parfait: "pluscuamperfecto",
  passe_simple: "preterito_indefinido",
  futur_simple: "futuro_simple",
  futur_proche: "ir_a_infinitif",
  conditionnel: "condicional",
  subjonctif: "subjuntivo",
  gerondif: "gerundio",
};

/**
 * Maps a Spanish tense key to its French equivalent.
 *
 * Note: `preterito_indefinido` maps to `passe_compose` (primary/most common).
 */
export const TENSE_MAP_ES_TO_FR: Record<string, string> = {
  presente: "present",
  preterito_indefinido: "passe_compose",
  imperfecto: "imparfait",
  pluscuamperfecto: "plus_que_parfait",
  futuro_simple: "futur_simple",
  ir_a_infinitif: "futur_proche",
  condicional: "conditionnel",
  subjuntivo: "subjonctif",
  gerundio: "gerondif",
};

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

/**
 * Returns the tense list for the given locale.
 *
 * @param locale - UI locale ("fr" or "es")
 * @returns Array of tense entries with keys and localized labels
 */
export function getTensesForLocale(locale: LangCode): TenseEntry[] {
  return locale === "fr" ? TENSES_FR : TENSES_ES;
}

/**
 * Returns the corresponding tense key in the target language.
 *
 * @param tenseKey - The tense key in the source language
 * @param from - Source language code
 * @param to - Target language code
 * @returns The equivalent tense key in the target language, or the original key if no mapping exists
 *
 * @example
 * getCorrespondingTense("present", "fr", "es")   // "presente"
 * getCorrespondingTense("imperfecto", "es", "fr") // "imparfait"
 */
export function getCorrespondingTense(
  tenseKey: string,
  from: LangCode,
  to: LangCode,
): string {
  if (from === to) return tenseKey;

  const map = from === "fr" ? TENSE_MAP_FR_TO_ES : TENSE_MAP_ES_TO_FR;
  return map[tenseKey] ?? tenseKey;
}

/**
 * Returns the human-readable label for a tense key in the given locale.
 *
 * @param tenseKey - Tense key (e.g., "present", "imperfecto")
 * @param locale - Language for the label
 * @returns The label string, or the key itself if not found
 */
export function getTenseLabel(tenseKey: string, locale: LangCode): string {
  const tenses = getTensesForLocale(locale);
  return tenses.find((t) => t.key === tenseKey)?.label ?? tenseKey;
}
