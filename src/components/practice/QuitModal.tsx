"use client";

import { X, Check } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";

interface QuitModalProps {
  show: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function QuitModal({ show, onClose, onConfirm }: QuitModalProps) {
  const { t } = useLocale();

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-slide-up">
        <h3 className="text-lg font-semibold text-franol-text mb-2">
          {t("practice.quiz.quit")}?
        </h3>
        <p className="text-franol-muted mb-6">
          {t("practice.quiz.quitConfirm")}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg border border-franol-warm
                   text-franol-text hover:bg-franol-sand transition-colors"
          >
            {t("practice.quiz.continue")}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white
                   hover:bg-red-600 transition-colors"
          >
            {t("practice.quiz.quit")}
          </button>
        </div>
      </div>
    </div>
  );
}
