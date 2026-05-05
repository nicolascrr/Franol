import { NextRequest, NextResponse } from "next/server";
import { getAIClient } from "@/lib/ai/client";
import { getSimpleQuizPrompts } from "@/lib/prompts";
import type { Locale } from "@/lib/prompts";
import { sanitizeStringInput, validateEnum, validateNumber } from "@/lib/auth/input-validation";

export const dynamic = "force-dynamic";

interface QuizRequestBody {
  prompt: string;
  questionCount: number;
  direction: "fr-to-es" | "es-to-fr";
  format: "qcm" | "translation" | "mixed";
  locale?: Locale;
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        { error: "Content-Type must be application/json" },
        { status: 400 },
      );
    }

    let body: QuizRequestBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 },
      );
    }

    const { format, locale = "fr" } = body;

    // Sanitize and validate prompt
    const prompt = sanitizeStringInput(body.prompt, 2000);
    if (!prompt) {
      return NextResponse.json(
        { error: "Missing or invalid 'prompt' field" },
        { status: 400 },
      );
    }

    // Validate question count
    const questionCount = validateNumber(body.questionCount, 1, 40);
    if (!questionCount) {
      return NextResponse.json(
        { error: "Invalid questionCount (must be 1-40)" },
        { status: 400 },
      );
    }

    const validatedLocale = validateEnum<Locale>(locale, ["fr", "es"]) || "fr";
    const validatedDirection = validateEnum(body.direction, ["fr-to-es", "es-to-fr"]) || "fr-to-es";
    const validatedFormat = validateEnum(format, ["qcm", "translation", "mixed"]) || "qcm";

    const { system: systemPrompt, user: userPrompt } = getSimpleQuizPrompts(
      validatedLocale,
      { prompt, questionCount },
    );

    const ai = getAIClient();

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        maxOutputTokens: 4000,
        responseMimeType: "application/json",
      },
    });

    const content = response.text;

    if (!content) {
      console.error("[GenerateQuiz] No content from Gemini");
      return NextResponse.json(
        { error: "No content from AI" },
        { status: 500 },
      );
    }

    // Parse JSON response - handle potential markdown wrapping
    let jsonContent = content.trim();
    if (jsonContent.startsWith("```json")) {
      jsonContent = jsonContent.slice(7);
    }
    if (jsonContent.startsWith("```")) {
      jsonContent = jsonContent.slice(3);
    }
    if (jsonContent.endsWith("```")) {
      jsonContent = jsonContent.slice(0, -3);
    }
    jsonContent = jsonContent.trim();

    let quizData;
    try {
      quizData = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error("[GenerateQuiz] JSON parse error:", parseError);
      return NextResponse.json(
        { error: "Failed to parse AI response. Please try again." },
        { status: 500 },
      );
    }

    if (!quizData.questions || !Array.isArray(quizData.questions)) {
      console.error("[GenerateQuiz] Invalid structure in AI response");
      return NextResponse.json(
        { error: "Invalid quiz structure from AI" },
        { status: 500 },
      );
    }

    // Assign format to each question
    const questions = quizData.questions.map(
      (q: Record<string, unknown>, index: number) => ({
        ...q,
        id: `ai-${Date.now()}-${index}`,
        format:
          validatedFormat === "mixed"
            ? Math.random() > 0.5
              ? "qcm"
              : "translation"
            : validatedFormat,
      }),
    );

    return NextResponse.json({ questions });
  } catch (error) {
    console.error("[GenerateQuiz] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
