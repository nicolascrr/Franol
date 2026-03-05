/**
 * Prompts para las anécdotas lingüísticas - Portal Español (Argentina)
 * Anécdotas dadas EN ESPAÑOL ARGENTINO sobre español-francés
 */

import type { PromptPair, FunFactPromptParams } from "../types";

/**
 * Tipos de hechos lingüísticos disponibles
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
 * Labels de los tipos de hechos en español argentino
 */
export const FACT_TYPE_LABELS: Record<string, string> = {
  faux_ami: "Falso amigo",
  mot_identique: "Palabra idéntica",
  mot_similaire: "Palabra similar",
  intraduisible: "Intraducible",
  etymologie: "Etimología",
  expression_idiomatique: "Expresión",
  culture: "Cultura",
  grammaire: "Gramática",
  prononciation: "Pronunciación",
};

/**
 * Prompt del sistema para las anécdotas
 */
export const FUN_FACT_SYSTEM_PROMPT =
  "Experto lingüístico español argentino-francés. Respondé únicamente en JSON válido. Usá español rioplatense.";

/**
 * Genera el prompt de usuario para una anécdota
 */
export function buildFunFactPrompt(params: FunFactPromptParams): string {
  const { factType, excludeKeywords = [] } = params;

  const excludeHint =
    excludeKeywords.length > 0
      ? `Evitá estos temas ya vistos: ${excludeKeywords.join(", ")}.`
      : "";

  return `Generá UN dato lingüístico interesante sobre español argentino-francés.
Tipo: ${factType}
${excludeHint}

Reglas:
- Corto (máx 120 caracteres)
- Informativo y útil para un argentino que aprende francés
- Tono neutro pero atractivo
- Sin "¿Sabías que" o fórmulas similares
- Respondé EN ESPAÑOL ARGENTINO (rioplatense, con voseo)
- Podés mencionar diferencias entre el español argentino y el francés

JSON: {"fact":"...","type":"${factType}","keyword":"palabra_principal"}`;
}

/**
 * Genera el par de prompts para una anécdota
 */
export function buildFunFactPrompts(params: FunFactPromptParams): PromptPair {
  return {
    system: FUN_FACT_SYSTEM_PROMPT,
    user: buildFunFactPrompt(params),
  };
}

/**
 * Selecciona un tipo de hecho aleatorio
 */
export function getRandomFactType(): string {
  return FACT_TYPES[Math.floor(Math.random() * FACT_TYPES.length)];
}
