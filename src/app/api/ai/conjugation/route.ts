import { NextRequest, NextResponse } from "next/server";
import { getAIClient } from "@/lib/ai/client";
import { getConjugationPrompts } from "@/lib/prompts";
import type { Locale, ConjugationVerbSpec } from "@/lib/prompts";
import { validateEnum, validateStringArray } from "@/lib/auth/input-validation";

export const dynamic = "force-dynamic";

interface ConjugationRequestBody {
  verbs: ConjugationVerbSpec[];
  direction: string;
  locale: Locale;
  format: "qcm" | "translation" | "mixed";
  allTenseKeys: string[];
}

interface ConjugationResult {
  id: string;
  correct: string;
  wrongAnswers: string[];
  tenseUsed: string;
}

function parseConjugationResponse(
  content: string,
  verbs: ConjugationVerbSpec[],
  format: "qcm" | "translation" | "mixed",
): ConjugationResult[] {
  let parsed: { conjugations?: unknown[] };

  // Attempt 1: Direct parse
  try {
    parsed = JSON.parse(content);
  } catch {
    // Attempt 2: Strip markdown fences
    try {
      const stripped = content
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .trim();
      parsed = JSON.parse(stripped);
    } catch (stripError) {
      console.error("[Conjugation] JSON parse failed. Content length:", content.length);
      console.error("[Conjugation] Parse error:", stripError);
      return [];
    }
  }

  const conjugations = parsed.conjugations;
  if (!Array.isArray(conjugations) || conjugations.length === 0) {
    console.error("[Conjugation] No conjugations array in response");
    return [];
  }

  const needsWrongAnswers = format !== "translation";

  return conjugations
    .map((c: unknown, index: number) => {
      const item = c as Record<string, unknown>;

      const id = (typeof item.id === "string" ? item.id : "") || verbs[index]?.id || `unknown-${index}`;
      const correct = typeof item.correct === "string" ? (item.correct as string).trim() : "";
      if (!correct) return null;

      // Validate wrong answers for QCM
      let wrongAnswers: string[] = [];
      if (needsWrongAnswers) {
        wrongAnswers = Array.isArray(item.wrongAnswers)
          ? (item.wrongAnswers as string[])
              .filter((w: unknown) => typeof w === "string" && (w as string).trim() !== "")
              .slice(0, 3)
          : [];

        // Deduplicate + remove any that match correct answer
        const seen = new Set<string>();
        wrongAnswers = wrongAnswers.filter((w) => {
          const lower = w.toLowerCase();
          if (seen.has(lower) || lower === correct.toLowerCase()) return false;
          seen.add(lower);
          return true;
        });

        // Pad with fallback if fewer than 3
        while (wrongAnswers.length < 3) {
          wrongAnswers.push(`fallback_${wrongAnswers.length + 1}`);
        }
      }

      return {
        id,
        correct,
        wrongAnswers,
        tenseUsed: typeof item.tenseUsed === "string" ? (item.tenseUsed as string) : "",
      };
    })
    .filter(Boolean) as ConjugationResult[];
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

    let body: ConjugationRequestBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 },
      );
    }

    const {
      verbs,
      direction,
      locale = "fr",
      format,
      allTenseKeys,
    } = body;

    // Validate required fields
    if (!verbs || !Array.isArray(verbs) || verbs.length === 0) {
      return NextResponse.json(
        { error: "No verbs provided" },
        { status: 400 },
      );
    }

    if (verbs.length > 50) {
      return NextResponse.json(
        { error: "Too many verbs (max 50)" },
        { status: 400 },
      );
    }

    const validatedLocale = validateEnum(locale, ["fr", "es"]) || "fr";
    const validatedFormat = validateEnum(format, ["qcm", "translation", "mixed"]) || "qcm";
    const validatedTenses = validateStringArray(allTenseKeys, 50, 30);

    const generateWrongAnswers = validatedFormat !== "translation";

    const { system, user } = getConjugationPrompts(validatedLocale, {
      verbs,
      direction,
      generateWrongAnswers,
      allTenseKeys: validatedTenses,
    });

    const ai = getAIClient();

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: user,
      config: {
        systemInstruction: system,
        temperature: 0.2,
        maxOutputTokens: generateWrongAnswers
          ? Math.max(16000, verbs.length * 1200)
          : Math.max(8000, verbs.length * 400),
        responseMimeType: "application/json",
      },
    });

    const content = response.text;

    if (!content) {
      console.error("[Conjugation] No content from Gemini");
      return NextResponse.json(
        { error: "No content from AI" },
        { status: 500 },
      );
    }

    const results = parseConjugationResponse(content, verbs, validatedFormat);

    if (results.length === 0) {
      console.error("[Conjugation] No valid conjugations. Content length:", content.length);
      return NextResponse.json(
        { error: "No valid conjugations generated" },
        { status: 500 },
      );
    }

    // Obfuscate correct answers so they're not readable in browser devtools
    const obfuscated = results.map((r) => ({
      ...r,
      correct: Buffer.from(r.correct, "utf-8").toString("base64"),
    }));

    return NextResponse.json({ conjugations: obfuscated });
  } catch (error) {
    console.error("[Conjugation] API error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
