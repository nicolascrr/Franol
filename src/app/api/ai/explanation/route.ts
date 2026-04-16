import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getExplanationPrompts } from "@/lib/prompts";
import type { Locale } from "@/lib/prompts";

export const dynamic = "force-dynamic";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY ?? "" });

interface ExplanationRequestBody {
  question: string;
  correctAnswer: string;
  userAnswer: string;
  locale: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ExplanationRequestBody = await request.json();
    const { question, correctAnswer, userAnswer, locale } = body;

    const localeTyped: Locale = locale === "es" ? "es" : "fr";
    const wasCorrect =
      userAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();

    // Utiliser les prompts centralisés
    const { system: systemPrompt, user: userPrompt } = getExplanationPrompts(
      localeTyped,
      {
        question,
        correctAnswer,
        userAnswer,
        wasCorrect,
      },
    );

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
    console.error("Error getting explanation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
