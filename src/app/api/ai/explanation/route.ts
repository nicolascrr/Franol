import { NextRequest, NextResponse } from "next/server";
import { getExplanationPrompts } from "@/lib/prompts";
import type { Locale } from "@/lib/prompts";

const OPENAI_API_KEY = process.env.API_KEY;

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
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("OpenAI API error:", errorData);
      return NextResponse.json(
        { error: "Failed to get explanation" },
        { status: 500 },
      );
    }

    const data = await response.json();
    const explanation = data.choices?.[0]?.message?.content;

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
