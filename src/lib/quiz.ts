import { createClient } from "./supabase/client";
import {
  getLangValue,
  getLangArray,
  fromQuizDirection,
  type LangCode,
  type QuizDirection,
} from "./lang";
import { PRONOUNS_FR, PRONOUNS_ES } from "./constants";
import { getTensesForLocale, getTenseLabel } from "./tenses";
import { generateConjugationBatch, generateWrongAnswersBatch } from "./ai";
import type { ConjugationVerbInput } from "./ai";

const supabase = createClient();

// Types
export type QuizMode = "classic" | "expressions" | "conjugation" | "discovery" | "vocabulary";
export type QuizFormat = "qcm" | "translation" | "mixed";
export type { QuizDirection };

export interface QuizConfig {
  mode: QuizMode;
  format: QuizFormat;
  questionCount: number;
  category?: string;
  direction: QuizDirection;
  prompt?: string;
  isAI?: boolean;
  /** Portal locale ("fr" or "es") — determines which language the user is learning */
  locale?: "fr" | "es";
  /** Tense key (e.g. "present", "imperfecto") or "all" for random — conjugation only */
  tense?: string;
  /** Verb group key (e.g. "1", "AR") or "all" for no filter — conjugation only */
  verbGroup?: string;
  /** Pronoun string (e.g. "yo", "tu") or "all" for random — conjugation only */
  pronoun?: string;
}

export interface QuizQuestion {
  id: string;
  type: "vocabulary" | "expression" | "conjugation" | "synonym";
  questionText: string;
  correctAnswer: string;
  aliases: string[];
  wrongAnswers?: string[];
  format: "qcm" | "translation";
  // For conjugation
  tense?: string;
  pronoun?: string;
  // For AI-generated questions
  explanation?: string;
  wordFr?: string;
  wordEs?: string;
  aliasesFr?: string[];
  aliasesEs?: string[];
  // US-Q8: Synonym-based questions
  isSynonymQuestion?: boolean;
  usedAnswers?: string[];
  allAcceptedAnswers?: string[];
}

export interface QuizAnswer {
  question: QuizQuestion;
  userAnswer: string;
  isCorrect: boolean;
}

export interface QuizResult {
  totalQuestions: number;
  correctAnswers: number;
  scorePercentage: number;
  durationSeconds: number;
  questions: QuizAnswer[];
}

// Conjugation helpers — pronoun lists imported from constants
// (PRONOUNS_FR, PRONOUNS_ES)

/**
 * Mapping of slash-separated pronouns to their individual variants.
 * Used to generate valid alternative answers for conjugation questions.
 * e.g. "él/ella" → user can type "él cambia" or "ella cambia"
 */
const PRONOUN_VARIANTS: Record<string, string[]> = {
  // Spanish (rioplatense)
  "tú/vos": ["tú", "vos"],
  "él/ella": ["él", "ella"],
  "vosotros/ustedes": ["vosotros", "ustedes"],
  "ellos/ellas": ["ellos", "ellas"],
  // French
  "il/elle": ["il", "elle"],
  "ils/elles": ["ils", "elles"],
  "je/j'": ["je", "j'"],
};

/**
 * Compute valid alternative answers for a conjugation question.
 *
 * The AI returns "correct" as "[pronoun] [verb]" (e.g. "él cambia").
 * Valid answers include:
 *   - The full form: "él cambia"
 *   - Verb only: "cambia" (pronoun is optional)
 *   - Alternative pronouns: "ella cambia" (for él/ella)
 *
 * @param correctAnswer - The AI-generated correct answer (e.g. "él cambia")
 * @param pronoun - The pronoun spec (e.g. "él/ella", "yo", "je/j'")
 * @returns Array of valid alternative answer strings
 */
