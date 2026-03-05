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
  direction?: "fr-to-es" | "es-to-fr";
}

export interface ExplanationPromptParams {
  question: string;
  correctAnswer: string;
  userAnswer: string;
  wasCorrect: boolean;
}

export interface FunFactPromptParams {
  factType: string;
  excludeKeywords: string[];
}

export type Locale = "fr" | "es";
