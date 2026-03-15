"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "@/contexts/LocaleContext";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();
import type { QuizMode, QuizFormat, QuizDirection, QuizConfig } from "@/lib/quiz";
import type { Category } from "@/types";
import { getLangValue } from "@/lib/lang";
import { ArrowLeft, Play, Loader2 } from "lucide-react";
import { CustomDropdown } from "@/components/ui/CustomDropdown";

function SetupContent() {
  const { t, locale, sourceLang } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  const mode = (searchParams.get("mode") || "classic") as QuizMode;

  const [questionCount, setQuestionCount] = useState(10);
  const [isCustomCount, setIsCustomCount] = useState(false);
  const [format, setFormat] = useState<QuizFormat>("qcm");
  const [category, setCategory] = useState("all");
  const [direction, setDirection] = useState<QuizDirection>(
    locale === "fr" ? "fr-to-es" : "es-to-fr"
  );
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoading(true);
      try {
        const type = mode === "expressions" ? "expression" : "vocabulary";
        const { data } = await supabase
          .from("categories")
          .select("*")
          .eq("type", type);
        setCategories(data || []);
      } catch (error) {
        console.error("Error fetching categories:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (mode !== "conjugation") {
      fetchCategories();
    } else {
      setIsLoading(false);
    }
  }, [mode]);

  const handleStart = () => {
    const config: QuizConfig = {
      mode,
      format,
      questionCount,
      category: category !== "all" ? category : undefined,
      direction,
    };

    // Nettoyer tout quiz précédent avant de lancer le nouveau
    localStorage.removeItem("savedQuiz");
    sessionStorage.removeItem("cachedQuizQuestions");

    // Store config in sessionStorage
    sessionStorage.setItem("quizConfig", JSON.stringify(config));
    router.push("/dashboard/practice/quiz");
  };

  const questionCountOptions = [10, 20, 30];

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto">
      {/* Header with back button */}
      <header className="mb-8 animate-fade-in">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-franol-muted hover:text-franol-text
                     transition-colors mb-4"
        >
          <ArrowLeft size={20} />
          {t("common.back")}
        </button>
        <h1 className="text-3xl md:text-4xl font-display font-bold text-franol-text">
          {t("practice.setup.title")}
        </h1>
        <p className="mt-2 text-franol-muted">{t("practice.setup.subtitle")}</p>
      </header>

      {/* Configuration Form */}
      <div className="space-y-6">
        {/* Question Count */}
        <div className="bg-white rounded-2xl p-6 border border-franol-warm animate-slide-up">
          <label className="block text-sm font-semibold text-franol-text mb-4">
            {t("practice.setup.questionCount")}
          </label>
          <div className="flex flex-wrap gap-3">
            {questionCountOptions.map((count) => (
              <button
                key={count}
                onClick={() => {
                  setQuestionCount(count);
                  setIsCustomCount(false);
                }}
                className={`px-5 py-2.5 rounded-xl font-medium transition-all duration-200
                           ${
                             !isCustomCount && questionCount === count
                               ? "bg-franol-accent-blue text-white shadow-md"
                               : "bg-franol-sand text-franol-text hover:bg-franol-warm"
                           }`}
              >
                {count}
              </button>
            ))}
            <button
              onClick={() => setIsCustomCount(true)}
              className={`px-5 py-2.5 rounded-xl font-medium transition-all duration-200
                         ${
                           isCustomCount
                             ? "bg-franol-accent-blue text-white shadow-md"
                             : "bg-franol-sand text-franol-text hover:bg-franol-warm"
                         }`}
            >
              {t("practice.setup.custom")}
            </button>
          </div>
          {isCustomCount && (
            <div className="mt-4 animate-fade-in">
              <input
                type="number"
                min={5}
                max={50}
                value={questionCount}
                onChange={(e) =>
                  setQuestionCount(
                    Math.min(50, Math.max(5, parseInt(e.target.value) || 5))
                  )
                }
                className="w-32 px-4 py-2.5 rounded-xl border-2 border-franol-warm
                          bg-white text-franol-text focus:border-franol-accent-blue
                          focus:outline-none transition-colors text-center font-medium"
              />
            </div>
          )}
        </div>

        {/* Format */}
        <div
          className="bg-white rounded-2xl p-6 border border-franol-warm animate-slide-up"
          style={{ animationDelay: "0.1s" }}
        >
          <label className="block text-sm font-semibold text-franol-text mb-4">
            {t("practice.setup.format")}
          </label>
          <div className="flex flex-wrap gap-3">
            {(["qcm", "translation", "mixed"] as QuizFormat[]).map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={`px-5 py-2.5 rounded-xl font-medium transition-all duration-200
                           ${
                             format === f
                               ? "bg-franol-accent-blue text-white shadow-md"
                               : "bg-franol-sand text-franol-text hover:bg-franol-warm"
                           }`}
              >
                {t(`practice.setup.format${f.charAt(0).toUpperCase() + f.slice(1)}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Category (not for conjugation) */}
        {mode !== "conjugation" && (
          <div
            className="bg-white rounded-2xl p-6 border border-franol-warm animate-slide-up"
            style={{ animationDelay: "0.2s" }}
          >
            <label className="block text-sm font-semibold text-franol-text mb-4">
              {t("practice.setup.category")}
            </label>
            {isLoading ? (
              <div className="flex items-center gap-2 text-franol-muted">
                <Loader2 className="w-4 h-4 animate-spin" />
                {t("common.loading")}
              </div>
            ) : (
              <CustomDropdown
                value={category}
                onChange={setCategory}
                options={[
                  { value: "all", label: t("practice.setup.allCategories") },
                  ...categories.map((cat) => ({
                    value: cat.id,
                    label: getLangValue(cat, "name", sourceLang),
                    color: cat.color,
                  })),
                ]}
                placeholder={t("practice.setup.allCategories")}
              />
            )}
          </div>
        )}

        {/* Direction */}
        <div
          className="bg-white rounded-2xl p-6 border border-franol-warm animate-slide-up"
          style={{ animationDelay: "0.3s" }}
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
              {locale === "fr"
                ? t("practice.setup.frToEs")
                : t("practice.setup.frToEs")}
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
              {locale === "fr"
                ? t("practice.setup.esToFr")
                : t("practice.setup.esToFr")}
            </button>
          </div>
        </div>

        {/* Start Button */}
        <button
          onClick={handleStart}
          className="w-full flex items-center justify-center gap-3 px-6 py-4
                    bg-franol-accent-blue text-white font-semibold rounded-2xl
                    hover:bg-blue-700 active:scale-[0.98] transition-all duration-200
                    shadow-lg hover:shadow-xl animate-slide-up"
          style={{ animationDelay: "0.4s" }}
        >
          <Play size={20} />
          {t("practice.setup.start")}
        </button>
      </div>
    </div>
  );
}

export default function SetupPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 md:p-8 max-w-2xl mx-auto flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-franol-accent-blue" />
        </div>
      }
    >
      <SetupContent />
    </Suspense>
  );
}
