/**
 * Prompts pour les quiz - Portail Français
 * L'utilisateur apprend l'ESPAGNOL GÉNÉRAL
 * Questions en français, réponses en espagnol standard
 */

import type { PromptPair, QuizPromptParams } from "../types";

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
