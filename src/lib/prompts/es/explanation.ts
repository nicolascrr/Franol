/**
 * Prompts para las explicaciones pedagógicas - Portal Español (Argentina)
 * Explicaciones dadas EN ESPAÑOL ARGENTINO para ayudar a aprender francés
 */

import type { PromptPair, ExplanationPromptParams } from "../types";

/**
 * Prompt del sistema para las explicaciones
 */
export const EXPLANATION_SYSTEM_PROMPT = `Sos un profesor de idiomas experto español-francés para estudiantes ARGENTINOS.
Das explicaciones ÚTILES y CONCRETAS en español rioplatense (Argentina).

ESTILO:
- Usá el voseo: "vos podés", "acordate", "fijate"
- Conciso pero pertinente (2-3 frases máx)
- Evitá banalidades ("¡Bien!", "Es un error común")
- Andá al grano
- Concentrate en lo que ayuda a RECORDAR y a NO CONFUNDIR
- Usá vocabulario argentino cuando des ejemplos`;

/**
 * Genera el prompt de usuario para una explicación
 */
export function buildExplanationPrompt(
  params: ExplanationPromptParams,
): string {
  const { question, correctAnswer, userAnswer, wasCorrect } = params;

  return `Pregunta: "${question}" → Respuesta correcta: "${correctAnswer}"
${!wasCorrect ? `Respuesta dada: "${userAnswer}"` : ""}

Da UNA explicación útil (2-3 frases máx) eligiendo el enfoque más pertinente:

- "No confundas con..." (si hay confusión frecuente)
- Un sinónimo útil o cómo se dice en Argentina vs Francia
- Un truco mnemotécnico
- La etimología si ayuda a recordar
- Un falso amigo a evitar
- Un matiz de significado importante
- Un contexto de uso (formal/informal, región)

${!wasCorrect ? `Explicá brevemente por qué "${userAnswer}" no es correcto.` : ""}

No repitas la pregunta/respuesta. Sé útil, no amable. Usá español argentino.`;
}

/**
 * Genera el par de prompts para una explicación
 */
export function buildExplanationPrompts(
  params: ExplanationPromptParams,
): PromptPair {
  return {
    system: EXPLANATION_SYSTEM_PROMPT,
    user: buildExplanationPrompt(params),
  };
}
