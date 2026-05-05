/**
 * Decode base64 string with proper UTF-8 handling.
 * atob() alone mangles multi-byte characters (á → Ã¡),
 * so we use TextDecoder to correctly reconstruct UTF-8.
 */
function decodeB64(b64: string): string {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder("utf-8").decode(bytes);
}

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

// ---------------------------------------------------------------------------
// US-Q5/Q6: Conjugation types and client function
// ---------------------------------------------------------------------------

export interface ConjugationVerbInput {
  id: string;
  infinitiveFr: string;
  infinitiveEs: string;
  /** Per-verb tense key */
  tenseKey: string;
  /** Per-verb localized tense label */
  tenseLabel: string;
  /** Per-verb target-language pronoun */
  pronoun: string;
}

export interface ConjugationResult {
  id: string;
  correct: string;
  wrongAnswers: string[];
  tenseUsed: string;
}

export interface AIConjugationResponse {
  conjugations: ConjugationResult[];
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

export interface WrongAnswerRequest {
  id: string;
  correctAnswer: string;
  questionText: string;
  type: "vocabulary" | "expression";
  targetLang: "fr" | "es";
}

export interface WrongAnswerResult {
  id: string;
  wrongAnswers: string[];
}

/**
 * US-Q7: Batch-generate wrong answers for QCM questions via AI.
 * Falls back to empty arrays on failure — caller should use DB fallback.
 */
export async function generateWrongAnswersBatch(
  items: WrongAnswerRequest[],
  locale: "fr" | "es",
): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>();

  if (items.length === 0) return result;

  console.log(`[WrongAnswers] Generating AI wrong answers for ${items.length} items (locale: ${locale})`);

  try {
    const response = await fetch("/api/ai/wrong-answers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items, locale }),
    });

    if (!response.ok) {
      console.error(`[WrongAnswers] API returned ${response.status}`);
      return result;
    }

    const data: { results: WrongAnswerResult[] } = await response.json();

    if (data.results && Array.isArray(data.results)) {
      for (const r of data.results) {
        result.set(r.id, r.wrongAnswers || []);
      }
      console.log(`[WrongAnswers] Received ${data.results.length} results from AI`);
    } else {
      console.error("[WrongAnswers] No results array in AI response");
    }
  } catch (error) {
    console.error("[WrongAnswers] Failed to generate wrong answers via AI:", error);
  }

  return result;
}

// ---------------------------------------------------------------------------
// US-Q5/Q6: AI-powered conjugation generation
// ---------------------------------------------------------------------------

/**
 * Calls the conjugation API to generate conjugated forms + wrong answers for QCM.
 * Each verb carries its own tense and pronoun for variety.
 */
export async function generateConjugationBatch(
  verbs: ConjugationVerbInput[],
  direction: string,
  locale: "fr" | "es",
  format: "qcm" | "translation" | "mixed",
  allTenseKeys: string[],
): Promise<AIConjugationResponse> {
  const response = await fetch("/api/ai/conjugation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      verbs,
      direction,
      locale,
      format,
      allTenseKeys,
    }),
  });

  if (!response.ok) {
    const errorMsg = `Failed to generate conjugations: ${response.status}`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  const data: { conjugations: ConjugationResult[] } = await response.json();

  if (!data.conjugations || data.conjugations.length === 0) {
    throw new Error("No conjugations returned from AI");
  }

  // Decode obfuscated correct answers (base64 with proper UTF-8 handling)
  const decoded: AIConjugationResponse = {
    conjugations: data.conjugations.map((c) => ({
      ...c,
      correct: decodeB64(c.correct),
    })),
  };

  return decoded;
}
