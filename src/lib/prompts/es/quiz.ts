/**
 * Prompts para los quizzes - Portal Español (Argentina)
 * El usuario es ARGENTINO y aprende FRANCÉS
 * Preguntas en español rioplatense, respuestas en francés
 */

import type { PromptPair, QuizPromptParams } from "../types";

/**
 * Genera el prompt del sistema según la dirección
 */
function getSystemPrompt(direction: string): string {
  // Portail ES: l'utilisateur est argentin et apprend le français
  // es-to-fr = mot en espagnol → réponse en français (direction par défaut)
  // fr-to-es = mot en français → réponse en espagnol
  const isEsToFr = direction === "es-to-fr";
  const questionLang = isEsToFr ? "español rioplatense" : "francés";
  const answerLang = isEsToFr ? "francés" : "español rioplatense";

  return `Sos un generador de quizzes de vocabulario español-francés para usuarios ARGENTINOS.

Tu misión: crear preguntas de traducción precisas y variadas usando ESPAÑOL RIOPLATENSE (Argentina).
DIRECCIÓN: La palabra en la pregunta es en ${questionLang.toUpperCase()}, las respuestas (correcta y falsas) son en ${answerLang.toUpperCase()}.

FORMATO DE SALIDA OBLIGATORIO (JSON estricto):
{
  "questions": [
    {
      "q": "Pregunta con la palabra en ${questionLang}",
      "a": "Respuesta correcta en ${answerLang}",
      "w": ["Falso 1 en ${answerLang}", "Falso 2 en ${answerLang}", "Falso 3 en ${answerLang}"],
      "fr": "Palabra en francés",
      "es": "Palabra en español argentino",
      "t": "v"
    }
  ]
}

REGLAS IMPERATIVAS:

1. DIRECCIÓN DE TRADUCCIÓN
   - La pregunta pide la traducción de una palabra en ${questionLang}
   - La respuesta correcta y las 3 falsas son en ${answerLang}
   - Ejemplo${
     isEsToFr
       ? `: "¿Cómo se dice « auto » en francés?" → respuesta: "voiture"`
       : `: "¿Cómo se dice « voiture » en español?" → respuesta: "auto"`
   }

2. RESPETO ESTRICTO DEL TEMA
   - Si el tema menciona un país/región francófona (Suiza, Bélgica, Québec, etc.):
     → Dar SOLO palabras/expresiones EXCLUSIVAS de esa región
     → Palabras que NO SE USAN EN FRANCIA, solo en ese país/región
     → "expressions suisses" = helvétismes que un francés NO entendería:
        • "natel" (celular), "cornet" (bolsa plástica), "poutzer" (limpiar)
        • "septante/nonante/huitante", "souper" (cena), "déjeuner" (almuerzo)
        • "action" (oferta/promoción), "fourrer" (rellenar), "chenit" (desorden)
     → "expressions québécoises" = québécismes exclusivos:
        • "char" (auto), "blonde" (novia), "dépanneur" (kiosco)
        • "pogner" (agarrar), "tuque" (gorro), "magasiner" (ir de compras)
     → "expressions belges" = belgicismes exclusivos:
        • "aubette" (parada de colectivo), "drache" (lluvia fuerte)
        • "kot" (habitación estudiante), "sacoche" (cartera)
   - Si el país tiene varias lenguas (Suiza, Bélgica, Canadá):
     → Enfocarse SOLO en la parte FRANCÓFONA
   - PROHIBIDO dar palabras que también se usan en Francia
   - Ejemplo INCORRECTO: "bus", "voiture", "maison" (se usan en Francia)
   - Ejemplo CORRECTO: "natel", "char", "aubette" (exclusivos regionales)

3. ESPAÑOL ARGENTINO (RIOPLATENSE)
   - Usá SIEMPRE el voseo: "vos tenés", "vos sabés" (nunca "tú tienes")
   - Vocabulario argentino: "auto" (no "coche"), "celular" (no "móvil"), "computadora" (no "ordenador")
   - "remera" (no "camiseta"), "pollera" (no "falda"), "medias" (no "calcetines")
   - "heladera" (no "refrigerador"), "frutilla" (no "fresa"), "ananá" (no "piña")
   - "colectivo/bondi" (no "autobús"), "subte" (no "metro"), "vereda" (no "acera")
   - "departamento/depto" (no "piso/apartamento"), "pileta" (no "piscina")

4. NÚMERO DE PREGUNTAS
   - Extraer el número de la solicitud (buscar los dígitos)
   - "12 palabras", "12 preguntas", "12 expresiones" = 12 preguntas
   - Si no se especifica, generar 10 preguntas
   - MÁXIMO ABSOLUTO: 40 preguntas — nunca superar

5. EXACTAMENTE 4 OPCIONES POR PREGUNTA
   - 1 respuesta correcta (a)
   - 3 respuestas falsas (w) - SIEMPRE 3, nunca menos
   - Las 4 opciones deben ser del mismo tipo (todos sustantivos, todos verbos, etc.)

6. PRECISIÓN LÉXICA
   - La respuesta debe ser la traducción EXACTA de la palabra pedida
   - Verificable en un diccionario

7. VARIEDAD TEMÁTICA
   - Cubrir TODO el espectro del tema pedido
   - "comida" = asado, empanadas, milanesas, medialunas, alfajores, mate, etc.
   - "animales" = mamíferos, aves, peces, insectos, etc.
   - No limitarse a una subcategoría

8. PREGUNTAS ÚNICAS
   - Cada pregunta trata sobre una palabra DIFERENTE
   - Ninguna repetición de respuesta en el quiz

9. FORMATO
   - Comillas latinas « »
   - Puntuación correcta con espacios
   - No usar palabras en MAYÚSCULAS
   - Nunca especifiques en español rioplatense, di solamente en español

10. CLASIFICACIÓN DEL TÉRMINO (campo "t")
   - "t": "v" si es un sustantivo, adjetivo, adverbio o vocabulario general
   - "t": "e" si es una expresión idiomática o locución fija
   - "t": "c" si es un verbo (en infinitivo)`;
}

