/**
 * Language abstraction layer — MIGRATION POINT
 *
 * PURPOSE
 * -------
 * All DB field accesses for bilingual data go through getLangValue() and
 * getLangArray() rather than hitting item.word_fr / item.word_es directly.
 *
 * This means a future migration from flat paired columns:
 *   vocabulary { word_fr, word_es, aliases_fr, aliases_es }
 * to a normalised translation table:
 *   word_translations { word_id, language_code, value, aliases[] }
 *
 * …only requires changing the bodies of getLangValue() and getLangArray().
 * Every component and page that calls them stays untouched.
 *
 * CURRENT IMPLEMENTATION
 * ----------------------
 * Reads flat columns using the naming convention `${fieldBase}_${lang}`:
 *   getLangValue(vocab, "word", "fr")  →  vocab.word_fr
 *   getLangArray(vocab, "aliases", "es")  →  vocab.aliases_es
 */

/** ISO 639-1 codes of languages currently supported by the app. */
export type LangCode = "fr" | "es";

/**
 * A language pair: source = user's native language, target = language being learned.
 * Extending to a new language only requires adding an entry to LOCALE_TO_LANG_PAIR.
 */
export interface LanguagePair {
  source: LangCode;
  target: LangCode;
}

/**
 * Template-literal direction type, e.g. "fr-to-es" | "es-to-fr".
 * Automatically valid for every LangCode added above.
 */
export type QuizDirection = `${LangCode}-to-${LangCode}`;

/** Maps UI locale → language pair (source = native, target = learned). */
export const LOCALE_TO_LANG_PAIR: Record<LangCode, LanguagePair> = {
  fr: { source: "fr", target: "es" },
  es: { source: "es", target: "fr" },
};

// ---------------------------------------------------------------------------
// Core field accessors
// @migration — change only these two bodies when normalising the schema
// ---------------------------------------------------------------------------

/**
 * Read a language-specific string field from a flat DB record.
 *
 * @example
 *   getLangValue(vocab, "word", "fr")  →  vocab.word_fr
 *
 * @migration
 *   When moving to word_translations rows, replace the body with:
 *   return record.translations?.find(t => t.language_code === lang && t.field === fieldBase)?.value ?? "";
 */
export function getLangValue(
  record: object,
  fieldBase: string,
  lang: LangCode,
): string {
  const key = `${fieldBase}_${lang}`;
  return ((record as Record<string, unknown>)[key] as string | null | undefined) ?? "";
}

/**
 * Read a language-specific array field from a flat DB record.
 *
 * @example
 *   getLangArray(vocab, "aliases", "es")  →  vocab.aliases_es  (string[])
 *
 * @migration
 *   Same shape as getLangValue — only the body changes.
 */
export function getLangArray(
  record: object,
  fieldBase: string,
  lang: LangCode,
): string[] {
  const key = `${fieldBase}_${lang}`;
  return ((record as Record<string, unknown>)[key] as string[] | null | undefined) ?? [];
}

// ---------------------------------------------------------------------------
// Direction helpers
// ---------------------------------------------------------------------------

/**
 * Build a quiz direction string from a language pair.
 * @example toQuizDirection({ source: "fr", target: "es" })  →  "fr-to-es"
 */
export function toQuizDirection(pair: LanguagePair): QuizDirection {
  return `${pair.source}-to-${pair.target}`;
}

/**
 * Parse a quiz direction string back to a language pair.
 * @example fromQuizDirection("fr-to-es")  →  { source: "fr", target: "es" }
 */
export function fromQuizDirection(direction: QuizDirection): LanguagePair {
  const parts = direction.split("-"); // ["fr", "to", "es"]
  return {
    source: parts[0] as LangCode,
    target: parts[2] as LangCode,
  };
}
