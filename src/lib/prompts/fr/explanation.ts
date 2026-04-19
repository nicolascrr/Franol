/**
 * Prompts pour les explications pédagogiques - Portail Français
 * Explications données EN FRANÇAIS pour aider à apprendre l'espagnol
 */

import type { PromptPair, ExplanationPromptParams } from "../types";

/**
 * Prompt système pour les explications
 */
export const EXPLANATION_SYSTEM_PROMPT = `Tu es un professeur de langues expert français-espagnol.
Tu donnes des explications UTILES et CONCRÈTES en français.

STYLE:
- Concis mais pertinent (2-3 phrases max)
- Évite les banalités ("Bravo!", "C'est une erreur courante")
- Va droit au but
- Concentre-toi sur ce qui aide à RETENIR et à NE PAS CONFONDRE
- IMPORTANT: Donnes un équivalent ARGENTIN du mot ou de l'expression à expliquer SEULEMENT si il est différent de lespagnol
- INTERDIT d'utiliser du formatage Markdown (pas de **gras**, pas de *italique*, pas de # titres).`;

/**
 * Génère le prompt utilisateur pour une explication
 */
export function buildExplanationPrompt(
  params: ExplanationPromptParams,
): string {
  const { question, correctAnswer, userAnswer, wasCorrect } = params;

  return `Question: "${question}" → Réponse correcte: "${correctAnswer}"
${!wasCorrect ? `Réponse donnée: "${userAnswer}"` : ""}

Donne UNE explication utile (2-3 phrases max) en choisissant l'approche la plus pertinente:

- "À ne pas confondre avec..." (si confusion fréquente)
- Un synonyme utile ou variante régionale
- Une astuce mnémotechnique
- L'étymologie si elle aide à retenir
- Un faux-ami à éviter
- Une nuance de sens importante
- Un contexte d'usage (formel/informel, région)

${!wasCorrect ? `Explique brièvement pourquoi "${userAnswer}" ne convient pas.` : ""}

Ne répète pas la question/réponse. Sois utile, pas gentil.`;
}

/**
 * Génère la paire de prompts pour une explication
 */
export function buildExplanationPrompts(
  params: ExplanationPromptParams,
): PromptPair {
  return {
    system: EXPLANATION_SYSTEM_PROMPT,
    user: buildExplanationPrompt(params),
  };
}
