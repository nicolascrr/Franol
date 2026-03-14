"use client";

import { useLocale } from "@/contexts/LocaleContext";
import { AlertTriangle } from "lucide-react";
import type { DuplicateMatch } from "@/lib/duplicates";

interface DuplicateWarningProps {
  duplicates: DuplicateMatch[];
  onCancel: () => void;
  onForceAdd: () => void;
}

export function DuplicateWarning({
  duplicates,
  onCancel,
  onForceAdd,
}: DuplicateWarningProps) {
  const { t } = useLocale();

  return (
    <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 animate-fade-in">
      <div className="flex items-start gap-3">
        <AlertTriangle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
        <div className="flex-1">
          <h4 className="font-medium text-amber-900 mb-2">
            {t("add.duplicateWarning")}
          </h4>
          <div className="space-y-2 mb-3">
            {duplicates.map((dup) => (
              <div
                key={dup.id}
                className="bg-white rounded-lg p-3 border border-amber-200"
              >
                <p className="font-medium text-franol-text">
                  {dup.word_fr || dup.expression_fr || dup.infinitive_fr}
                  {" → "}
                  {dup.word_es || dup.expression_es || dup.infinitive_es}
                </p>
                <p className="text-sm text-franol-muted mt-1">
                  {t("add.matchedIn")}: {dup.matchedField} ({dup.matchedValue})
                </p>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-lg text-sm font-medium
                         bg-white border border-amber-200 text-amber-900
                         hover:bg-amber-50 transition-colors"
            >
              {t("content.cancel")}
            </button>
            <button
              type="button"
              onClick={onForceAdd}
              className="px-4 py-2 rounded-lg text-sm font-medium
                         bg-amber-600 text-white
                         hover:bg-amber-700 transition-colors"
            >
              {t("add.addAnyway")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
