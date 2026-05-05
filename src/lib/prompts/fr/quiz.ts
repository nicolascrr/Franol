/**
 * Prompts pour les quiz - Portail Français
 * L'utilisateur apprend l'ESPAGNOL GÉNÉRAL
 * Questions en français, réponses en espagnol standard
 */

import type {
  PromptPair,
  QuizPromptParams,
  ConjugationPromptParams,
  WrongAnswersPromptParams,
} from "../types";

/**
 * Génère le prompt système selon la direction
 */
function getSystemPrompt(direction: string): string {
  const isFrToEs = direction === "fr-to-es";
  const questionLang = isFrToEs ? "français" : "espagnol";
  const answerLang = isFrToEs ? "espagnol" : "français";

  return `Tu es un générateur de quiz de vocabulaire français-espagnol.

Ta mission: créer des questions de traduction précises et variées.
DIRECTION: Le mot dans la question est en ${questionLang.toUpperCase()}, les réponses (correcte et fausses) sont en ${answerLang.toUpperCase()}.

FORMAT DE SORTIE OBLIGATOIRE (JSON strict):
{
  "questions": [
    {
      "q": "Question posée avec le mot en ${questionLang}",
      "a": "Réponse correcte en ${answerLang}",
      "w": ["Faux 1 en ${answerLang}", "Faux 2 en ${answerLang}", "Faux 3 en ${answerLang}"],
      "fr": "Mot français",
      "es": "Mot espagnol",
      "t": "v"
    }
  ]
}

RÈGLES IMPÉRATIVES:

1. DIRECTION DE TRADUCTION
   - La question demande la traduction d'un mot en ${questionLang}
   - La réponse correcte et les 3 fausses réponses sont en ${answerLang}
    - Exemple${
      isFrToEs
        ? `: "Comment dit-on « une voiture » en espagnol ?" → réponse: "un coche"`
        : `: "Comment dit-on « un coche » en français ?" → réponse: "une voiture"`
    }

2. RESPECT STRICT DU THÈME
   - Si le thème mentionne un pays/région hispanophone (Argentine, Mexique, etc.):
     → Donner UNIQUEMENT des mots/expressions EXCLUSIFS de cette région
     → Mots qui NE S'UTILISENT PAS en Espagne, seulement dans ce pays
     → "expressions argentines" = argentinismes exclusifs:
        • "bondi" (bus), "laburo" (travail), "guita" (argent)
        • "afanar" (voler), "morfar" (manger), "mina" (fille)
     → "expressions mexicaines" = mexicanismes exclusifs:
        • "chido" (cool), "güey" (mec), "chamba" (travail)
        • "padre" (génial), "chela" (bière), "neta" (vérité)
   - INTERDIT de donner des mots d'espagnol standard quand on demande du vocabulaire régional
   - Par défaut (sans précision): utiliser l'ESPAGNOL STANDARD

3. ESPAGNOL STANDARD PAR DÉFAUT
   - Utiliser le tutoiement standard: "tú tienes", "tú sabes"
   - Vocabulaire neutre: "coche", "móvil", "ordenador"
   - "camiseta", "falda", "calcetines"
   - "autobús", "metro"

4. NOMBRE DE QUESTIONS
   - Extraire le nombre de la demande (chercher les chiffres)
   - "12 mots", "12 questions", "12 expressions" = 12 questions
   - Si non spécifié, générer 10 questions
   - MAXIMUM ABSOLU : 40 questions — ne jamais dépasser

5. EXACTEMENT 4 CHOIX PAR QUESTION
   - 1 réponse correcte (a)
   - 3 réponses fausses (w) - TOUJOURS 3, jamais moins
   - Les 4 choix doivent être du même type (tous des noms, tous des verbes, etc.)

6. PRÉCISION LEXICALE
   - La réponse doit être la traduction EXACTE du mot demandé
   - Vérifiable dans un dictionnaire

7. ARTICLES DEVANT LES NOMS (OBLIGATOIRE)
   - TOUJOURS inclure un article devant chaque nom dans la question ET dans les 4 réponses
   - Le BUT est d'apprendre le GENRE des noms → l'article doit être LOGIQUE par rapport à la langue parlée
   - Noms DÉNOMBRABLES (on peut les compter) → article INDÉFINI qui révèle le genre:
     • Français: « un » (masculin) ou « une » (féminin)
     • Espagnol: « un » (masculin) ou « una » (femenino)
     • Exemples: « un chien », « une pomme », « un abricot » (PAS « l'abricot »), « une orange » (PAS « l'orange »)
   - Noms NON DÉNOMBRABLES (liquides, matières, concepts — on ne les compte pas) → article DÉFINI:
     • Français: « le », « la » ou « l' »
     • Espagnol: « el », « la »
     • Exemples: « le lait » (PAS « un lait »), « la farine », « le pain », « el agua », « la leche »
   - INTERDIT d'utiliser « l' » avec un nom dénombrable commençant par une voyelle (cela masque le genre)
   - INTERDIT d'utiliser un article indéfini avec un nom non dénombrable (cela sonne faux)
   - JAMAIS le même nom avec des articles différents dans les 4 options d'une même question
   - Ne PAS mettre d'article devant les verbes, adjectifs seuls, adverbes ou expressions

8. VARIÉTÉ THÉMATIQUE
   - Couvrir TOUT le spectre du thème demandé
   - "nourriture" = viandes, légumes, fruits, féculents, boissons, desserts, etc.
   - "animaux" = mammifères, oiseaux, poissons, insectes, etc.
   - Ne pas se limiter à une sous-catégorie

9. QUESTIONS UNIQUES
   - Chaque question porte sur un mot DIFFÉRENT
   - Aucune répétition de réponse dans le quiz

10. MISE EN FORME
    - Guillemets français « »
    - Ponctuation correcte avec espaces
    - Pas de mots en MAJUSCULES

11. CLASSIFICATION DU MOT (champ "t")
    - "t": "v" si c'est un nom, adjectif, adverbe ou vocabulaire général
    - "t": "e" si c'est une expression idiomatique ou une locution figée
    - "t": "c" si c'est un verbe (à l'infinitif)`;
}