function buildConjugationAliases(correctAnswer: string, pronoun: string): string[] {
  const aliases: string[] = [];

  // Step 0: If the AI returned a slash-pronoun (e.g. "él/ella escuche"),
  // normalize it to the first variant ("él escuche")
  // This handles cases where the AI ignores the prompt instruction.
  const slashPronouns: Record<string, string> = {
    "él/ella": "él",
    "ellos/ellas": "ellos",
    "il/elle": "il",
    "ils/elles": "ils",
    "je/j'": "je",
    "tú/vos": "tú",
    "vosotros/ustedes": "ustedes",
  };

  let normalizedAnswer = correctAnswer.trim();
  const slashForm = slashPronouns[pronoun];
  if (slashForm && normalizedAnswer.toLowerCase().startsWith(pronoun.toLowerCase())) {
    // Replace "él/ella" at the start with just "él"
    const afterSlash = normalizedAnswer.substring(pronoun.length).trim();
    if (afterSlash.length > 0) {
      normalizedAnswer = `${slashForm} ${afterSlash}`;
    }
  }

  // Step 1: Extract the verb-only part by stripping the pronoun prefix
  const variants = PRONOUN_VARIANTS[pronoun] || [pronoun];
  let verbOnly = normalizedAnswer;

  for (const variant of variants) {
    const variantLower = variant.toLowerCase();
    const answerLower = normalizedAnswer.toLowerCase();
    if (answerLower.startsWith(variantLower)) {
      const remaining = normalizedAnswer.substring(variant.length).trim();
      if (remaining.length > 0) {
        verbOnly = remaining;
      }
      break;
    }
  }

  // If verbOnly differs from the full answer, it's a valid alias
  if (verbOnly !== normalizedAnswer && verbOnly.length > 0) {
    aliases.push(verbOnly);
  }

  // Step 2: For slash-separated pronouns, add alternative pronoun + verb combinations
  // EXCEPTION: "tú/vos" — different pronouns use DIFFERENT verb forms in Rioplatense
  if (PRONOUN_VARIANTS[pronoun] && pronoun !== "tú/vos") {
    const pronounVariants = PRONOUN_VARIANTS[pronoun];
    for (const variant of pronounVariants) {
      if (!normalizedAnswer.toLowerCase().startsWith(variant.toLowerCase())) {
        aliases.push(`${variant} ${verbOnly}`);
      }
    }
  }

  return aliases;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getRandomItems<T>(array: T[], count: number): T[] {
  return shuffleArray(array).slice(0, count);
}

// ---------------------------------------------------------------------------
// US-Q8: Synonym-based question helpers
// ---------------------------------------------------------------------------

/**
 * Build cross-entry synonym groups by grouping items that share
 * the same translation in the target language.
 * Returns a map: targetWord → array of source words.
 */
function buildSynonymGroups(
  items: Array<Record<string, unknown>>,
  fieldBase: string,
  source: LangCode,
  target: LangCode,
): Map<string, string[]> {
  const groups = new Map<string, string[]>();

  for (const item of items) {
    const targetWord = getLangValue(item, fieldBase, target).toLowerCase().trim();
    const sourceWord = getLangValue(item, fieldBase, source);
    if (!targetWord || !sourceWord) continue;

    const existing = groups.get(targetWord) || [];
    if (!existing.includes(sourceWord)) {
      existing.push(sourceWord);
    }
    // Also group by aliases in the target language
    const targetAliases = getLangArray(item, "aliases", target);
    for (const alias of targetAliases) {
      const aliasLower = alias.toLowerCase().trim();
      if (aliasLower && aliasLower !== targetWord) {
        const aliasGroup = groups.get(aliasLower) || [];
        if (!aliasGroup.includes(sourceWord)) {
          aliasGroup.push(sourceWord);
        }
        groups.set(aliasLower, aliasGroup);
      }
    }
    groups.set(targetWord, existing);
  }

  return groups;
}

/**
 * Maybe swap the correct answer with one of its aliases.
 * ~30% chance of swapping. Returns the (possibly swapped) correct answer
 * and updated aliases array.
 */
function maybeSwapWithAlias(
  correctAnswer: string,
  aliases: string[],
): { correctAnswer: string; aliases: string[] } {
  if (aliases.length === 0 || Math.random() > 0.3) {
    return { correctAnswer, aliases };
  }

  // Pick a random alias to become the new correct answer
  const randomAlias = aliases[Math.floor(Math.random() * aliases.length)];
  const newAliases = [
    correctAnswer, // Original answer becomes an alias
    ...aliases.filter((a) => a !== randomAlias),
  ];

  return { correctAnswer: randomAlias, aliases: newAliases };
}

/**
 * Create a "say it differently" follow-up question.
 * The user must provide an alternative way to say the same thing.
 */
function createSynonymQuestion(
  originalQuestion: QuizQuestion,
  usedAnswers: string[],
  source: LangCode,
  target: LangCode,
): QuizQuestion | null {
  const allAnswers = [
    originalQuestion.correctAnswer,
    ...originalQuestion.aliases,
  ].filter((a) => !usedAnswers.includes(a.toLowerCase()));

  if (allAnswers.length === 0) return null;

  const newCorrect = allAnswers[Math.floor(Math.random() * allAnswers.length)];
  const remainingAliases = allAnswers.filter((a) => a !== newCorrect);

  return {
    id: `${originalQuestion.id}-synonym-${Date.now()}`,
    type: "synonym",
    questionText: originalQuestion.questionText,
    correctAnswer: newCorrect,
    aliases: remainingAliases,
    format: originalQuestion.format,
    isSynonymQuestion: true,
    usedAnswers,
    allAcceptedAnswers: allAnswers,
  };
}

/**
 * Generate quiz questions based on configuration
 */
export async function generateQuiz(
  config: QuizConfig,
): Promise<QuizQuestion[]> {
  const questions: QuizQuestion[] = [];
  // Derive source/target language from the direction string.
  const { source, target } = fromQuizDirection(config.direction);

  try {
    if (config.mode === "classic") {
      // Mix vocabulary and expressions
      const vocabCount = Math.ceil(config.questionCount / 2);
      const exprCount = Math.floor(config.questionCount / 2);

      // Fetch vocabulary
      let vocabQuery = supabase
        .from("vocabulary")
        .select("*")
        .limit(vocabCount * 3);

      if (config.category && config.category !== "all") {
        vocabQuery = vocabQuery.eq("category", config.category);
      }

      const { data: vocabData } = await vocabQuery;
      const selectedVocab = getRandomItems(vocabData || [], vocabCount);

      // Fetch expressions
      let exprQuery = supabase
        .from("expressions")
        .select("*")
        .limit(exprCount * 3);

      if (config.category && config.category !== "all") {
        exprQuery = exprQuery.eq("context", config.category);
      }

      const { data: exprData } = await exprQuery;
      const selectedExpr = getRandomItems(exprData || [], exprCount);

      // Add vocabulary questions (without wrong answers — batched later)
      for (const vocab of selectedVocab) {
        const format = getQuestionFormat(config.format);
        questions.push({
          id: vocab.id,
          type: "vocabulary",
          questionText: getLangValue(vocab, "word", source),
          correctAnswer: getLangValue(vocab, "word", target),
          aliases: getLangArray(vocab, "aliases", target),
          format,
        });
      }

      // Add expression questions (without wrong answers — batched later)
      for (const expr of selectedExpr) {
        const format = getQuestionFormat(config.format);
        questions.push({
          id: expr.id,
          type: "expression",
          questionText: getLangValue(expr, "expression", source),
          correctAnswer: getLangValue(expr, "expression", target),
          aliases: getLangArray(expr, "aliases", target),
          format,
        });
      }
    } else if (config.mode === "vocabulary") {
      let query = supabase
        .from("vocabulary")
        .select("*")
        .limit(config.questionCount * 3);

      if (config.category && config.category !== "all") {
        query = query.eq("category", config.category);
      }

      const { data } = await query;
      const selectedVocab = getRandomItems(data || [], config.questionCount);

      for (const vocab of selectedVocab) {
        const format = getQuestionFormat(config.format);
        questions.push({
          id: vocab.id,
          type: "vocabulary",
          questionText: getLangValue(vocab, "word", source),
          correctAnswer: getLangValue(vocab, "word", target),
          aliases: getLangArray(vocab, "aliases", target),
          format,
        });
      }
    } else if (config.mode === "expressions") {
      let query = supabase
        .from("expressions")
        .select("*")
        .limit(config.questionCount * 3);

      if (config.category && config.category !== "all") {
        query = query.eq("context", config.category);
      }

      const { data } = await query;
      const selectedExpr = getRandomItems(data || [], config.questionCount);

      for (const expr of selectedExpr) {
        const format = getQuestionFormat(config.format);
        questions.push({
          id: expr.id,
          type: "expression",
          questionText: getLangValue(expr, "expression", source),
          correctAnswer: getLangValue(expr, "expression", target),
          aliases: getLangArray(expr, "aliases", target),
          format,
        });
      }
    } else if (config.mode === "conjugation") {
      // Conjugation mode — AI-powered conjugation generation (US-Q5/Q6)
      //
      // KEY CONCEPT: The "learned language" is always the portal's target language,
      // independent of direction. Direction only controls the ANSWER language.
      //
      // FR portal (locale="fr"): user learns Spanish → learnedLang = "es"
      //   - questionText = verb_es (Spanish infinitive)
      //   - tenses, verb groups = Spanish
      //   - direction fr-to-es → answer in Spanish; es-to-fr → answer in French
      //
      // ES portal (locale="es"): user learns French → learnedLang = "fr"
      //   - questionText = verb_fr (French infinitive)
      //   - tenses, verb groups = French
      //   - direction es-to-fr → answer in French; fr-to-es → answer in Spanish

      const learnedLang: LangCode = config.locale === "fr" ? "es" : "fr";
      const answerLang: LangCode = target; // direction's target = conjugation answer language

      let query = supabase
        .from("conjugations")
        .select("*")
        .limit(config.questionCount * 3);

      // Filter by verb group — always in the LEARNED language
      if (config.verbGroup && config.verbGroup !== "all") {
        if (config.verbGroup === "irregular") {
          query = query.eq("is_irregular", true);
        } else {
          const groupField = learnedLang === "fr" ? "group_fr" : "group_es";
          query = query.eq(groupField, config.verbGroup);
        }
      }

      const { data } = await query;
      const selectedVerbs = getRandomItems(data || [], config.questionCount);

      if (selectedVerbs.length === 0) {
        return questions;
      }

      // Tenses always from the LEARNED language
      const availableTenses = getTensesForLocale(learnedLang);
      const allTenseKeys = availableTenses.map((t) => t.key);

      // Pronouns for AI answers — in the ANSWER language
      const answerPronouns = answerLang === "fr" ? PRONOUNS_FR : PRONOUNS_ES;
      // Pronouns from setup (in the LEARNED language) — need to map to answer language
      const learnedPronouns = learnedLang === "fr" ? PRONOUNS_FR : PRONOUNS_ES;

      // User's fixed choices (or undefined if "all")
      const fixedTenseKey = config.tense && config.tense !== "all" ? config.tense : undefined;
      const fixedPronoun = config.pronoun && config.pronoun !== "all" ? config.pronoun : undefined;

      // Map pronoun from learned language to answer language by index
      const mapPronounToAnswer = (learnedPronoun: string): string => {
        const index = learnedPronouns.indexOf(learnedPronoun);
        if (index >= 0 && index < answerPronouns.length) {
          return answerPronouns[index];
        }
        return learnedPronoun; // fallback
      };

      // For each verb, pick its own random tense and pronoun (unless user fixed them)
      const verbInputs: ConjugationVerbInput[] = selectedVerbs.map((verb: Record<string, unknown>) => {
        const verbTenseKey = fixedTenseKey || availableTenses[Math.floor(Math.random() * availableTenses.length)].key;
        const randomLearnedPronoun = learnedPronouns[Math.floor(Math.random() * learnedPronouns.length)];
        const verbPronoun = fixedPronoun || randomLearnedPronoun;
        // Map to answer language for the AI prompt
        const answerPronoun = mapPronounToAnswer(verbPronoun);

        return {
          id: (verb as { id: string }).id,
          infinitiveFr: getLangValue(verb, "infinitive", "fr"),
          infinitiveEs: getLangValue(verb, "infinitive", "es"),
          tenseKey: verbTenseKey,
          tenseLabel: getTenseLabel(verbTenseKey, learnedLang),
          pronoun: answerPronoun,
        };
      });

      try {
        // Determine API format: "mixed" and "qcm" need wrong answers; "translation" doesn't
        const apiFormat: "qcm" | "translation" | "mixed" =
          config.format === "translation" ? "translation" : "qcm";

        // Prompt locale = portal locale (NOT direction source)
        const promptLocale = (config.locale || "fr") as "fr" | "es";
        const result = await generateConjugationBatch(
          verbInputs,
          config.direction,
          promptLocale,
          apiFormat,
          allTenseKeys,
        );

        // Build QuizQuestions from AI results
        for (const conj of result.conjugations) {
          const verbSpec = verbInputs.find((v) => v.id === conj.id);
          const originalVerb = selectedVerbs.find(
            (v: Record<string, unknown>) => (v as { id: string }).id === conj.id,
          );

          // Determine per-question format
          const questionFormat = getQuestionFormat(config.format);

          const question: QuizQuestion = {
            id: conj.id,
            type: "conjugation",
            // Question shows the LEARNED language infinitive
            questionText: originalVerb
              ? getLangValue(originalVerb, "infinitive", learnedLang)
              : conj.id,
            correctAnswer: conj.correct,
            // Conjugation aliases: verb-only + alternative pronoun forms
            aliases: buildConjugationAliases(conj.correct, verbSpec?.pronoun || ""),
            format: questionFormat,
            tense: verbSpec?.tenseKey || "",
            pronoun: verbSpec?.pronoun || "",
            wordFr: verbSpec?.infinitiveFr,
            wordEs: verbSpec?.infinitiveEs,
          };

          if (questionFormat === "qcm" && conj.wrongAnswers.length >= 3) {
            question.wrongAnswers = conj.wrongAnswers;
          }

          questions.push(question);
        }
      } catch (aiError) {
        console.error("AI conjugation generation failed:", aiError);
        throw new Error(
          "Conjugation generation failed. The AI could not generate conjugated forms. " +
          "Please try again or use a different configuration."
        );
      }
    }
  } catch (error) {
    console.error("Error generating quiz:", error);
    throw error;
  }

  // US-Q8: Synonym-based question enrichment (vocabulary & expressions only)
  if (config.mode !== "conjugation" && config.mode !== "discovery") {
    // 1. Maybe swap correct answers with aliases (~30% per question)
    const nonConjQuestions = questions.filter(
      (q) => q.type === "vocabulary" || q.type === "expression",
    );
    for (const q of nonConjQuestions) {
      if (q.aliases.length > 0) {
        const swapped = maybeSwapWithAlias(q.correctAnswer, q.aliases);
        q.correctAnswer = swapped.correctAnswer;
        q.aliases = swapped.aliases;
      }
    }
  }

  // US-Q7: Batch-generate wrong answers for all non-conjugation QCM questions via AI
  const qcmQuestions = questions.filter(
    (q) => q.format === "qcm" && q.type !== "conjugation" && !q.wrongAnswers,
  );

  if (qcmQuestions.length > 0) {
    try {
      const wrongAnswerMap = await generateWrongAnswersBatch(
        qcmQuestions.map((q) => ({
          id: q.id,
          correctAnswer: q.correctAnswer,
          questionText: q.questionText,
          type: (q.type === "synonym" ? "vocabulary" : q.type) as "vocabulary" | "expression",
          targetLang: target,
        })),
        (config.locale || "fr") as "fr" | "es",
      );

      for (const q of qcmQuestions) {
        const aiWrong = wrongAnswerMap.get(q.id) || [];
        if (aiWrong.length >= 3) {
          q.wrongAnswers = aiWrong.slice(0, 3);
        } else {
          // Fallback to DB-based wrong answers
          console.log(`[Quiz] AI wrong answers insufficient for ${q.id} (${aiWrong.length}/3), falling back to DB`);
          q.wrongAnswers = await getWrongAnswersDB(
            q.id,
            q.type as "vocabulary" | "expression",
            config.category,
            target,
          );
        }
      }
    } catch (error) {
      console.error("[Quiz] AI wrong answers failed, falling back to DB:", error);
      // Fallback: use DB for all QCM questions
      for (const q of qcmQuestions) {
        q.wrongAnswers = await getWrongAnswersDB(
          q.id,
          q.type as "vocabulary" | "expression",
          config.category,
          target,
        );
      }
    }
  }

  return shuffleArray(questions);
}

/**
 * Determine format for a single question based on quiz config
 */
function getQuestionFormat(configFormat: QuizFormat): "qcm" | "translation" {
  if (configFormat === "mixed") {
    return Math.random() > 0.5 ? "qcm" : "translation";
  }
  return configFormat;
}

/**
 * Database-based wrong answers — fallback when AI fails (US-Q7).
 */
async function getWrongAnswersDB(
  excludeId: string,
  type: "vocabulary" | "expression",
  category: string | undefined,
  language: LangCode,
): Promise<string[]> {
  const table = type === "vocabulary" ? "vocabulary" : "expressions";
  const fieldBase = type === "vocabulary" ? "word" : "expression";
  // Column name for the Supabase .select() call — this is the remaining
  // direct coupling to the flat-column schema.
  const field = `${fieldBase}_${language}`;

  let query = supabase.from(table).select(field).neq("id", excludeId).limit(20);

  if (category && category !== "all") {
    const catField = type === "vocabulary" ? "category" : "context";
    query = query.eq(catField, category);
  }

  const { data } = await query;

  const extractField = (items: object[]): string[] =>
    items.map((item) => getLangValue(item, fieldBase, language));

  if (!data || data.length < 3) {
    // Fallback: get any items
    const { data: fallbackData } = await supabase
      .from(table)
      .select(field)
      .neq("id", excludeId)
      .limit(20);

    const items = getRandomItems((fallbackData || []) as object[], 3);
    return extractField(items);
  }

  const items = getRandomItems((data || []) as object[], 3);
  return extractField(items);
}

/**
 * US-Q9: Calculate the maximum number of unique questions available
 * for a given quiz configuration. Returns the count of matching DB items
 * and whether the requested count needs adjustment.
 */
export async function calculateMaxQuestions(
  config: QuizConfig,
): Promise<{
  maxQuestions: number;
  uniqueItems: number;
  adjusted: boolean;
}> {
  // Discovery mode uses AI — no DB limit
  if (config.mode === "discovery") {
    return { maxQuestions: config.questionCount, uniqueItems: 0, adjusted: false };
  }

  const { source } = fromQuizDirection(config.direction);

  try {
    if (config.mode === "conjugation") {
      let query = supabase.from("conjugations").select("id", { count: "exact", head: true });

      const learnedLang: LangCode = config.locale === "fr" ? "es" : "fr";
      if (config.verbGroup && config.verbGroup !== "all") {
        if (config.verbGroup === "irregular") {
          query = query.eq("is_irregular", true);
        } else {
          const groupField = learnedLang === "fr" ? "group_fr" : "group_es";
          query = query.eq(groupField, config.verbGroup);
        }
      }

      const { count } = await query;
      const uniqueItems = count || 0;
      const maxQuestions = Math.min(config.questionCount, uniqueItems);

      return {
        maxQuestions,
        uniqueItems,
        adjusted: config.questionCount > uniqueItems,
      };
    }

    // Vocabulary, expressions, or classic mode
    const tables: Array<{ table: string; catField: string }> = [];
    if (config.mode === "classic") {
      tables.push({ table: "vocabulary", catField: "category" });
      tables.push({ table: "expressions", catField: "context" });
    } else if (config.mode === "vocabulary") {
      tables.push({ table: "vocabulary", catField: "category" });
    } else if (config.mode === "expressions") {
      tables.push({ table: "expressions", catField: "context" });
    }

    let totalItems = 0;

    for (const { table, catField } of tables) {
      let query = supabase.from(table).select("id", { count: "exact", head: true });

      if (config.category && config.category !== "all") {
        query = query.eq(catField, config.category);
      }

      const { count } = await query;
      totalItems += count || 0;
    }

    const uniqueItems = totalItems;
    const maxQuestions = Math.min(config.questionCount, uniqueItems);

    return {
      maxQuestions,
      uniqueItems,
      adjusted: config.questionCount > uniqueItems,
    };
  } catch (error) {
    console.error("Error calculating max questions:", error);
    // On error, return the requested count (let the quiz generation handle it)
    return { maxQuestions: config.questionCount, uniqueItems: 0, adjusted: false };
  }
}

/**
 * Save quiz result to history
 */
export async function saveQuizResult(
  result: QuizResult,
  config: QuizConfig,
): Promise<void> {
  try {
    const { error } = await supabase.from("quiz_history").insert({
      quiz_type: config.format,
      quiz_mode: config.mode,
      category: config.category || null,
      total_questions: result.totalQuestions,
      correct_answers: result.correctAnswers,
      score_percentage: result.scorePercentage,
      duration_seconds: result.durationSeconds,
      questions_data: result.questions.map((q) => ({
        questionId: q.question.id,
        questionType: q.question.type,
        questionText: q.question.questionText,
        correctAnswer: q.question.correctAnswer,
        userAnswer: q.userAnswer,
        isCorrect: q.isCorrect,
      })),
    });

    if (error) throw error;
  } catch (error) {
    console.error("Error saving quiz result:", error);
    throw error;
  }
}

/**
 * Get emoji based on score percentage
 */
export function getScoreEmoji(percentage: number): string {
  if (percentage < 50) return "😅";
  if (percentage < 70) return "🙂";
  if (percentage < 90) return "😊";
  return "🎉";
}

/**
 * Format duration in seconds to readable string
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}
