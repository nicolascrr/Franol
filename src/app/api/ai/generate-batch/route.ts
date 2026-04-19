import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getQuizPrompts } from "@/lib/prompts";
import type { Locale } from "@/lib/prompts";

export const dynamic = "force-dynamic";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY ?? "" });

interface BatchRequestBody {
  prompt: string;
  batchSize: number;
  batchIndex: number;
  direction: "fr-to-es" | "es-to-fr";
  format: "qcm" | "translation" | "mixed";
  locale: Locale;
  previousWords?: string[];
  stream?: boolean;
  questionCount?: number;
}

interface RawQuestion {
  q?: string;
  questionText?: string;
  a?: string;
  correctAnswer?: string;
  w?: string[];
  wrongAnswers?: string[];
  fr?: string;
  wordFr?: string;
  es?: string;
  wordEs?: string;
  t?: string;
}

/**
 * Répare un JSON malformé de manière robuste
 */
function repairJson(jsonString: string): string {
  let content = jsonString.trim();

  // 1. Nettoyer le markdown
  if (content.startsWith("```json")) {
    content = content.slice(7);
  }
  if (content.startsWith("```")) {
    content = content.slice(3);
  }
  if (content.endsWith("```")) {
    content = content.slice(0, -3);
  }
  content = content.trim();

  // 2. Si le JSON ne commence pas par {, ajouter l'accolade ouvrante
  if (!content.startsWith("{")) {
    content = "{" + content;
  }

  // 3. Compter les accolades pour voir si on manque de fermantes
  let openBraces = 0;
  let openBrackets = 0;

  for (const char of content) {
    if (char === "{") openBraces++;
    if (char === "}") openBraces--;
    if (char === "[") openBrackets++;
    if (char === "]") openBrackets--;
  }

  // Ajouter les accolades/crochets fermants manquants
  while (openBrackets > 0) {
    content += "]";
    openBrackets--;
  }
  while (openBraces > 0) {
    content += "}";
    openBraces--;
  }

  // 4. Réparer les guillemets manquants autour des clés
  // Pattern: {key: ou ,key: -> {"key": ou ,"key":
  content = content.replace(
    /([{,])\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g,
    '$1"$2":',
  );

  // 5. Réparer les valeurs de type string sans guillemets
  // Pattern: "key": value, -> "key": "value", (si value n'est pas un nombre, bool, null, array ou object)
  content = content.replace(
    /"([^"]+)"\s*:\s*([a-zA-ZÀ-ÿ][a-zA-ZÀ-ÿ0-9_\s]*)([,}\]])/g,
    '"$1": "$2"$3',
  );

  // 6. Réparer les tableaux avec des éléments sans guillemets
  // Pattern: [word, word] -> ["word", "word"]
  content = content.replace(
    /\[\s*([a-zA-ZÀ-ÿ][a-zA-ZÀ-ÿ0-9_\s]*?)\s*\]/g,
    (match, p1) => {
      const items = p1.split(",").map((item: string) => {
        item = item.trim();
        if (
          item &&
          !item.startsWith('"') &&
          !item.startsWith("[") &&
          !item.startsWith("{")
        ) {
          return `"${item}"`;
        }
        return item;
      });
      return `[${items.join(", ")}]`;
    },
  );

  // 7. Réparer les virgules manquantes dans les tableaux
  // Pattern: "word" "word" -> "word", "word"
  content = content.replace(/"\s+"/g, '", "');

  // 8. Réparer les guillemets non fermés dans les valeurs
  // Cherche les patterns comme "fr": "manger      "es"
  content = content.replace(
    /"([^"]+)"\s*:\s*"([^"]*?)\s{2,}"([^"]+)"/g,
    '"$1": "$2", "$3"',
  );

  return content;
}

/**
 * Extrait manuellement les questions d'un JSON très malformé
 */
function extractQuestionsManually(content: string): RawQuestion[] {
  const questions: RawQuestion[] = [];

  // Trouver tous les blocs de questions
  // Pattern approximatif pour trouver les objets question
  const blockPattern = /\{\s*["']?q["']?\s*[:=]\s*["']([^"']+)["']/gi;

  let match;
  const qTexts: string[] = [];

  while ((match = blockPattern.exec(content)) !== null) {
    qTexts.push(match[1]);
  }

  // Extraire les réponses correspondantes
  const aPattern = /["']?a["']?\s*[:=]\s*["']([^"']+)["']/gi;
  const aTexts: string[] = [];
  while ((match = aPattern.exec(content)) !== null) {
    aTexts.push(match[1]);
  }

  // Extraire les wrong answers
  const wPattern = /["']?w["']?\s*[:=]\s*\[([^\]]+)\]/gi;
  const wTexts: string[][] = [];
  while ((match = wPattern.exec(content)) !== null) {
    const wrongStr = match[1];
    const wrongs = wrongStr
      .split(",")
      .map((w) => w.trim().replace(/["']/g, ""))
      .filter((w) => w.length > 0 && w.length < 50);
    wTexts.push(wrongs);
  }

  // Construire les questions
  const count = Math.min(qTexts.length, aTexts.length);

  for (let i = 0; i < count; i++) {
    const wrongs = wTexts[i] || [];

    // S'assurer qu'on a au moins 3 wrong answers
    if (wrongs.length < 3) {
      // Générer des wrong answers génériques basées sur la bonne réponse
      const correct = aTexts[i];
      const genericWrongs = ["option1", "option2", "option3"];
      while (wrongs.length < 3) {
        wrongs.push(genericWrongs[wrongs.length] || "unknown");
      }
    }

    questions.push({
      q: qTexts[i],
      a: aTexts[i],
      w: wrongs.slice(0, 3),
      fr: "",
      es: aTexts[i],
      t: "v",
    });
  }

  return questions;
}

/**
 * Valide et corrige une question
 */
function validateQuestion(
  q: RawQuestion,
  index: number,
  format: "qcm" | "translation" | "mixed",
): {
  id: string;
  questionText: string;
  correctAnswer: string;
  wrongAnswers: string[];
  type: string;
  wordFr: string;
  wordEs: string;
  aliasesFr: string[];
  aliasesEs: string[];
  format: "qcm" | "translation";
} | null {
  const questionText = q.q || q.questionText || "";
  const correctAnswer = q.a || q.correctAnswer || "";
  let wrongAnswers = (q.w || q.wrongAnswers || []) as string[];

  // Filtrer les réponses vides et les doublons
  wrongAnswers = wrongAnswers
    .filter((w) => w && typeof w === "string" && w.trim() !== "")
    .filter((w) => w.toLowerCase() !== correctAnswer.toLowerCase());

  // Dédupliquer
  const seen = new Set<string>();
  wrongAnswers = wrongAnswers.filter((w) => {
    const lower = w.toLowerCase();
    if (seen.has(lower)) return false;
    seen.add(lower);
    return true;
  });

  // S'assurer qu'il y a exactement 3 mauvaises réponses
  if (wrongAnswers.length < 3) {
    return null;
  } else if (wrongAnswers.length > 3) {
    wrongAnswers = wrongAnswers.slice(0, 3);
  }

  if (!questionText || !correctAnswer) {
    return null;
  }

  let questionType: "vocabulary" | "expression" | "conjugation" = "vocabulary";
  if (q.t === "e") questionType = "expression";
  else if (q.t === "c") questionType = "conjugation";

  return {
    id: `ai-${Date.now()}-${index}`,
    questionText,
    correctAnswer,
    wrongAnswers,
    type: questionType,
    wordFr: q.fr || q.wordFr || "",
    wordEs: q.es || q.wordEs || "",
    aliasesFr: [],
    aliasesEs: [],
    format:
      format === "mixed"
        ? Math.random() > 0.5
          ? "qcm"
          : "translation"
        : format,
  };
}

function parseQuizResponse(
  content: string,
  format: "qcm" | "translation" | "mixed",
): { questions: unknown[]; totalCount: number } {
  // Tentative 1: Parser directement
  try {
    const quizData = JSON.parse(content);
    if (quizData.questions && Array.isArray(quizData.questions)) {
      const questions = quizData.questions
        .map((q: RawQuestion, index: number) =>
          validateQuestion(q, index, format),
        )
        .filter(Boolean);
      return { questions, totalCount: quizData.count || questions.length };
    }
  } catch {
    // Continue to next attempt
  }

  // Tentative 2: Réparer le JSON
  try {
    const repairedContent = repairJson(content);
    const quizData = JSON.parse(repairedContent);
    if (quizData.questions && Array.isArray(quizData.questions)) {
      const questions = quizData.questions
        .map((q: RawQuestion, index: number) =>
          validateQuestion(q, index, format),
        )
        .filter(Boolean);
      return { questions, totalCount: quizData.count || questions.length };
    }
  } catch {
    // Continue to next attempt
  }

  // Tentative 3: Extraction manuelle
  console.log("Attempting manual extraction...");
  const rawQuestions = extractQuestionsManually(content);

  if (rawQuestions.length > 0) {
    const questions = rawQuestions
      .map((q, index) => validateQuestion(q, index, format))
      .filter(Boolean);

    if (questions.length > 0) {
      return { questions, totalCount: questions.length };
    }
  }

  throw new Error("Failed to parse JSON and manual extraction failed");
}

export async function POST(request: NextRequest) {
  try {
    const body: BatchRequestBody = await request.json();
    const {
      prompt,
      batchSize,
      batchIndex,
      direction,
      format,
      locale = "fr",
      previousWords = [],
      stream = false,
      questionCount,
    } = body;

    const numQuestions = Math.min(questionCount || batchSize || 10, 40);

    const { system, user } = getQuizPrompts(locale, {
      prompt,
      questionCount: numQuestions,
      batchSize: numQuestions,
      batchIndex,
      previousWords,
      direction,
    });

    // Prompt système renforcé pour le JSON
    const enhancedSystem = `${system}

CRITICAL: You MUST respond with ONLY valid JSON. No text before or after.
The JSON must have this EXACT structure:
{"questions": [{"q": "question", "a": "answer", "w": ["wrong1", "wrong2", "wrong3"], "fr": "french", "es": "spanish", "t": "v"}]}

Every string must be properly quoted. Every comma must be present. No trailing commas.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: user + "\n\nRespond with valid JSON only:",
      config: {
        systemInstruction: enhancedSystem,
        temperature: 0.3,
        maxOutputTokens: Math.max(4000, numQuestions * 400),
        responseMimeType: "application/json",
      },
    });

    const content = response.text;

    if (!content) {
      console.error("No content from Gemini");
      return NextResponse.json(
        { error: "No content from AI" },
        { status: 500 },
      );
    }

    try {
      const { questions, totalCount } = parseQuizResponse(content, format);

      if (questions.length === 0) {
        console.error(
          "No valid questions. Content preview:",
          content.substring(0, 500),
        );
        return NextResponse.json(
          { error: "No valid questions generated. Please try again." },
          { status: 500 },
        );
      }

      return NextResponse.json({
        questions,
        totalCount: batchIndex === 0 ? totalCount : undefined,
      });
    } catch (parseError) {
      console.error("Parse error:", parseError);
      console.error("Full content:", content);
      return NextResponse.json(
        { error: "Failed to parse AI response. Please try again." },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
