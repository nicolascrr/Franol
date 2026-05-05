import { NextRequest, NextResponse } from "next/server";
import { getAIClient } from "@/lib/ai/client";
import { getExplanationPrompts } from "@/lib/prompts";
import type { Locale } from "@/lib/prompts";
import { sanitizeStringInput, validateEnum } from "@/lib/auth/input-validation";

export const dynamic = "force-dynamic";

interface ExplanationRequestBody {
  question: string;
  correctAnswer: string;
  userAnswer: string;
  locale: string;
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

    let body: ExplanationRequestBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 },
      );
    }

    const { locale } = body;

    // Sanitize all string inputs
    const question = sanitizeStringInput(body.question, 500);
    const correctAnswer = sanitizeStringInput(body.correctAnswer, 200);
    const userAnswer = sanitizeStringInput(body.userAnswer, 200);

    if (!question || !correctAnswer || !userAnswer) {
      return NextResponse.json(
        { error: "Missing required fields: question, correctAnswer, userAnswer" },
        { status: 400 },
      );
    }

    const localeTyped: Locale = validateEnum<Locale>(locale, ["fr", "es"]) || "fr";
    const wasCorrect =
      userAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();

    const { system: systemPrompt, user: userPrompt } = getExplanationPrompts(
      localeTyped,
      { question, correctAnswer, userAnswer, wasCorrect },
    );

    const ai = getAIClient();

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.4,
        maxOutputTokens: 3000,
      },
    });

    const explanation = response.text;

    if (!explanation) {
      return NextResponse.json(
        { error: "No explanation from AI" },
        { status: 500 },
      );
    }

    return NextResponse.json({ explanation: explanation.trim() });
  } catch (error) {
    console.error("[Explanation] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
