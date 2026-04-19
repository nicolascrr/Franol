import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getSimpleQuizPrompts } from "@/lib/prompts";
import type { Locale } from "@/lib/prompts";

export const dynamic = 'force-dynamic';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY ?? "" });

interface QuizRequestBody {
  prompt: string;
  questionCount: number;
  direction: "fr-to-es" | "es-to-fr";
  format: "qcm" | "translation" | "mixed";
  locale?: Locale;
}

export async function POST(request: NextRequest) {
  try {
    const body: QuizRequestBody = await request.json();
    const { prompt, questionCount, format, locale = "fr" } = body;

    // Utiliser les prompts centralisés
    const { system: systemPrompt, user: userPrompt } = getSimpleQuizPrompts(
      locale,
      {
        prompt,
        questionCount,
      },
    );

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
      console.error("No content in response from Gemini");
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
      console.error("JSON parse error:", parseError, "Content:", jsonContent);
      return NextResponse.json(
        { error: "Invalid JSON from AI", content: jsonContent },
        { status: 500 },
      );
    }

    if (!quizData.questions || !Array.isArray(quizData.questions)) {
      console.error("Invalid structure:", quizData);
      return NextResponse.json(
        { error: "Invalid quiz structure", data: quizData },
        { status: 500 },
      );
    }

    // Assign format to each question
    const questions = quizData.questions.map(
      (q: Record<string, unknown>, index: number) => ({
        ...q,
        id: `ai-${Date.now()}-${index}`,
        format:
          format === "mixed"
            ? Math.random() > 0.5
              ? "qcm"
              : "translation"
            : format,
      }),
    );

    return NextResponse.json({ questions });
  } catch (error) {
    console.error("Error generating quiz:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 },
    );
  }
}