// Alias pour compatibilité (direction par défaut)
export const QUIZ_SYSTEM_PROMPT = getSystemPrompt("fr-to-es");

/**
 * Détecte le niveau de difficulté dans le prompt utilisateur.
 * Ne matche que des patterns explicites pour éviter les faux positifs
 * ("pays difficiles" = thème, pas niveau de difficulté).
 */
function detectDifficulty(prompt: string): string | null {
  const lower = prompt.toLowerCase();
  // "très difficile" / "expert" doit être testé AVANT "difficile"
  if (/(?:tr[eè]s|super|extr[eê]mement)\s+(difficile|avancé|dur)/.test(lower))
    return "tres_difficile";
  if (/(?:niveau|quiz|mode)\s+expert/.test(lower)) return "tres_difficile";
  if (/^expert\b/.test(lower)) return "tres_difficile";
  // Patterns standard
  if (/(?:niveau|quiz|mode)\s+(facile|débutant|simple)/.test(lower))
    return "facile";
  if (/(?:niveau|quiz|mode)\s+(difficile|avancé|dur)/.test(lower))
    return "difficile";
  if (/(?:niveau|quiz|mode)\s+(moyen|intermédiaire)/.test(lower))
    return "moyen";
  // Standalone en début de prompt : "facile, 10 mots..."
  if (/^(facile|débutant|simple)\b/.test(lower)) return "facile";
  if (/^(difficile|avancé|dur)\b/.test(lower)) return "difficile";
  if (/^(moyen|intermédiaire)\b/.test(lower)) return "moyen";
  return null;
}

function getDifficultyHint(difficulty: string | null): string {
  if (!difficulty) return "";
  const hints: Record<string, string> = {
    facile:
      "\nNIVEAU: FACILE (A1-A2) — Vocabulaire courant et fréquent uniquement, mots du quotidien qu'un débutant devrait connaître. Éviter tout mot rare ou technique.",
    moyen:
      "\nNIVEAU: INTERMÉDIAIRE (B1-B2) — Mélange de vocabulaire courant et de mots un peu moins fréquents.",
    difficile:
      "\nNIVEAU: DIFFICILE (B2-C1) — Vocabulaire moins courant mais qui reste utilisé dans la vie courante ou professionnelle. Pas de mots ultra-spécialisés ou de jargon technique pointu. Exemples : « un diagnostic », « une ordonnance », « une inflammation » (pour le médical). Éviter les termes que même un natif non-spécialiste ne connaîtrait pas.",
    tres_difficile:
      "\nNIVEAU: TRÈS DIFFICILE (C1-C2) — Vocabulaire rare, technique, spécialisé ou soutenu. Termes que seul un expert ou un locuteur très avancé connaîtrait. Jargon professionnel autorisé.",
  };
  return hints[difficulty] || "";
}

