import { NextRequest, NextResponse } from "next/server";
import { getQuizPrompts } from "@/lib/prompts";
import type { Locale } from "@/lib/prompts";

export const dynamic = 'force-dynamic';

const OPENAI_API_KEY = process.env.API_KEY;

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
  t?: string; // "v" = vocabulary, "e" = expression, "c" = conjugation/verb
}

/**
 * Valide et corrige une question pour s'assurer qu'elle a 4 réponses
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
    .filter((w) => w && w.trim() !== "")
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
    return null; // Question invalide, pas assez de mauvaises réponses
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
) {
  let jsonContent = content.trim();

  // Nettoyer le markdown
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

  const quizData = JSON.parse(jsonContent);
  const rawQuestions = quizData.questions || [];

  // Valider chaque question
  const questions = rawQuestions
    .map((q: RawQuestion, index: number) => validateQuestion(q, index, format))
    .filter(Boolean);

  return { questions, totalCount: quizData.count || questions.length };
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

    // Calculer le nombre de questions à générer
    const numQuestions = questionCount || batchSize || 10;

    // Générer les prompts
    const { system, user } = getQuizPrompts(locale, {
      prompt,
      questionCount: numQuestions,
      batchSize: numQuestions,
      batchIndex,
      previousWords,
      direction,
    });

    // Paramètres optimisés pour la cohérence
    const apiParams = {
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.7, // Réduit pour plus de cohérence
      max_tokens: Math.max(4000, numQuestions * 300), // Adapter selon le nombre (max ~40 questions)
    };

    if (stream) {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({ ...apiParams, stream: true }),
        },
      );

      if (!response.ok || !response.body) {
        const errorData = await response.text();
        console.error("OpenAI API error:", response.status, errorData);
        return NextResponse.json(
          { error: `API error: ${response.status}` },
          { status: 500 },
        );
      }

      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      const transformStream = new TransformStream({
        transform(chunk, controller) {
          controller.enqueue(chunk);
        },
      });

      const writer = transformStream.writable.getWriter();

      (async () => {
        const reader = response.body!.getReader();
        let fullContent = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const text = decoder.decode(value);
            const lines = text.split("\n").filter((line) => line.trim() !== "");

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") continue;

                try {
                  const parsed = JSON.parse(data);
                  const delta = parsed.choices?.[0]?.delta?.content || "";
                  if (delta) {
                    fullContent += delta;
                    await writer.write(
                      encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`),
                    );
                  }
                } catch {
                  // Ignore parsing errors
                }
              }
            }
          }

          try {
            const { questions, totalCount } = parseQuizResponse(
              fullContent,
              format,
            );

            await writer.write(
              encoder.encode(
                `data: ${JSON.stringify({
                  done: true,
                  questions,
                  totalCount: batchIndex === 0 ? totalCount : undefined,
                })}\n\n`,
              ),
            );
          } catch (parseError) {
            console.error("JSON parse error:", fullContent);
            await writer.write(
              encoder.encode(
                `data: ${JSON.stringify({ error: "Invalid JSON" })}\n\n`,
              ),
            );
          }

          await writer.close();
        } catch (error) {
          console.error("Stream error:", error);
          await writer.write(
            encoder.encode(
              `data: ${JSON.stringify({ error: "Stream error" })}\n\n`,
            ),
          );
          await writer.close();
        }
      })();

      return new Response(transformStream.readable, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // Non-streaming mode
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify(apiParams),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("OpenAI API error:", response.status, errorData);
      return NextResponse.json(
        { error: `API error: ${response.status}` },
        { status: 500 },
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error("No content:", JSON.stringify(data));
      return NextResponse.json(
        { error: "No content from AI" },
        { status: 500 },
      );
    }

    try {
      const { questions, totalCount } = parseQuizResponse(content, format);

      return NextResponse.json({
        questions,
        totalCount: batchIndex === 0 ? totalCount : undefined,
      });
    } catch {
      console.error("JSON parse error:", content);
      return NextResponse.json({ error: "Invalid JSON" }, { status: 500 });
    }
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
