/**
 * Prompts para los quizzes - Portal Español (Argentina)
 * El usuario es ARGENTINO y aprende FRANCÉS
 * Preguntas en español rioplatense, respuestas en francés
 */

import type {
  PromptPair,
  QuizPromptParams,
  ConjugationPromptParams,
  WrongAnswersPromptParams,
} from "../types";

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
        ? `: "¿Cómo se dice « un auto » en francés?" → respuesta: "une voiture"`
        : `: "¿Cómo se dice « une voiture » en español?" → respuesta: "un auto"`
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

7. ARTÍCULOS ANTE SUSTANTIVOS (OBLIGATORIO)
   - SIEMPRE incluir un artículo antes de cada sustantivo en la pregunta Y en las 4 respuestas
   - El OBJETIVO es aprender el GÉNERO de los sustantivos → el artículo debe ser LÓGICO según el idioma hablado
   - Sustantivos CONTABLES (se pueden contar) → artículo INDEFINIDO que revela el género:
     • Francés: « un » (masculino) o « une » (femenino)
     • Español: « un » (masculino) o « una » (femenino)
     • Ejemplos: « un chien », « une pomme », « un abricot » (NO « l'abricot »), « une orange » (NO « l'orange »)
   - Sustantivos INCONTABLES (líquidos, materias, conceptos — no se cuentan) → artículo DEFINIDO:
     • Francés: « le », « la » o « l' »
     • Español: « el », « la »
     • Ejemplos: « le lait » (NO « un lait »), « la farine », « le pain », « el agua », « la leche »
   - PROHIBIDO usar « l' » con un sustantivo contable que empieza por vocal (oculta el género)
   - PROHIBIDO usar un artículo indefinido con un sustantivo incontable (suena incorrecto)
   - NUNCA el mismo sustantivo con artículos diferentes en las 4 opciones de una misma pregunta
   - NO poner artículo antes de verbos, adjetivos solos, adverbios o expresiones

8. VARIEDAD TEMÁTICA
   - Cubrir TODO el espectro del tema pedido
   - "comida" = asado, empanadas, milanesas, medialunas, alfajores, mate, etc.
   - "animales" = mamíferos, aves, peces, insectos, etc.
   - No limitarse a una subcategoría

9. PREGUNTAS ÚNICAS
   - Cada pregunta trata sobre una palabra DIFERENTE
   - Ninguna repetición de respuesta en el quiz

10. FORMATO
    - Comillas latinas « »
    - Puntuación correcta con espacios
    - No usar palabras en MAYÚSCULAS
    - Nunca especifiques en español rioplatense, di solamente en español

11. CLASIFICACIÓN DEL TÉRMINO (campo "t")
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

// ---------------------------------------------------------------------------
// US-Q5/Q6: Conjugation prompts — Spanish portal
// ---------------------------------------------------------------------------

const CONJUGATION_SYSTEM_PROMPT_ES_TO_FR = `Experto en conjugación francesa.
Generá la conjugación EXACTA en el tiempo y pronombre pedidos. Solo JSON, sin texto.

REGLA CRÍTICA PARA PRONOMBRES CON BARRA:
- Si el pronombre tiene "/", usá SIEMPRE el PRIMER variante en la respuesta.
- "il/elle" → usá SIEMPRE "il". Correcto: "il écoute". PROHIBIDO: "il/elle écoute"
- "ils/elles" → usá SIEMPRE "ils". Correcto: "ils terminent". PROHIBIDO: "ils/elles terminent"
- NUNCA escribas un pronombre con "/" en "correct" o "wrongAnswers".

Formato: {"conjugations":[{"id":"...","correct":"[pronombre solo] [conjugado]","wrongAnswers":["[mismo pronombre] [conjugado_otro_tiempo]","...","..."],"tenseUsed":"[tiempo fr]"}]}
wrongAnswers: mismo pronombre (solo, sin barra), tiempo diferente, conjugaciones reales, 3 tiempos diferentes.`;