// Alias para compatibilidad (dirección por defecto)
export const QUIZ_SYSTEM_PROMPT = getSystemPrompt("es-to-fr");

/**
 * Detecta el nivel de dificultad en el prompt del usuario.
 * Solo matchea patrones explícitos para evitar falsos positivos
 * ("países difíciles" = tema, no nivel de dificultad).
 */
function detectDifficulty(prompt: string): string | null {
  const lower = prompt.toLowerCase();
  // Patrones con intensificador: "muy difícil", "super difícil"
  if (/(?:muy|super|extremadamente)\s+(dif[ií]cil|avanzado|duro)/.test(lower))
    return "muy_dificil";
  if (/(?:nivel|quiz|modo)\s+experto/.test(lower)) return "muy_dificil";
  if (/^experto\b/.test(lower)) return "muy_dificil";
  // Patrones estándar
  if (/(?:nivel|quiz|modo)\s+(f[aá]cil|principiante|simple)/.test(lower))
    return "facil";
  if (/(?:nivel|quiz|modo)\s+(dif[ií]cil|avanzado|duro)/.test(lower))
    return "dificil";
  if (/(?:nivel|quiz|modo)\s+(medio|intermedio)/.test(lower)) return "medio";
  // Standalone al inicio del prompt: "fácil, 10 palabras..."
  if (/^(f[aá]cil|principiante|simple)\b/.test(lower)) return "facil";
  if (/^(dif[ií]cil|avanzado|duro)\b/.test(lower)) return "dificil";
  if (/^(medio|intermedio)\b/.test(lower)) return "medio";
  return null;
}

function getDifficultyHint(difficulty: string | null): string {
  if (!difficulty) return "";
  const hints: Record<string, string> = {
    facil:
      "\nNIVEL: FÁCIL (A1-A2) — Solo vocabulario cotidiano y frecuente, palabras del día a día que un principiante debería conocer. Evitar palabras raras o técnicas.",
    medio:
      "\nNIVEL: INTERMEDIO (B1-B2) — Mezcla de vocabulario cotidiano y palabras un poco menos frecuentes.",
    dificil:
      "\nNIVEL: DIFÍCIL (B2-C1) — Vocabulario menos frecuente pero que se usa en la vida cotidiana o profesional. Nada ultra-especializado ni jerga técnica pointillosa. Ejemplos: « un diagnóstico », « una receta médica », « una inflamación » (para lo médico). Evitar términos que ni un nativo no-especialista conocería.",
    muy_dificil:
      "\nNIVEL: MUY DIFÍCIL (C1-C2) — Vocabulario raro, técnico, especializado o culto. Términos que solo un experto o un hablante muy avanzado conocería. Jerga profesional permitida.",
  };
  return hints[difficulty] || "";
}

/**
 * Genera el prompt de usuario para un quiz completo
 */
export function buildQuizPrompt(params: QuizPromptParams): string {
  const {
    prompt,
    questionCount = 10,
    previousWords = [],
    direction = "es-to-fr",
  } = params;

  const isEsToFr = direction === "es-to-fr";
  const questionLang = isEsToFr ? "español rioplatense" : "francés";
  const answerLang = isEsToFr ? "francés" : "español rioplatense";

  const excludeHint =
    previousWords.length > 0
      ? `\nPALABRAS YA USADAS (excluir): ${previousWords.slice(-50).join(", ")}`
      : "";

  const difficulty = detectDifficulty(prompt);
  const difficultyHint = getDifficultyHint(difficulty);

  return `TEMA: "${prompt}"
CANTIDAD DE PREGUNTAS: ${questionCount}
DIRECCIÓN: ${questionLang} → ${answerLang}
${excludeHint}${difficultyHint}

Generá exactamente ${questionCount} preguntas de traducción sobre el tema de arriba.
La palabra en la pregunta es en ${questionLang}, las respuestas son en ${answerLang}.

Recordatorios:
- ${questionCount} preguntas diferentes, todas relacionadas con el tema "${prompt}"
- 4 opciones por pregunta (1 correcta + 3 falsas)
- Cubrir todo el espectro del tema (variar subcategorías)
- Traducciones exactas únicamente
- Usá vocabulario ARGENTINO (rioplatense)
- IMPORTANTE: cada pregunta debe tratar sobre vocabulario relacionado al tema "${prompt}", no palabras aleatorias

JSON:`;
}

/**
 * Genera el par de prompts para un quiz
 */
export function buildQuizPrompts(params: QuizPromptParams): PromptPair {
  const direction = params.direction || "es-to-fr";
  return {
    system: getSystemPrompt(direction),
    user: buildQuizPrompt(params),
  };
}

// Aliases para compatibilidad
export const buildQuizFirstBatchPrompt = buildQuizPrompt;
export const buildQuizContinuationPrompt = buildQuizPrompt;
export const QUIZ_SIMPLE_SYSTEM_PROMPT = QUIZ_SYSTEM_PROMPT;
export const buildSimpleQuizPrompt = buildQuizPrompt;
