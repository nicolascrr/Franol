import { NextRequest, NextResponse } from "next/server";
import { getAIClient } from "@/lib/ai/client";
import { getWrongAnswersPrompts } from "@/lib/prompts";
import type { Locale } from "@/lib/prompts";
import { sanitizeStringInput, validateEnum } from "@/lib/auth/input-validation";

export const dynamic = "force-dynamic";

interface WrongAnswerItem {
  id: string;
  correctAnswer: string;
  questionText: string;
  type: "vocabulary" | "expression";
  targetLang: "fr" | "es";
}

interface WrongAnswerRequestBody {
  items: WrongAnswerItem[];
  locale: Locale;
}

interface WrongAnswerResult {
  id: string;
  wrongAnswers: string[];
}

/**
 * Parse the AI response and validate wrong answers.
 * Ensures: no duplicates, no match with correct answer, exactly 3 per item.
 */
function parseWrongAnswersResponse(
  content: string,
  items: WrongAnswerItem[],
): WrongAnswerResult[] {
  let parsed: { results?: unknown[] };

  try {
    parsed = JSON.parse(content);
  } catch {
    try {
      const stripped = content
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .trim();
      parsed = JSON.parse(stripped);
    } catch {
      console.error("[WrongAnswers] JSON parse failed. Content length:", content.length);
      return items.map((item) => ({ id: item.id, wrongAnswers: [] }));
    }
  }

  const results = parsed.results;
  if (!Array.isArray(results)) {
    console.error("[WrongAnswers] No results array in response");
    return items.map((item) => ({ id: item.id, wrongAnswers: [] }));
  }

  // Build a map of correct answers for validation
  const correctMap = new Map<string, string>();
  for (const item of items) {
    correctMap.set(item.id, item.correctAnswer);
  }

  return results
    .map((r: unknown) => {
      const result = r as Record<string, unknown>;
      const id = typeof result.id === "string" ? result.id : "";
      if (!id) return null;

      const correctAnswer = correctMap.get(id) || "";
      let wrongAnswers: string[] = Array.isArray(result.wrongAnswers)
        ? (result.wrongAnswers as string[])
            .filter((w: unknown) => typeof w === "string" && (w as string).trim() !== "")
            .map((w: string) => (w as string).trim())
            .slice(0, 3)
        : [];

      // Deduplicate and remove any that match the correct answer
      const seen = new Set<string>();
      wrongAnswers = wrongAnswers.filter((w) => {
        const lower = w.toLowerCase();
        if (seen.has(lower) || lower === correctAnswer.toLowerCase()) return false;
        seen.add(lower);
        return true;
      });

      return { id, wrongAnswers };
    })
    .filter(Boolean) as WrongAnswerResult[];
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

    let body: WrongAnswerRequestBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 },
      );
    }

    const { items, locale = "fr" } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "No items provided" },
        { status: 400 },
      );
    }

    if (items.length > 50) {
      return NextResponse.json(
        { error: "Too many items (max 50)" },
        { status: 400 },
      );
    }

    const validatedLocale = validateEnum<Locale>(locale, ["fr", "es"]) || "fr";

    // Sanitize item inputs
    const sanitizedItems = items.map((item) => ({
      id: sanitizeStringInput(item.id, 100),
      correctAnswer: sanitizeStringInput(item.correctAnswer, 200),
      questionText: sanitizeStringInput(item.questionText, 500),
      type: validateEnum(item.type, ["vocabulary", "expression"]) || "vocabulary",
      targetLang: validateEnum(item.targetLang, ["fr", "es"]) || "fr",
    })).filter((item) => item.id && item.correctAnswer && item.questionText);

    if (sanitizedItems.length === 0) {
      return NextResponse.json(
        { error: "No valid items after sanitization" },
        { status: 400 },
      );
    }

    const { system, user } = getWrongAnswersPrompts(validatedLocale, { items: sanitizedItems });

    const ai = getAIClient();

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: user,
      config: {
        systemInstruction: system,
        temperature: 0.7,
        maxOutputTokens: Math.max(4000, sanitizedItems.length * 200),
        responseMimeType: "application/json",
      },
    });

    const content = response.text;

    if (!content) {
      console.error("[WrongAnswers] No content from Gemini");
      return NextResponse.json(
        { error: "No content from AI" },
        { status: 500 },
      );
    }

    const results = parseWrongAnswersResponse(content, sanitizedItems);

    return NextResponse.json({ results });
  } catch (error) {
    console.error("[WrongAnswers] API error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
