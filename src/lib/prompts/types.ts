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

export type Locale = "fr" | "es";
