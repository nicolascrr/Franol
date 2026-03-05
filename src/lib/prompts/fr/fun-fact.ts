/**
 * Prompts pour les anecdotes linguistiques - Portail Français
 * Anecdotes données EN FRANÇAIS sur le français-espagnol
 */

import type { PromptPair, FunFactPromptParams } from "../types";

/**
 * Types de faits linguistiques disponibles
 */
export const FACT_TYPES = [
  "faux_ami",
  "mot_identique",
  "mot_similaire",
  "intraduisible",
  "etymologie",
  "expression_idiomatique",
  "culture",
  "grammaire",
  "prononciation",
] as const;

/**
 * Labels des types de faits en français
 */
export const FACT_TYPE_LABELS: Record<string, string> = {
  faux_ami: "Faux ami",
  mot_identique: "Mot identique",
  mot_similaire: "Mot similaire",
  intraduisible: "Intraduisible",
  etymologie: "Étymologie",
  expression_idiomatique: "Expression",
  culture: "Culture",
  grammaire: "Grammaire",
  prononciation: "Prononciation",
};

/**
 * Prompt système pour les anecdotes
 */
export const FUN_FACT_SYSTEM_PROMPT =
  "Expert linguistique français-espagnol. Réponds uniquement en JSON valide.";

/**
 * Génère le prompt utilisateur pour une anecdote
 */
export function buildFunFactPrompt(params: FunFactPromptParams): string {
  const { factType, excludeKeywords = [] } = params;

  const excludeHint =
    excludeKeywords.length > 0
      ? `Évite ces sujets déjà vus: ${excludeKeywords.join(", ")}.`
      : "";

  return `Génère UN fait linguistique intéressant sur le français-espagnol.
Type: ${factType}
${excludeHint}

Règles:
- Court (max 120 caractères)
- Informatif et utile pour apprendre l'espagnol
- Ton neutre mais engageant
- Pas de "Le saviez-vous" ou formules similaires
- Réponds EN FRANÇAIS

JSON: {"fact":"...","type":"${factType}","keyword":"mot_principal"}`;
}

/**
 * Génère la paire de prompts pour une anecdote
 */
export function buildFunFactPrompts(params: FunFactPromptParams): PromptPair {
  return {
    system: FUN_FACT_SYSTEM_PROMPT,
    user: buildFunFactPrompt(params),
  };
}

/**
 * Sélectionne un type de fait aléatoire
 */
export function getRandomFactType(): string {
  return FACT_TYPES[Math.floor(Math.random() * FACT_TYPES.length)];
}