/**
 * Génère le prompt utilisateur pour un quiz complet
 */
export function buildQuizPrompt(params: QuizPromptParams): string {
  const {
    prompt,
    questionCount = 10,
    previousWords = [],
    direction = "fr-to-es",
  } = params;

  const isFrToEs = direction === "fr-to-es";
  const questionLang = isFrToEs ? "français" : "espagnol";
  const answerLang = isFrToEs ? "espagnol" : "français";

  const excludeHint =
    previousWords.length > 0
      ? `\nMOTS DÉJÀ UTILISÉS (à exclure): ${previousWords.slice(-50).join(", ")}`
      : "";

  const difficulty = detectDifficulty(prompt);
  const difficultyHint = getDifficultyHint(difficulty);

  return `THÈME: "${prompt}"
NOMBRE DE QUESTIONS: ${questionCount}
DIRECTION: ${questionLang} → ${answerLang}
${excludeHint}${difficultyHint}

Génère exactement ${questionCount} questions de traduction sur le thème ci-dessus.
Le mot dans la question est en ${questionLang}, les réponses sont en ${answerLang}.

Rappels:
- ${questionCount} questions différentes, toutes en rapport avec le thème "${prompt}"
- 4 choix par question (1 correct + 3 faux)
- Couvrir tout le spectre du thème (varier les sous-catégories)
- Traductions exactes uniquement
- IMPORTANT: chaque question doit porter sur du vocabulaire lié au thème "${prompt}", pas sur des mots aléatoires

JSON:`;
}

/**
 * Génère la paire de prompts pour un quiz
 */
export function buildQuizPrompts(params: QuizPromptParams): PromptPair {
  const direction = params.direction || "fr-to-es";
  return {
    system: getSystemPrompt(direction),
    user: buildQuizPrompt(params),
  };
}

// Aliases pour compatibilité
export const buildQuizFirstBatchPrompt = buildQuizPrompt;
export const buildQuizContinuationPrompt = buildQuizPrompt;
export const QUIZ_SIMPLE_SYSTEM_PROMPT = QUIZ_SYSTEM_PROMPT;
export const buildSimpleQuizPrompt = buildQuizPrompt;

// ---------------------------------------------------------------------------
// US-Q5/Q6: Conjugation prompts — French portal
// ---------------------------------------------------------------------------

const CONJUGATION_SYSTEM_PROMPT_FR_TO_ES = `Expert en conjugaison espagnole RIOPLATENSE (Argentine). JSON seul.
RÈGLES RIOPLATENSE:
- "vosotros/ustedes" → TOUJOURS "ustedes" (ej: ustedes toman, ustedes comen)
- "tú/vos" → TOUJOURS "vos" au présent: -ar→ás, -er→és, -ir→ís (ej: vos tomás, vos comés, vos vivís)
- "tú/vos" aux autres temps → "tú" standard (ej: tú tomaste, tú comiste)

RÈGLE CRITIQUE POUR LES PRONOMS AVEC SLASH:
- Si le pronom contient "/", choisis TOUJOURS le PREMIER variant comme pronom dans la réponse.
- "él/ella" → utilises TOUJOURS "él" dans la réponse correcte. Correct: "él escuche". INTERDIT: "él/ella escuche"
- "ellos/ellas" → utilises TOUJOURS "ellos". Correct: "ellos terminen". INTERDIT: "ellos/ellas terminen"
- "il/elle" → utilises TOUJOURS "il". Correct: "il écoute". INTERDIT: "il/elle écoute"
- "ils/elles" → utilises TOUJOURS "ils". Correct: "ils terminent". INTERDIT: "ils/elles terminent"
- N'ÉCRIS JAMAIS un pronom avec "/" dans le champ "correct" ou "wrongAnswers".

wrongAnswers: même pronom (un seul, sans slash), temps différent, conjugaisons réelles, 3 temps différents.
Format: {"conjugations":[{"id":"...","correct":"[pronom seul] [conjugué]","wrongAnswers":["[même pronom] [conjugué_autre_temps]","...","..."],"tenseUsed":"[temps]"}]}`;

