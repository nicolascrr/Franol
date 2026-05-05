import { NextRequest, NextResponse } from "next/server";
import { getAIClient } from "@/lib/ai/client";
import { getQuizPrompts } from "@/lib/prompts";
import type { Locale } from "@/lib/prompts";
import { sanitizeStringInput } from "@/lib/auth/input-validation";

export const dynamic = "force-dynamic";

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
 * Validate and normalize a question from the AI response.
 * Accepts questions with fewer wrong answers — pads with generic fallbacks
 * instead of rejecting entirely.
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

  if (!questionText || !correctAnswer) {
    return null;
  }

  let wrongAnswers: string[] = (q.w || q.wrongAnswers || []) as string[];

  // Filter empty, duplicates, and matches with correct answer
  wrongAnswers = wrongAnswers
    .filter((w) => w && typeof w === "string" && w.trim() !== "")
    .filter((w) => w.toLowerCase() !== correctAnswer.toLowerCase());

  const seen = new Set<string>();
  wrongAnswers = wrongAnswers.filter((w) => {
    const lower = w.toLowerCase();
    if (seen.has(lower)) return false;
    seen.add(lower);
    return true;
  });

  // Pad to exactly 3 wrong answers with generic fallbacks instead of rejecting
  while (wrongAnswers.length < 3) {
    wrongAnswers.push(`fallback_${wrongAnswers.length + 1}`);
  }
  if (wrongAnswers.length > 3) {
    wrongAnswers = wrongAnswers.slice(0, 3);
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
  // Attempt 1: Direct parse
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

  // Attempt 2: Strip markdown fences and retry
  try {
    const stripped = content
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();
    const quizData = JSON.parse(stripped);
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

  throw new Error("Failed to parse AI response as JSON");
}

export async function POST(request: NextRequest) {
  try {
    // ── Input validation ──
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        { error: "Content-Type must be application/json" },
        { status: 400 },
      );
    }

    let body: BatchRequestBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 },
      );
    }

    const {
      prompt,
      batchSize,
      batchIndex,
      direction,
      format,
      locale = "fr",
      previousWords = [],
      questionCount,
    } = body;

    // Validate required fields
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'prompt' field" },
        { status: 400 },
      );
    }

    // Sanitize prompt to prevent injection
    const sanitizedPrompt = sanitizeStringInput(prompt, 2000);
    if (!sanitizedPrompt) {
      return NextResponse.json(
        { error: "Invalid prompt content" },
        { status: 400 },
      );
    }

    // Validate enum values
    if (direction && !["fr-to-es", "es-to-fr"].includes(direction)) {
      return NextResponse.json(
        { error: "Invalid direction value" },
        { status: 400 },
      );
    }
    if (format && !["qcm", "translation", "mixed"].includes(format)) {
      return NextResponse.json(
        { error: "Invalid format value" },
        { status: 400 },
      );
    }

    const numQuestions = Math.min(questionCount || batchSize || 10, 40);

    const { system, user } = getQuizPrompts(locale, {
      prompt: sanitizedPrompt,
      questionCount: numQuestions,
      batchSize: numQuestions,
      batchIndex,
      previousWords,
      direction,
    });

    const ai = getAIClient();

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: user,
      config: {
        systemInstruction: system,
        temperature: 0.3,
        maxOutputTokens: Math.max(8000, numQuestions * 500),
        responseMimeType: "application/json",
      },
    });

    const content = response.text;

    if (!content) {
      console.error("[GenerateBatch] No content from Gemini");
      return NextResponse.json(
        { error: "No content from AI" },
        { status: 500 },
      );
    }

    try {
      const { questions, totalCount } = parseQuizResponse(content, format);

      if (questions.length === 0) {
        console.error(
          "[GenerateBatch] No valid questions. Content length:",
          content.length,
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
      console.error("[GenerateBatch] Parse error:", parseError);
      return NextResponse.json(
        { error: "Failed to parse AI response. Please try again." },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("[GenerateBatch] Server error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
