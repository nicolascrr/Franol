"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "@/contexts/LocaleContext";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();
import type {
  QuizMode,
  QuizFormat,
  QuizDirection,
  QuizConfig,
} from "@/lib/quiz";
import { calculateMaxQuestions } from "@/lib/quiz";
import type { Category } from "@/types";
import { getLangValue, fromQuizDirection, type LangCode } from "@/lib/lang";
import { getTensesForLocale } from "@/lib/tenses";
import {
  VERB_GROUPS_FR,
  VERB_GROUPS_ES,
  PRONOUNS_FR,
  PRONOUNS_ES,
} from "@/lib/constants";
import { ArrowLeft, Play, Loader2 } from "lucide-react";
import { AlertPopup } from "@/components/ui/AlertPopup";
import type { AlertVariant } from "@/components/ui/AlertPopup";
import { CustomDropdown } from "@/components/ui/CustomDropdown";
import { cn } from "@/lib/utils";

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
    locale === "fr" ? "fr-to-es" : "es-to-fr",
  );
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // US-Q2, Q3, Q4: Conjugation-specific state
  const [selectedTense, setSelectedTense] = useState("all");
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [selectedPronoun, setSelectedPronoun] = useState("all");

  // US-Q9: Count validation state
  const [isLaunching, setIsLaunching] = useState(false);

  // US-Q9: Alert popup state
  const [alertShow, setAlertShow] = useState(false);
  const [alertVariant, setAlertVariant] = useState<AlertVariant>("info");
  const [alertMessage, setAlertMessage] = useState("");

  const showAlert = (variant: AlertVariant, message: string) => {
    setAlertVariant(variant);
    setAlertMessage(message);
    setAlertShow(true);
  };

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

  // The learned language is the opposite of the portal UI locale
  // FR portal → user learns Spanish → tenses/groups in Spanish
  // ES portal → user learns French → tenses/groups in French
  const learnedLang: LangCode = locale === "fr" ? "es" : "fr";

  // US-Q2: Tense options in the learned language
  const tenseOptions = useMemo(() => {
    const tenses = getTensesForLocale(learnedLang);
    return [
      { value: "all", label: t("practice.setup.allTenses") },
      ...tenses.map((te) => ({ value: te.key, label: te.label })),
    ];
  }, [learnedLang, t]);

  // US-Q3: Verb group options in the learned language
  const verbGroupOptions = useMemo(() => {
    const groups = learnedLang === "fr" ? VERB_GROUPS_FR : VERB_GROUPS_ES;
    return [
      { value: "all", label: t("practice.setup.allGroups") },
      ...groups.map((g) => ({
        value: g.value,
        label: "label" in g ? g.label : t(g.labelKey),
      })),
    ];
  }, [learnedLang, t]);

  // US-Q4: Pronoun options
  const pronounOptions = useMemo(() => {
    const targetLang = locale === "fr" ? "es" : "fr";
    return targetLang === "fr" ? PRONOUNS_FR : PRONOUNS_ES;
  }, [locale]);

  const handleStart = async () => {
    setIsLaunching(true);
    setAlertShow(false);

    const config: QuizConfig = {
      mode,
      format,
      questionCount,
      category: category !== "all" ? category : undefined,
      direction,
      locale: (locale || "fr") as "fr" | "es",
      tense:
        mode === "conjugation" && selectedTense !== "all"
          ? selectedTense
          : undefined,
      verbGroup:
        mode === "conjugation" && selectedGroup !== "all"
          ? selectedGroup
          : undefined,
      pronoun:
        mode === "conjugation" && selectedPronoun !== "all"
          ? selectedPronoun
          : undefined,
    };

    // US-Q9: Validate question count against available content
    const validation = await calculateMaxQuestions(config);

    if (validation.maxQuestions === 0) {
      showAlert("warning", t("practice.setup.noContent"));
      setIsLaunching(false);
      return;
    }

    if (validation.adjusted) {
      config.questionCount = validation.maxQuestions;
      showAlert("info", t("practice.setup.adjustedCount")
        .replace("{requested}", String(questionCount))
        .replace("{available}", String(validation.maxQuestions)));
      // Pause to let user see the rotating timer alert
      await new Promise((r) => setTimeout(r, 5000));
    }

    // Nettoyer tout quiz précédent avant de lancer le nouveau
    localStorage.removeItem("savedQuiz");
    sessionStorage.removeItem("cachedQuizQuestions");

    // Store config in sessionStorage
    sessionStorage.setItem("quizConfig", JSON.stringify(config));
    router.push("/dashboard/practice/quiz");
  };

  const questionCountOptions = [10, 20, 30];

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-2xl mx-auto">
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
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-franol-text">
          {t("practice.setup.title")}
        </h1>
        <p className="mt-2 text-franol-muted">{t("practice.setup.subtitle")}</p>
      </header>

      {/* Configuration Form */}
      <div className="space-y-6">
        {/* Question Count */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-franol-warm animate-slide-up">
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
                className={cn(
                  "px-5 py-2.5 rounded-xl font-medium transition-all duration-200",
                  !isCustomCount && questionCount === count
                    ? "bg-franol-accent-blue text-white shadow-md"
                    : "bg-franol-sand text-franol-text hover:bg-franol-warm",
                )}
              >
                {count}
              </button>
            ))}
            <button
              onClick={() => setIsCustomCount(true)}
              className={cn(
                "px-5 py-2.5 rounded-xl font-medium transition-all duration-200",
                isCustomCount
                  ? "bg-franol-accent-blue text-white shadow-md"
                  : "bg-franol-sand text-franol-text hover:bg-franol-warm",
              )}
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
                    Math.min(50, Math.max(5, parseInt(e.target.value) || 5)),
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
          className="bg-white rounded-2xl p-4 sm:p-6 border border-franol-warm animate-slide-up"
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
                className={cn(
                  "px-5 py-2.5 rounded-xl font-medium transition-all duration-200",
                  format === f
                    ? "bg-franol-accent-blue text-white shadow-md"
                    : "bg-franol-sand text-franol-text hover:bg-franol-warm",
                )}
              >
                {t(
                  `practice.setup.format${f.charAt(0).toUpperCase() + f.slice(1)}`,
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Category (not for conjugation) */}
        {mode !== "conjugation" && (
          <div
            className="bg-white rounded-2xl p-4 sm:p-6 border border-franol-warm animate-slide-up"
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

        {/* ===== Conjugation-specific options (US-Q2, Q3, Q4) ===== */}
        {mode === "conjugation" && (
          <div
            className="bg-white rounded-2xl p-4 sm:p-6 border border-franol-warm animate-slide-up space-y-6"
            style={{ animationDelay: "0.2s" }}
          >
            <label className="block text-sm font-semibold text-franol-text">
              {t("practice.setup.conjugationOptions")}
            </label>

            {/* US-Q2: Tense Selection */}
            <div>
              <label className="block text-xs font-medium text-franol-muted mb-2">
                {t("practice.setup.tense")}
              </label>
              <CustomDropdown
                value={selectedTense}
                onChange={setSelectedTense}
                options={tenseOptions}
                placeholder={t("practice.setup.allTenses")}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-franol-muted mb-2">
                {t("practice.setup.verbGroup")}
              </label>
              <div className="flex flex-wrap gap-2 sm:gap-3">
                {verbGroupOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSelectedGroup(opt.value)}
                    className={cn(
                      "px-4 py-2 rounded-xl font-medium transition-all duration-200 min-h-[44px]",
                      "text-sm whitespace-nowrap",
                      selectedGroup === opt.value
                        ? "bg-franol-accent-blue text-white shadow-md"
                        : "bg-franol-sand text-franol-text hover:bg-franol-warm",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* US-Q4: Pronoun Selection */}
            <div>
              <label className="block text-xs font-medium text-franol-muted mb-2">
                {t("practice.setup.pronoun")}
              </label>
              <div className="flex flex-wrap gap-2 sm:gap-3">
                {/* "All pronouns" option */}
                <button
                  onClick={() => setSelectedPronoun("all")}
                  className={cn(
                    "px-4 py-2 rounded-xl font-medium transition-all duration-200 min-h-[44px]",
                    "text-sm whitespace-nowrap",
                    selectedPronoun === "all"
                      ? "bg-franol-accent-blue text-white shadow-md"
                      : "bg-franol-sand text-franol-text hover:bg-franol-warm",
                  )}
                >
                  {t("practice.setup.allPronouns")}
                </button>
                {pronounOptions.map((p) => (
                  <button
                    key={p}
                    onClick={() => setSelectedPronoun(p)}
                    className={cn(
                      "px-4 py-2 rounded-xl font-medium transition-all duration-200 min-h-[44px]",
                      "text-sm whitespace-nowrap",
                      selectedPronoun === p
                        ? "bg-franol-accent-blue text-white shadow-md"
                        : "bg-franol-sand text-franol-text hover:bg-franol-warm",
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Direction — hidden for conjugation (direction is hardcoded per portal) */}
        {mode !== "conjugation" && (
        <div
          className="bg-white rounded-2xl p-4 sm:p-6 border border-franol-warm animate-slide-up"
          style={{ animationDelay: "0.3s" }}
        >
          <label className="block text-sm font-semibold text-franol-text mb-4">
            {t("practice.setup.direction")}
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setDirection("fr-to-es")}
              className={cn(
                "flex-1 px-5 py-3 rounded-xl font-medium transition-all duration-200",
                direction === "fr-to-es"
                  ? "bg-franol-accent-blue text-white shadow-md"
                  : "bg-franol-sand text-franol-text hover:bg-franol-warm",
              )}
            >
              {t("practice.setup.frToEs")}
            </button>
            <button
              onClick={() => setDirection("es-to-fr")}
              className={cn(
                "flex-1 px-5 py-3 rounded-xl font-medium transition-all duration-200",
                direction === "es-to-fr"
                  ? "bg-franol-accent-blue text-white shadow-md"
                  : "bg-franol-sand text-franol-text hover:bg-franol-warm",
              )}
            >
              {t("practice.setup.esToFr")}
            </button>
          </div>
        </div>
        )}

        {/* Alert popup (US-Q9) — with rotating timer for adjusted count */}
        <AlertPopup
          show={alertShow}
          variant={alertVariant}
          message={alertMessage}
          onClose={() => setAlertShow(false)}
          showTimer={alertVariant === "info"}
          duration={5000}
        />

        {/* Start Button */}
        <button
          onClick={handleStart}
          disabled={isLaunching}
          className="w-full flex items-center justify-center gap-3 px-6 py-4
                    bg-franol-accent-blue text-white font-semibold rounded-2xl
                    hover:bg-blue-700 active:scale-[0.98] transition-all duration-200
                    shadow-lg hover:shadow-xl animate-slide-up
                    disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ animationDelay: "0.4s" }}
        >
          {isLaunching ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <Play size={20} />
          )}
          {isLaunching ? t("common.loading") : t("practice.setup.start")}
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
