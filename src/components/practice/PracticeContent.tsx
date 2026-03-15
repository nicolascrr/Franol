"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/contexts/LocaleContext";
import {
  Shuffle,
  MessageSquare,
  PenTool,
  Lock,
  Compass,
  BookOpen,
  Play,
  X,
  Settings,
} from "lucide-react";

type QuizMode =
  | "classic"
  | "vocabulary"
  | "expressions"
  | "conjugation"
  | "discovery"
  | "custom";

interface ModeCard {
  mode: QuizMode;
  titleKey: string;
  descKey: string;
  icon: typeof Shuffle;
  color: string;
  bgColor: string;
  disabled?: boolean;
}

interface SavedQuiz {
  config: {
    mode: string;
    prompt?: string;
    originalPrompt?: string;
    questionCount?: number;
  };
  questions: unknown[];
  currentIndex: number;
  answers: unknown[];
  locale?: string;
}

export function PracticeContent() {
  const { t, locale } = useLocale();
  const router = useRouter();

  const [savedQuiz, setSavedQuiz] = useState<SavedQuiz | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("savedQuiz");
      if (saved) {
        const data = JSON.parse(saved) as SavedQuiz;
        // Vérifier que le quiz est valide et correspond au portail actuel
        if (data.config && data.questions?.length > 0 && data.locale === (locale || "fr")) {
          setSavedQuiz(data);
        } else if (data.locale && data.locale !== (locale || "fr")) {
          // Portail différent → supprimer
          localStorage.removeItem("savedQuiz");
        } else if (!data.config || !data.questions?.length) {
          localStorage.removeItem("savedQuiz");
        }
      }
    } catch {
      localStorage.removeItem("savedQuiz");
    }
  }, [locale]);

  const handleResume = () => {
    if (!savedQuiz) return;
    // Restaurer le config en sessionStorage et naviguer vers le quiz
    sessionStorage.setItem("quizConfig", JSON.stringify(savedQuiz.config));
    sessionStorage.setItem(
      "cachedQuizQuestions",
      JSON.stringify(savedQuiz.questions),
    );
    router.push("/dashboard/practice/quiz");
  };

  const handleDismissSaved = () => {
    localStorage.removeItem("savedQuiz");
    setSavedQuiz(null);
  };

  const modes: ModeCard[] = [
    {
      mode: "classic",
      titleKey: "classic",
      descKey: "classicDesc",
      icon: Shuffle,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      mode: "vocabulary",
      titleKey: "vocabulary",
      descKey: "vocabularyDesc",
      icon: BookOpen,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
    },
    {
      mode: "expressions",
      titleKey: "expressions",
      descKey: "expressionsDesc",
      icon: MessageSquare,
      color: "text-emerald-600",
      bgColor: "bg-emerald-100",
    },
    {
      mode: "conjugation",
      titleKey: "conjugation",
      descKey: "conjugationDesc",
      icon: PenTool,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      mode: "discovery",
      titleKey: "discovery",
      descKey: "discoveryDesc",
      icon: Compass,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    {
      mode: "custom",
      titleKey: "custom",
      descKey: "customDesc",
      icon: Settings,
      color: "text-amber-600",
      bgColor: "bg-amber-100",
      disabled: true,
    },
  ];

  const handleModeSelect = (mode: QuizMode) => {
    if (mode === "custom") return;
    if (mode === "discovery") {
      router.push("/dashboard/practice/discovery");
      return;
    }
    router.push(`/dashboard/practice/setup?mode=${mode}`);
  };


  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <header className="mb-8 animate-fade-in">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-franol-text">
          {t("practice.title")}
        </h1>
        <p className="mt-2 text-franol-muted">{t("practice.subtitle")}</p>
      </header>

      {/* Resume Banner */}
      {savedQuiz && (
        <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-5 border border-blue-200 animate-fade-in">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-franol-text">
                {t("practice.resume.title")}
              </p>
              <p className="text-xs text-franol-muted mt-0.5 truncate">
                {t(`practice.modes.${savedQuiz.config.mode}`)}
                {savedQuiz.config.prompt
                  ? ` — ${savedQuiz.config.originalPrompt || savedQuiz.config.prompt}`
                  : ""}
                {" · "}
                {t("practice.quiz.question")} {(savedQuiz.currentIndex || 0) + 1}{" "}
                {t("practice.quiz.of")} {savedQuiz.questions.length}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleDismissSaved}
                className="p-2 rounded-lg text-franol-muted hover:text-red-500
                          hover:bg-red-50 transition-colors"
                title={t("practice.resume.dismiss")}
              >
                <X size={16} />
              </button>
              <button
                onClick={handleResume}
                className="flex items-center gap-2 px-4 py-2 bg-franol-accent-blue
                          text-white text-sm font-medium rounded-xl
                          hover:bg-blue-700 transition-colors active:scale-[0.98]"
              >
                <Play size={14} />
                {t("practice.resume.button")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mode Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {modes.map((card, index) => {
          const Icon = card.icon;
          const isDisabled = card.disabled;

          return (
            <button
              key={card.mode}
              onClick={() => handleModeSelect(card.mode)}
              disabled={isDisabled}
              className={`group relative bg-white rounded-2xl p-6 border border-franol-warm
                         text-left transition-all duration-300 animate-slide-up
                         ${
                           isDisabled
                             ? "opacity-60 cursor-not-allowed"
                             : "hover:border-franol-accent-blue hover:shadow-lg hover:-translate-y-1 active:scale-[0.98]"
                         }`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Disabled overlay badge */}
              {isDisabled && (
                <div
                  className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1
                               bg-franol-sand rounded-full text-xs font-medium text-franol-muted"
                >
                  <Lock size={12} />
                  {t("practice.modes.comingSoon")}
                </div>
              )}

              {/* Icon */}
              <div
                className={`inline-flex p-3 rounded-xl ${card.bgColor} mb-4
                           transition-transform duration-300
                           ${!isDisabled && "group-hover:scale-110"}`}
              >
                <Icon className={`w-6 h-6 ${card.color}`} />
              </div>

              {/* Text */}
              <h3 className="text-lg font-semibold text-franol-text mb-1">
                {t(`practice.modes.${card.titleKey}`)}
              </h3>
              <p className="text-sm text-franol-muted">
                {t(`practice.modes.${card.descKey}`)}
              </p>

              {/* Hover arrow indicator */}
              {!isDisabled && (
                <div
                  className="absolute bottom-6 right-6 opacity-0 transform translate-x-2
                               group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300"
                >
                  <svg
                    className="w-5 h-5 text-franol-accent-blue"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
