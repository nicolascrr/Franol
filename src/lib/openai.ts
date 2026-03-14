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

/**
 * Génère un quiz via l'API AI
 * Note: Le streaming est désactivé côté serveur pour plus de fiabilité
 */
export async function generateAIQuizBatchWithStream(
  prompt: string,
  questionCount: number,
  batchIndex: number,
  /** Quiz direction in `{LangCode}-to-{LangCode}` format, e.g. "fr-to-es". */
  direction: string,
  format: "qcm" | "translation" | "mixed",
  locale: "fr" | "es",
  previousWords: string[] = [],
  callbacks: StreamCallbacks = {},
): Promise<AIBatchResult> {
  const { onComplete, onError } = callbacks;

  const response = await fetch("/api/ai/generate-batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      questionCount,
      batchIndex,
      direction,
      format,
      locale,
      previousWords,
      stream: false, // Désactivé pour plus de fiabilité
    }),
  });

  if (!response.ok) {
    const errorMsg = `Failed to generate batch: ${response.status}`;
    onError?.(errorMsg);
    throw new Error(errorMsg);
  }

  // Handle non-streaming JSON response
  const data: AIBatchResult = await response.json();

  if (!data.questions || data.questions.length === 0) {
    const errorMsg = "No questions returned from AI";
    onError?.(errorMsg);
    throw new Error(errorMsg);
  }

  onComplete?.(data);
  return data;
}
