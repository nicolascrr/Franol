"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/contexts/LocaleContext";
import type { QuizDirection } from "@/lib/quiz";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";

/**
 * Parse le prompt utilisateur pour extraire le nombre de questions et le thème nettoyé.
 * Exemples:
 *   "4 pays difficile"       → { count: 4, theme: "pays difficile" }
 *   "10 mots sur la cuisine" → { count: 10, theme: "mots sur la cuisine" }
 *   "animaux sauvages"       → { count: 10, theme: "animaux sauvages" }
 */
function parsePrompt(prompt: string): { count: number; theme: string } {
  const trimmed = prompt.trim();

  // Chercher un nombre en début de prompt suivi du reste
  const leadingNumber = trimmed.match(/^(\d+)\s+(.+)$/);
  if (leadingNumber) {
    const count = parseInt(leadingNumber[1], 10);
    if (count >= 1 && count <= 99) {
      return {
        count: Math.min(40, Math.max(3, count)),
        theme: leadingNumber[2].trim(),
      };
    }
  }

  // Chercher un nombre après un mot clé: "quiz de 10 mots"
  const inlineNumber = trimmed.match(/^(.+?)\b(\d+)\s+(.+)$/);
  if (inlineNumber) {
    const count = parseInt(inlineNumber[2], 10);
    if (count >= 1 && count <= 99) {
      const before = inlineNumber[1].trim().replace(/\s*de\s*$/i, "").replace(/\s*sobre\s*$/i, "").trim();
      const after = inlineNumber[3].trim();
      const theme = before ? `${before} ${after}` : after;
      return {
        count: Math.min(40, Math.max(3, count)),
        theme,
      };
    }
  }

  // Pas de nombre trouvé → 10 par défaut, thème = prompt entier
  return { count: 10, theme: trimmed };
}

export function DiscoveryContent() {
  const { t, locale } = useLocale();
  const router = useRouter();

  const [customPrompt, setCustomPrompt] = useState("");
  const [direction, setDirection] = useState<QuizDirection>(
    locale === "fr" ? "fr-to-es" : "es-to-fr",
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  const handleStart = async () => {
    if (!customPrompt.trim()) {
      setError(t("practice.discovery.promptRequired"));
      return;
    }

    setIsGenerating(true);
    setError("");

    try {
      // Extraire le nombre de questions et le thème nettoyé du prompt
      const { count, theme } = parsePrompt(customPrompt.trim());

      const config = {
        mode: "discovery" as const,
        format: "qcm" as const,
        questionCount: count,
        direction,
        prompt: theme, // Thème nettoyé sans le nombre
        originalPrompt: customPrompt.trim(), // Prompt original pour affichage
        isAI: true,
      };

      // Nettoyer tout quiz précédent avant de lancer le nouveau
      localStorage.removeItem("savedQuiz");
      sessionStorage.removeItem("cachedQuizQuestions");
      sessionStorage.removeItem("excludedWords");

      sessionStorage.setItem("quizConfig", JSON.stringify(config));
      router.push("/dashboard/practice/quiz");
    } catch {
      setError(t("common.error"));
      setIsGenerating(false);
    }
  };

  const examplePrompts =
    locale === "fr"
      ? [
          "10 mots sur la cuisine espagnole",
          "15 expressions familières pour les jeunes",
          "20 verbes d'action niveau débutant",
          "Quiz difficile sur le vocabulaire médical",
        ]
      : [
          "10 palabras sobre la cocina francesa",
          "15 expresiones coloquiales para jóvenes",
          "20 verbos de acción nivel principiante",
          "Quiz difícil sobre vocabulario médico",
        ];

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto">
      {/* Header */}
      <header className="mb-8 animate-fade-in">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-franol-muted hover:text-franol-text
                     transition-colors mb-4"
        >
          <ArrowLeft size={20} />
          {t("common.back")}
        </button>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-franol-text">
            {t("practice.discovery.title")}
          </h1>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full text-xs font-semibold text-white">
            <Sparkles size={12} />
            IA
          </div>
        </div>
        <p className="mt-2 text-franol-muted">
          {t("practice.discovery.subtitle")}
        </p>
      </header>

      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 animate-fade-in">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Main Prompt Input */}
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl p-6 border border-orange-200 animate-slide-up">
          <label className="block text-sm font-semibold text-franol-text mb-2">
            {t("practice.discovery.describeQuiz")}
          </label>
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder={t("practice.discovery.promptPlaceholder")}
            rows={3}
            className="w-full px-4 py-3 rounded-xl border-2 border-orange-200
                      bg-white text-franol-text placeholder-franol-muted
                      focus:border-orange-400 focus:outline-none transition-colors
                      resize-none text-lg"
            autoFocus
          />

          {/* Max question count hint */}
          <p className="mt-2 text-xs text-franol-muted">
            {locale === "fr"
              ? "Maximum 40 questions. Ex\u00a0: « 40 mots sur la musique »"
              : "M\u00e1ximo 40 preguntas. Ej: « 40 palabras sobre m\u00fasica »"}
          </p>

          {/* Example prompts */}
          <div className="mt-3">
            <p className="text-xs text-franol-muted mb-2">
              {t("practice.discovery.examples")}:
            </p>
            <div className="flex flex-wrap gap-2">
              {examplePrompts.map((example, index) => (
                <button
                  key={index}
                  onClick={() => setCustomPrompt(example)}
                  className="text-xs px-3 py-1.5 rounded-full bg-white border border-orange-200
                            text-franol-muted hover:text-orange-600 hover:border-orange-400
                            transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Direction */}
        <div
          className="bg-white rounded-2xl p-6 border border-franol-warm animate-slide-up"
          style={{ animationDelay: "0.1s" }}
        >
          <label className="block text-sm font-semibold text-franol-text mb-4">
            {t("practice.setup.direction")}
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setDirection("fr-to-es")}
              className={`flex-1 px-5 py-3 rounded-xl font-medium transition-all duration-200
                         ${
                           direction === "fr-to-es"
                             ? "bg-franol-accent-blue text-white shadow-md"
                             : "bg-franol-sand text-franol-text hover:bg-franol-warm"
                         }`}
            >
              {t("practice.setup.frToEs")}
            </button>
            <button
              onClick={() => setDirection("es-to-fr")}
              className={`flex-1 px-5 py-3 rounded-xl font-medium transition-all duration-200
                         ${
                           direction === "es-to-fr"
                             ? "bg-franol-accent-blue text-white shadow-md"
                             : "bg-franol-sand text-franol-text hover:bg-franol-warm"
                         }`}
            >
              {t("practice.setup.esToFr")}
            </button>
          </div>
        </div>

        {/* Start Button */}
        <button
          onClick={handleStart}
          disabled={isGenerating || !customPrompt.trim()}
          className="w-full flex items-center justify-center gap-3 px-6 py-4
                    bg-gradient-to-r from-orange-500 to-amber-500 text-white
                    font-semibold rounded-2xl hover:from-orange-600 hover:to-amber-600
                    active:scale-[0.98] transition-all duration-200
                    shadow-lg hover:shadow-xl animate-slide-up
                    disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ animationDelay: "0.2s" }}
        >
          {isGenerating ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              {t("practice.discovery.generating")}
            </>
          ) : (
            <>
              <Sparkles size={20} />
              {t("practice.discovery.start")}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
