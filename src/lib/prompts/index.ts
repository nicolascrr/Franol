/**
 * Point d'entrée centralisé pour tous les prompts
 *
 * Architecture:
 * - fr/ : Prompts pour le portail français (apprentissage de l'espagnol)
 * - es/ : Prompts pour le portail espagnol (apprentissage du français)
 *
 * Chaque dossier contient:
 * - quiz.ts : Prompts pour les quiz personnalisés
 * - explanation.ts : Prompts pour les explications pédagogiques
 * - fun-fact.ts : Prompts pour les anecdotes linguistiques
 */

// Types
export type {
  PromptPair,
  QuizPromptParams,
  ExplanationPromptParams,
  FunFactPromptParams,
  Locale,
} from "./types";

// Prompts FR
import * as frQuiz from "./fr/quiz";
import * as frExplanation from "./fr/explanation";
import * as frFunFact from "./fr/fun-fact";

// Prompts ES
import * as esQuiz from "./es/quiz";
import * as esExplanation from "./es/explanation";
import * as esFunFact from "./es/fun-fact";

// Export par locale
export const prompts = {
  fr: {
    quiz: frQuiz,
    explanation: frExplanation,
    funFact: frFunFact,
  },
  es: {
    quiz: esQuiz,
    explanation: esExplanation,
    funFact: esFunFact,
  },
} as const;

// Fonction utilitaire pour obtenir les prompts selon la locale
import type {
  QuizPromptParams,
  ExplanationPromptParams,
  FunFactPromptParams,
  PromptPair,
  Locale,
} from "./types";

/**
 * Obtient les prompts de quiz selon la locale
 */
export function getQuizPrompts(
  locale: Locale,
  params: QuizPromptParams
): PromptPair {
  return locale === "fr"
    ? frQuiz.buildQuizPrompts(params)
    : esQuiz.buildQuizPrompts(params);
}

/**
 * Obtient les prompts de quiz simples (non-batch) selon la locale
 */
export function getSimpleQuizPrompts(
  locale: Locale,
  params: QuizPromptParams
): PromptPair {
  if (locale === "fr") {
    return {
      system: frQuiz.QUIZ_SIMPLE_SYSTEM_PROMPT,
      user: frQuiz.buildSimpleQuizPrompt(params),
    };
  }
  return {
    system: esQuiz.QUIZ_SIMPLE_SYSTEM_PROMPT,
    user: esQuiz.buildSimpleQuizPrompt(params),
  };
}

/**
 * Obtient les prompts d'explication selon la locale
 */
export function getExplanationPrompts(
  locale: Locale,
  params: ExplanationPromptParams
): PromptPair {
  return locale === "fr"
    ? frExplanation.buildExplanationPrompts(params)
    : esExplanation.buildExplanationPrompts(params);
}

/**
 * Obtient les prompts d'anecdote selon la locale
 */
export function getFunFactPrompts(
  locale: Locale,
  params: FunFactPromptParams
): PromptPair {
  return locale === "fr"
    ? frFunFact.buildFunFactPrompts(params)
    : esFunFact.buildFunFactPrompts(params);
}

/**
 * Obtient les labels des types de faits selon la locale
 */
export function getFactTypeLabels(locale: Locale): Record<string, string> {
  return locale === "fr"
    ? frFunFact.FACT_TYPE_LABELS
    : esFunFact.FACT_TYPE_LABELS;
}

/**
 * Obtient un type de fait aléatoire
 */
export function getRandomFactType(): string {
  return frFunFact.getRandomFactType();
}
