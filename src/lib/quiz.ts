import { createClient } from "./supabase/client";
import {
  getLangValue,
  getLangArray,
  fromQuizDirection,
  type LangCode,
  type QuizDirection,
} from "./lang";

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
}

export interface QuizQuestion {
  id: string;
  type: "vocabulary" | "expression" | "conjugation";
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

// Conjugation helpers
const PRONOUNS_ES = [
  "yo",
  "tú",
  "él/ella",
  "nosotros",
  "vosotros",
  "ellos/ellas",
];
const PRONOUNS_FR = ["je", "tu", "il/elle", "nous", "vous", "ils/elles"];
const TENSES = ["presente", "pretérito", "imperfecto", "futuro"];

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

/**
 * Generate quiz questions based on configuration
 */
export async function generateQuiz(
  config: QuizConfig,
): Promise<QuizQuestion[]> {
  const questions: QuizQuestion[] = [];
  // Derive source/target language from the direction string.
  // @migration: fromQuizDirection still works after schema normalisation because
  // the direction string format (e.g. "fr-to-es") is independent of how fields
  // are stored in the DB.
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
        .limit(vocabCount * 3); // Fetch more to ensure randomness

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

      // Add vocabulary questions
      for (const vocab of selectedVocab) {
        const format = getQuestionFormat(config.format);
        const question: QuizQuestion = {
          id: vocab.id,
          type: "vocabulary",
          questionText: getLangValue(vocab, "word", source),
          correctAnswer: getLangValue(vocab, "word", target),
          aliases: getLangArray(vocab, "aliases", target),
          format,
        };

        if (format === "qcm") {
          question.wrongAnswers = await getWrongAnswers(
            vocab.id,
            "vocabulary",
            config.category,
            target,
          );
        }

        questions.push(question);
      }

      // Add expression questions
      for (const expr of selectedExpr) {
        const format = getQuestionFormat(config.format);
        const question: QuizQuestion = {
          id: expr.id,
          type: "expression",
          questionText: getLangValue(expr, "expression", source),
          correctAnswer: getLangValue(expr, "expression", target),
          aliases: getLangArray(expr, "aliases", target),
          format,
        };

        if (format === "qcm") {
          question.wrongAnswers = await getWrongAnswers(
            expr.id,
            "expression",
            config.category,
            target,
          );
        }

        questions.push(question);
      }
    } else if (config.mode === "vocabulary") {
      // Only vocabulary items
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
        const question: QuizQuestion = {
          id: vocab.id,
          type: "vocabulary",
          questionText: getLangValue(vocab, "word", source),
          correctAnswer: getLangValue(vocab, "word", target),
          aliases: getLangArray(vocab, "aliases", target),
          format,
        };

        if (format === "qcm") {
          question.wrongAnswers = await getWrongAnswers(
            vocab.id,
            "vocabulary",
            config.category,
            target,
          );
        }

        questions.push(question);
      }
    } else if (config.mode === "expressions") {
      // Only expressions
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
        const question: QuizQuestion = {
          id: expr.id,
          type: "expression",
          questionText: getLangValue(expr, "expression", source),
          correctAnswer: getLangValue(expr, "expression", target),
          aliases: getLangArray(expr, "aliases", target),
          format,
        };

        if (format === "qcm") {
          question.wrongAnswers = await getWrongAnswers(
            expr.id,
            "expression",
            config.category,
            target,
          );
        }

        questions.push(question);
      }
    } else if (config.mode === "conjugation") {
      // Conjugation mode
      const { data } = await supabase
        .from("conjugations")
        .select("*")
        .limit(config.questionCount * 3);

      const selectedVerbs = getRandomItems(data || [], config.questionCount);

      for (const verb of selectedVerbs) {
        const format = getQuestionFormat(config.format);
        const tense = TENSES[Math.floor(Math.random() * TENSES.length)];
        const pronounIndex = Math.floor(Math.random() * PRONOUNS_ES.length);
        // Source language determines which pronoun set to show as the prompt
        const pronoun = source === "fr"
          ? PRONOUNS_FR[pronounIndex]
          : PRONOUNS_ES[pronounIndex];

        // For now, basic conjugation - we'll use the infinitive as a placeholder
        // In production, you'd have a conjugation table or API
        const question: QuizQuestion = {
          id: verb.id,
          type: "conjugation",
          questionText: getLangValue(verb, "infinitive", source),
          correctAnswer: getLangValue(verb, "infinitive", target),
          aliases: getLangArray(verb, "aliases", target),
          format: "translation", // Conjugation is always typed
          tense,
          pronoun,
        };

        questions.push(question);
      }
    }
  } catch (error) {
    console.error("Error generating quiz:", error);
    throw error;
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
 * Get wrong answers for QCM questions.
 *
 * @migration
 *   The `.select(field)` call still uses the flat column name. When moving to
 *   a normalised schema, this query becomes a JOIN/filter on word_translations.
 *   The extractField helper already uses getLangValue() so it won't need changing.
 */
async function getWrongAnswers(
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