const CONJUGATION_SYSTEM_PROMPT_ES_TO_FR = `Expert en conjugaison française.
Génère la conjugaison EXACTE au temps et pronom demandés. JSON seul, pas de texte.

RÈGLE CRITIQUE POUR LES PRONOMS AVEC SLASH:
- Si le pronom contient "/", choisis TOUJOURS le PREMIER variant comme pronom dans la réponse.
- "il/elle" → utilises TOUJOURS "il". Correct: "il écoute". INTERDIT: "il/elle écoute"
- "ils/elles" → utilises TOUJOURS "ils". Correct: "ils terminent". INTERDIT: "ils/elles terminent"
- N'ÉCRIS JAMAIS un pronom avec "/" dans le champ "correct" ou "wrongAnswers".

Format: {"conjugations":[{"id":"...","correct":"[pronom seul] [conjugué]","wrongAnswers":["[même pronom] [conjugué_autre_temps]","...","..."],"tenseUsed":"[temps fr]"}]}
wrongAnswers: même pronom (un seul, sans slash), temps différent, conjugaisons réelles, 3 temps différents.`;

export function buildConjugationPrompt(
  params: ConjugationPromptParams,
): string {
  const { verbs, direction, generateWrongAnswers, allTenseKeys } = params;
  const isFrToEs = direction === "fr-to-es";

  const verbList = verbs
    .map((v) => {
      const inf = isFrToEs ? v.infinitiveEs : v.infinitiveFr;
      return `{"id":"${v.id}","inf":"${inf}","temps":"${v.tenseLabel}","pronom":"${v.pronoun}"}`;
    })
    .join(",");

  const targetLang = isFrToEs ? "ESPAGNOL (rioplatense)" : "FRANÇAIS";
  const wrongInstr = generateWrongAnswers
    ? `+3 mauvaises réponses par verbe (même pronom, autre temps parmi: ${allTenseKeys.join(",")})`
    : "wrongAnswers:[]";

  return `Conjugue en ${targetLang}:[${verbList}]${wrongInstr}`;
}

export function buildConjugationPrompts(
  params: ConjugationPromptParams,
): PromptPair {
  const isFrToEs = params.direction === "fr-to-es";
  return {
    system: isFrToEs
      ? CONJUGATION_SYSTEM_PROMPT_FR_TO_ES
      : CONJUGATION_SYSTEM_PROMPT_ES_TO_FR,
    user: buildConjugationPrompt(params),
  };
}

// ---------------------------------------------------------------------------
// US-Q7: Wrong answers for QCM — French portal
// ---------------------------------------------------------------------------

const WRONG_ANSWERS_SYSTEM_PROMPT_FR = `Tu génères des réponses incorrectes mais plausibles pour un quiz de traduction.
Règles STRICTES:
- Pour chaque élément, génère EXACTEMENT 3 réponses fausses dans la langue cible (targetLang)
- Même type: nom avec nom, expression avec expression, nombre avec nombre
- LES 3 FAUSSES RÉPONSES DOIVENT ÊTRE TRÈS PROCHES DE LA BONNE RÉPONSE:
  - MÊME CATÉGORIE SÉMANTIQUE: des mots du même domaine (fruits, véhicules, couleurs, nombres...)
  - PROXIMITÉ ORTHOGRAPHIQUE: des mots qui se ressemblent visuellement
  - CONSONANCE SIMILAIRE: des mots qui sonnent pareil
- EXEMPLES DE QUALITÉ:
  - correct="cuarenta y dos" → wrong=["cuarenta y uno","cincuenta y dos","sesenta y dos"]
  - correct="un coche" → wrong=["un camión","una furgoneta","un autobús"]
  - correct="una manzana" → wrong=["una pera","un durazno","una ciruela"]
  - correct="el rojo" → wrong=["el rosa","el rubio","el ron"]
- Los artículos deben ser coherentes (mismo artículo que la respuesta correcta según el género)
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

  return `Génère 3 mauvaises réponses pour chaque élément (dans la langue targetLang indiquée):
[${itemsJson}]`;
}

export function buildWrongAnswersPrompts(
  params: WrongAnswersPromptParams,
): PromptPair {
  return {
    system: WRONG_ANSWERS_SYSTEM_PROMPT_FR,
    user: buildWrongAnswersPrompt(params),
  };
}
