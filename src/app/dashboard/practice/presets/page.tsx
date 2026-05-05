"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/contexts/LocaleContext";
import type { QuizPreset } from "@/types";
import type { QuizConfig } from "@/lib/quiz";
import { EditQuizPresetCard } from "@/components/practice/EditQuizPresetCard";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { AlertPopup } from "@/components/ui/AlertPopup";
import { ArrowLeft, Loader2, Bookmark } from "lucide-react";

export default function PresetsPage() {
  const { t, locale } = useLocale();
  const router = useRouter();

  const [presets, setPresets] = useState<QuizPreset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<QuizPreset | null>(null);
  const [alertShow, setAlertShow] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const fetchPresets = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/quiz-presets?locale=${locale || "fr"}`);
      if (response.ok) {
        const data = await response.json();
        setPresets(data.presets || []);
      }
    } catch (error) {
      console.error("Error fetching presets:", error);
    } finally {
      setIsLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    fetchPresets();
  }, [fetchPresets]);

  const handleLaunch = (preset: QuizPreset) => {
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

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const response = await fetch(`/api/quiz-presets?id=${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setPresets((prev) => prev.filter((p) => p.id !== deleteTarget.id));
        setAlertMessage(t("practice.presets.deleted"));
        setAlertShow(true);
      }
    } catch (error) {
      console.error("Error deleting preset:", error);
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleUpdate = async (preset: QuizPreset, newName: string) => {
    try {
      const response = await fetch("/api/quiz-presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...preset,
          name: newName,
          question_count: preset.question_count,
          verb_group: preset.verb_group,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        setPresets((prev) =>
          prev.map((p) => (p.id === preset.id ? { ...p, name: newName } : p)),
        );
      }
    } catch (error) {
      console.error("Error updating preset:", error);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto">
      {/* Alert popup */}
      <AlertPopup
        show={alertShow}
        variant="success"
        message={alertMessage}
        duration={2500}
        onClose={() => setAlertShow(false)}
      />

      {/* Delete confirmation */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title={t("practice.presets.delete")}
        message={t("practice.presets.deleteConfirm")}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        variant="danger"
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />

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
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-franol-text">
          {t("practice.presets.title")}
        </h1>
      </header>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-franol-accent-blue" />
        </div>
      ) : presets.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 border border-franol-warm text-center animate-fade-in">
          <Bookmark className="w-12 h-12 text-franol-warm mx-auto mb-4" />
          <p className="text-franol-muted">
            {t("practice.presets.empty")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
          {presets.map((preset) => (
            <EditQuizPresetCard
              key={preset.id}
              preset={preset}
              onLaunch={handleLaunch}
              onDelete={setDeleteTarget}
              onUpdate={handleUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
