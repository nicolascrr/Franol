/**
 * Types pour les prompts IA
 */

export interface PromptPair {
  system: string;
  user: string;
}

export interface QuizPromptParams {
  prompt: string;
  questionCount?: number;
  batchSize?: number;
  batchIndex?: number;
  previousWords?: string[];
  /**
   * Quiz direction in `{LangCode}-to-{LangCode}` format, e.g. "fr-to-es".
   * The prompt builders (fr/quiz.ts, es/quiz.ts) interpret this string to
   * determine which language is the question language vs. the answer language.
   */
  direction?: string;
}

export interface ExplanationPromptParams {
  question: string;
  correctAnswer: string;
  userAnswer: string;
  wasCorrect: boolean;
}

/**
 * Per-verb conjugation specification sent to the AI.
 * Each verb has its own tense and pronoun so questions vary independently.
 */
export interface ConjugationVerbSpec {
  id: string;
  infinitiveFr: string;
  infinitiveEs: string;
  /** Tense key for this specific verb (e.g. "present", "imperfecto") */
  tenseKey: string;
  /** Localized tense label for this verb */
  tenseLabel: string;
  /** Target-language pronoun for this verb (e.g. "yo", "je/j'") */
  pronoun: string;
}

/**
 * Parameters for AI-powered conjugation prompts (US-Q5/Q6).
 */
export interface ConjugationPromptParams {
  /** Per-verb specs, each with its own tense and pronoun */
  verbs: ConjugationVerbSpec[];
  /** Quiz direction: "fr-to-es" or "es-to-fr" */
  direction: string;
  /** Whether to also generate wrong answers (for QCM format) */
  generateWrongAnswers: boolean;
  /** List of all available tense keys in the source language (for wrong answer exclusion) */
  allTenseKeys: string[];
}

/**
 * Parameters for AI-generated wrong answers for QCM questions (US-Q7).
 */
export interface WrongAnswersPromptParams {
  items: Array<{
    id: string;
    correctAnswer: string;
    questionText: string;
    type: "vocabulary" | "expression";
    targetLang: "fr" | "es";
  }>;
}

export type Locale = "fr" | "es";
