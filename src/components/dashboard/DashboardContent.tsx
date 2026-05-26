"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLocale } from "@/contexts/LocaleContext";
import type { QuizPreset } from "@/types";
import type { QuizConfig } from "@/lib/quiz";
import {
  PlusCircle,
  Dumbbell,
  BookOpen,
  TrendingUp,
  Target,
  Clock,
  LogOut,
  Loader2,
  Play,
  Bookmark,
  ChevronRight,
  BookOpen as VocabIcon,
  MessageSquare,
  Shuffle,
  PenTool,
  Compass,
} from "lucide-react";
import { Changelog } from "@/components/dashboard/Changelog";
import { cn } from "@/lib/utils";

const MODE_ICONS: Record<string, typeof Shuffle> = {
  classic: Shuffle,
  vocabulary: VocabIcon,
  expressions: MessageSquare,
  conjugation: PenTool,
  discovery: Compass,
};

export function DashboardContent() {
  const { t, clearLocale, locale } = useLocale();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [presets, setPresets] = useState<QuizPreset[]>([]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    localStorage.removeItem("savedQuiz");
    await fetch("/api/auth/logout", { method: "POST" });
    clearLocale();
    router.push("/");
  };

  const fetchPresets = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/quiz-presets?locale=${locale || "fr"}&limit=3`,
      );
      if (response.ok) {
        const data = await response.json();
        setPresets((data.presets || []).slice(0, 3));
      }
    } catch (error) {
      console.error("Error fetching presets:", error);
    }
  }, [locale]);

  useEffect(() => {
    fetchPresets();
  }, [fetchPresets]);

  const handleLaunchPreset = (preset: QuizPreset) => {
    const config: QuizConfig = {
      mode: preset.mode as QuizConfig["mode"],
      format: preset.format as QuizConfig["format"],
      questionCount: preset.question_count,
      category: preset.category || undefined,
      direction: preset.direction as QuizConfig["direction"],
      prompt: preset.prompt || undefined,
      isAI: preset.mode === "discovery" ? true : undefined,
      locale: preset.locale as "fr" | "es",
      tense: preset.tense || undefined,
      pronoun: preset.pronoun || undefined,
      verbGroup: preset.verb_group || undefined,
    };

    localStorage.removeItem("savedQuiz");
    sessionStorage.removeItem("cachedQuizQuestions");
    sessionStorage.setItem("quizConfig", JSON.stringify(config));
    router.push("/dashboard/practice/quiz");
  };

  const quickActions = [
    {
        titleKey: "addVocabulary",
      descKey: "addVocabularyDesc",
      href: "/dashboard/add",
      icon: PlusCircle,
      color: "bg-emerald-500",
    },
    {
      titleKey: "practice",
      descKey: "practiceDesc",
      href: "/dashboard/practice",
      icon: Dumbbell,
      color: "bg-blue-500",
    },
    {
      titleKey: "viewLessons",
      descKey: "viewLessonsDesc",
      href: "/dashboard/lessons",
      icon: BookOpen,
      color: "bg-purple-500",
      disabled: true,
    },
  ];

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <header className="mb-8 animate-fade-in">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-franol-text">
          {t("dashboard.welcome")}
        </h1>
        <p className="mt-2 text-franol-muted">{t("dashboard.subtitle")}</p>
      </header>

      {/* Stats rapides */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-5 border border-franol-warm animate-slide-up">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-franol-sand">
              <Target className="w-5 h-5 text-franol-accent-blue" />
            </div>
            <div>
              <p className="text-2xl font-bold text-franol-text">0</p>
              <p className="text-sm text-franol-muted">
                {t("dashboard.wordsLearned")}
              </p>
            </div>
          </div>
        </div>

        <div
          className="bg-white rounded-2xl p-5 border border-franol-warm animate-slide-up"
          style={{ animationDelay: "0.1s" }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-franol-sand">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-franol-text">0%</p>
              <p className="text-sm text-franol-muted">
                {t("dashboard.successRate")}
              </p>
            </div>
          </div>
        </div>

        <div
          className="bg-white rounded-2xl p-5 border border-franol-warm animate-slide-up"
          style={{ animationDelay: "0.2s" }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-franol-sand">
              <Clock className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-franol-text">0</p>
              <p className="text-sm text-franol-muted">
                {t("dashboard.quizCompleted")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions rapides */}
      <h2 className="text-xl font-display font-semibold text-franol-text mb-4">
        {t("dashboard.quickActions")}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {quickActions.map((action, index) => {
          const Icon = action.icon;

          if (action.disabled) {
            return (
              <div
                key={action.href}
                className="bg-white rounded-2xl p-6 border border-franol-warm
                           opacity-40 cursor-not-allowed animate-slide-up"
                style={{ animationDelay: `${0.3 + index * 0.1}s` }}
              >
                <div className={cn("inline-flex p-3 rounded-xl mb-4", action.color)}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-franol-text mb-1">
                  {t(`dashboard.${action.titleKey}`)}
                </h3>
                <p className="text-sm text-franol-muted">
                  {t(`dashboard.${action.descKey}`)}
                </p>
              </div>
            );
          }

          return (
            <Link
              key={action.href}
              href={action.href}
              className="group bg-white rounded-2xl p-6 border border-franol-warm
                         hover:border-franol-accent-blue hover:shadow-lg
                         transition-all duration-300 animate-slide-up"
              style={{ animationDelay: `${0.3 + index * 0.1}s` }}
            >
              <div
                className={cn(
                  "inline-flex p-3 rounded-xl mb-4 group-hover:scale-110 transition-transform",
                  action.color,
                )}
              >
                <Icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-franol-text mb-1">
                {t(`dashboard.${action.titleKey}`)}
              </h3>
              <p className="text-sm text-franol-muted">
                {t(`dashboard.${action.descKey}`)}
              </p>
            </Link>
          );
        })}
      </div>

      {/* Démarrer un quiz — Saved Presets */}
      {presets.length > 0 && (
        <div className="mt-8 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-display font-semibold text-franol-text">
              {t("dashboard.startQuiz")}
            </h2>
            <Link
              href="/dashboard/practice/presets"
              className="flex items-center gap-1 text-sm text-franol-accent-blue
                         hover:underline font-medium"
            >
              {t("practice.presets.viewAll")}
              <ChevronRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {presets.map((preset) => {
              const Icon = MODE_ICONS[preset.mode] || Shuffle;
              const modeLabel = t(`practice.modes.${preset.mode}`);
              const dirLabel =
                preset.direction === "fr-to-es" ? "FR → ES" : "ES → FR";

              return (
                <button
                  key={preset.id}
                  onClick={() => handleLaunchPreset(preset)}
                  className="group text-left bg-white rounded-2xl p-5 border border-franol-warm
                             hover:border-franol-accent-blue hover:shadow-lg
                             transition-all duration-300 active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-franol-sand rounded-xl group-hover:scale-110 transition-transform">
                      <Icon className="w-4 h-4 text-franol-muted" />
                    </div>
                    <span className="text-sm font-semibold text-franol-text truncate flex-1">
                      {preset.name}
                    </span>
                    <Play
                      size={14}
                      className="text-franol-accent-blue opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="px-2 py-0.5 bg-franol-sand rounded text-[11px] text-franol-muted font-medium">
                      {modeLabel}
                    </span>
                    <span className="px-2 py-0.5 bg-franol-sand rounded text-[11px] text-franol-muted font-medium">
                      {dirLabel}
                    </span>
                    <span className="px-2 py-0.5 bg-franol-sand rounded text-[11px] text-franol-muted font-medium">
                      {preset.question_count}Q
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Changelog */}
      <div className="mt-8">
        <Changelog />
      </div>

      {/* Bouton déconnexion - Mobile uniquement */}
      <div
        className="mt-8 md:hidden animate-fade-in"
        style={{ animationDelay: "0.6s" }}
      >
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className={cn(
            "w-full flex items-center justify-center gap-3 px-6 py-4",
            "bg-white border border-franol-warm rounded-2xl transition-all",
            isLoggingOut
              ? "opacity-70 cursor-not-allowed text-franol-muted"
              : "text-red-600 hover:bg-red-50 hover:border-red-200",
          )}
        >
          {isLoggingOut ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <LogOut size={20} />
          )}
          <span className="font-medium">
            {isLoggingOut ? t("auth.loggingOut") : t("auth.logout")}
          </span>
        </button>
      </div>
    </div>
  );
}