const CONJUGATION_SYSTEM_PROMPT_FR_TO_ES = `Experto en conjugación española RIOPLATENSE (Argentina). Solo JSON.
REGLAS RIOPLATENSE:
- "vosotros/ustedes" → SIEMPRE "ustedes" (ej: ustedes toman, ustedes comen)
- "tú/vos" → SIEMPRE "vos" al presente: -ar→ás, -er→és, -ir→ís (ej: vos tomás, vos comés, vos vivís)
- "tú/vos" en otros tiempos → "tú" estándar (ej: tú tomaste, tú comiste)

REGLA CRÍTICA PARA PRONOMBRES CON BARRA:
- Si el pronombre tiene "/", usá SIEMPRE el PRIMER variante en la respuesta.
- "él/ella" → usá SIEMPRE "él". Correcto: "él escuche". PROHIBIDO: "él/ella escuche"
- "ellos/ellas" → usá SIEMPRE "ellos". Correcto: "ellos terminen". PROHIBIDO: "ellos/ellas terminen"
- "il/elle" → usá SIEMPRE "il". Correcto: "il écoute". PROHIBIDO: "il/elle écoute"
- NUNCA escribas un pronombre con "/" en "correct" o "wrongAnswers".

wrongAnswers: mismo pronombre (solo, sin barra), tiempo diferente, conjugaciones reales, 3 tiempos diferentes.
Formato: {"conjugations":[{"id":"...","correct":"[pronombre solo] [conjugado]","wrongAnswers":["[mismo pronombre] [conjugado_otro_tiempo]","...","..."],"tenseUsed":"[tiempo]"}]}`;

export function buildConjugationPrompt(
  params: ConjugationPromptParams,
): string {
  const { verbs, direction, generateWrongAnswers, allTenseKeys } = params;
  const isEsToFr = direction === "es-to-fr";

  const verbList = verbs
    .map((v) => {
      const inf = isEsToFr ? v.infinitiveFr : v.infinitiveEs;
      return `{"id":"${v.id}","inf":"${inf}","tiempo":"${v.tenseLabel}","pronombre":"${v.pronoun}"}`;
    })
    .join(",");

  const targetLang = isEsToFr ? "FRANCÉS" : "ESPAÑOL (rioplatense)";
  const wrongInstr = generateWrongAnswers
    ? `+3 respuestas incorrectas por verbo (mismo pronombre, otro tiempo entre: ${allTenseKeys.join(",")})`
    : "wrongAnswers:[]";

  return `Conjuga en ${targetLang}:[${verbList}]${wrongInstr}`;
}

export function buildConjugationPrompts(
  params: ConjugationPromptParams,
): PromptPair {
  const isEsToFr = params.direction === "es-to-fr";
  return {
    system: isEsToFr
      ? CONJUGATION_SYSTEM_PROMPT_ES_TO_FR
      : CONJUGATION_SYSTEM_PROMPT_FR_TO_ES,
    user: buildConjugationPrompt(params),
  };
}

// ---------------------------------------------------------------------------
// US-Q7: Wrong answers for QCM — Spanish portal
// ---------------------------------------------------------------------------

const WRONG_ANSWERS_SYSTEM_PROMPT_ES = `Generá respuestas incorrectas pero plausibles para un quiz de traducción.
Reglas ESTRICTAS:
- Para cada elemento, generá EXACTAMENTE 3 respuestas falsas en el idioma destino (targetLang)
- Mismo tipo: sustantivo con sustantivo, expresión con expresión, número con número
- LAS 3 RESPUESTAS FALSAS DEBEN ESTAR MUY CERCANAS A LA RESPUESTA CORRECTA:
  - MISMA CATEGORÍA SEMÁNTICA: palabras del mismo dominio (frutas, vehículos, colores, números...)
  - PROXIMIDAD ORTOGRÁFICA: palabras que se parecen visualmente
  - SONIDO SIMILAR: palabras que suenan parecido
- EJEMPLOS DE CALIDAD:
  - correcto="quarante-deux" → wrong=["quarante-et-un","cinquante-deux","soixante-deux"]
  - correcto="une voiture" → wrong=["un camion","une camionnette","un autocar"]
  - correcto="une pomme" → wrong=["une poire","une pêche","une prune"]
  - correcto="le rouge" → wrong=["le rose","le roux","le rouille"]
- Los artículos deben ser coherentes (mismo artículo que la respuesta correcta para el género)
- NUNCA la respuesta correcta ni sus variantes/sinónimos
- NUNCA duplicados entre las 3 falsas
- Las respuestas deben ser PALABRAS REALES, nunca inventadas
Formato JSON: {"results":[{"id":"...","wrongAnswers":["falso1","falso2","falso3"]}]}`;

export function buildWrongAnswersPrompt(
  params: WrongAnswersPromptParams,
): string {
  const itemsJson = params.items
    .map((item) =>
      JSON.stringify({
        id: item.id,
        correct: item.correctAnswer,
        question: item.questionText,
        targetLang: item.targetLang,
        type: item.type,
      }),
    )
    .join(",");

  return `Generá 3 respuestas incorrectas para cada elemento (en el idioma targetLang indicado):
[${itemsJson}]`;
}

export function buildWrongAnswersPrompts(
  params: WrongAnswersPromptParams,
): PromptPair {
  return {
    system: WRONG_ANSWERS_SYSTEM_PROMPT_ES,
    user: buildWrongAnswersPrompt(params),
  };
}
