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
 */

// Types
export type {
  PromptPair,
  QuizPromptParams,
  ExplanationPromptParams,
  ConjugationPromptParams,
  ConjugationVerbSpec,
  WrongAnswersPromptParams,
  Locale,
} from "./types";

// Prompts FR
import * as frQuiz from "./fr/quiz";
import * as frExplanation from "./fr/explanation";

// Prompts ES
import * as esQuiz from "./es/quiz";
import * as esExplanation from "./es/explanation";

// Export par locale
export const prompts = {
  fr: {
    quiz: frQuiz,
    explanation: frExplanation,
  },
  es: {
    quiz: esQuiz,
    explanation: esExplanation,
  },
} as const;

// Fonction utilitaire pour obtenir les prompts selon la locale
import type {
  QuizPromptParams,
  ExplanationPromptParams,
  ConjugationPromptParams,
  WrongAnswersPromptParams,
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
 * US-Q5/Q6: Obtient les prompts de conjugaison selon la locale
 */
export function getConjugationPrompts(
  locale: Locale,
  params: ConjugationPromptParams
): PromptPair {
  return locale === "fr"
    ? frQuiz.buildConjugationPrompts(params)
    : esQuiz.buildConjugationPrompts(params);
}

/**
 * US-Q7: Obtient les prompts de mauvaises réponses selon la locale
 */
export function getWrongAnswersPrompts(
  locale: Locale,
  params: WrongAnswersPromptParams
): PromptPair {
  return locale === "fr"
    ? frQuiz.buildWrongAnswersPrompts(params)
    : esQuiz.buildWrongAnswersPrompts(params);
}
