import { NextRequest, NextResponse } from "next/server";
import { getSimpleQuizPrompts } from "@/lib/prompts";
import type { Locale } from "@/lib/prompts";

const OPENAI_API_KEY = process.env.API_KEY;

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

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_completion_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("OpenAI API error:", response.status, errorData);
      return NextResponse.json(
        { error: `API error: ${response.status}`, details: errorData },
        { status: 500 },
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error("No content in response:", JSON.stringify(data));
      return NextResponse.json(
        { error: "No content from AI", details: data },
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
