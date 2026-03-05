export interface AIQuizQuestion {
  questionText: string;
  correctAnswer: string;
  wrongAnswers: string[];
  explanation: string;
  type: "vocabulary" | "expression" | "conjugation";
  format?: "qcm" | "translation";
  // For vocabulary addition
  wordFr?: string;
  wordEs?: string;
  aliasesFr?: string[];
  aliasesEs?: string[];
}

export interface AIQuizResponse {
  questions: AIQuizQuestion[];
  totalCount?: number;
}

export interface AIBatchResult {
  questions: AIQuizQuestion[];
  totalCount?: number;
}

export interface AIExplanationResponse {
  explanation: string;
}

export interface StreamCallbacks {
  onProgress?: (text: string) => void;
  onComplete?: (result: AIBatchResult) => void;
  onError?: (error: string) => void;
}

export async function getAIExplanation(
  question: string,
  correctAnswer: string,
  userAnswer: string,
  locale: string,
): Promise<string> {
  const response = await fetch("/api/ai/explanation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, correctAnswer, userAnswer, locale }),
  });

  if (!response.ok) {
    throw new Error("Failed to get explanation");
  }

  const data: AIExplanationResponse = await response.json();
  return data.explanation;
}

export async function generateAIQuizBatchWithStream(
  prompt: string,
  questionCount: number,
  batchIndex: number,
  direction: "fr-to-es" | "es-to-fr",
  format: "qcm" | "translation" | "mixed",
  locale: "fr" | "es",
  previousWords: string[] = [],
  callbacks: StreamCallbacks = {},
): Promise<AIBatchResult> {
  const { onProgress, onComplete, onError } = callbacks;

  const response = await fetch("/api/ai/generate-batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      questionCount, // Envoyer le nombre total de questions
      batchIndex,
      direction,
      format,
      locale,
      previousWords,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorMsg = "Failed to generate batch";
    onError?.(errorMsg);
    throw new Error(errorMsg);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    const errorMsg = "No response body";
    onError?.(errorMsg);
    throw new Error(errorMsg);
  }

  const decoder = new TextDecoder();
  let result: AIBatchResult = { questions: [] };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value);
      const lines = text.split("\n").filter((line) => line.trim() !== "");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          try {
            const parsed = JSON.parse(data);

            if (parsed.error) {
              onError?.(parsed.error);
              throw new Error(parsed.error);
            }

            if (parsed.delta) {
              onProgress?.(parsed.delta);
            }

            if (parsed.done) {
              result = {
                questions: parsed.questions || [],
                totalCount: parsed.totalCount,
              };
              onComplete?.(result);
            }
          } catch (e) {
            if (e instanceof SyntaxError) {
              // Ignore JSON parse errors for partial data
            } else {
              throw e;
            }
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return result;
}
