"use client";

import { useLocale } from "@/contexts/LocaleContext";
import { AliasInput } from "@/components/forms/AliasInput";
import type { Category } from "@/types";
import { getLangValue } from "@/lib/lang";
import { Plus } from "lucide-react";
import type { LangCode } from "@/lib/lang";

interface ExpressionFormProps {
  form: {
    expression_fr: string;
    expression_es: string;
    aliases_fr: string[];
    aliases_es: string[];
    context: string;
    notes: string;
  };
  categories: Category[];
  sourceLang: LangCode;
  isLoading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onFieldChange: (field: string, value: string | string[]) => void;
  onOpenCategoryModal: () => void;
  beforeSubmit?: React.ReactNode;
}

export function ExpressionForm({
  form,
  categories,
  sourceLang,
  isLoading,
  onSubmit,
  onFieldChange,
  onOpenCategoryModal,
  beforeSubmit,
}: ExpressionFormProps) {
  const { t } = useLocale();

  return (
    <form onSubmit={onSubmit} className="space-y-4 animate-fade-in">
      <div className="bg-white rounded-2xl p-6 border border-franol-warm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-franol-text mb-2">
              {t("add.expressionFr")} *
            </label>
            <input
              type="text"
              value={form.expression_fr}
              onChange={(e) => onFieldChange("expression_fr", e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border-2 border-franol-warm
                         bg-white text-franol-text placeholder-franol-muted
                         focus:border-franol-accent-blue focus:outline-none transition-colors"
              placeholder={t("add.expressionFrPlaceholder")}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-franol-text mb-2">
              {t("add.expressionEs")} *
            </label>
            <input
              type="text"
              value={form.expression_es}
              onChange={(e) => onFieldChange("expression_es", e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border-2 border-franol-warm
                         bg-white text-franol-text placeholder-franol-muted
                         focus:border-franol-accent-blue focus:outline-none transition-colors"
              placeholder={t("add.expressionEsPlaceholder")}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-franol-text mb-2">
            {t("add.aliases")}
          </label>
          {sourceLang === "fr" ? (
            <AliasInput
              aliases={form.aliases_fr}
              onAdd={(alias) => onFieldChange("aliases_fr", [...form.aliases_fr, alias])}
              onRemove={(index) =>
                onFieldChange(
                  "aliases_fr",
                  form.aliases_fr.filter((_, i) => i !== index)
                )
              }
              placeholder={t("add.aliasPlaceholderExpr")}
            />
          ) : (
            <AliasInput
              aliases={form.aliases_es}
              onAdd={(alias) => onFieldChange("aliases_es", [...form.aliases_es, alias])}
              onRemove={(index) =>
                onFieldChange(
                  "aliases_es",
                  form.aliases_es.filter((_, i) => i !== index)
                )
              }
              placeholder={t("add.aliasPlaceholderExpr")}
            />
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-franol-text mb-2">
            {t("add.context")}
          </label>
          <div className="flex gap-2">
            <select
              value={form.context}
              onChange={(e) => onFieldChange("context", e.target.value)}
              className="flex-1 px-4 py-3 rounded-xl border-2 border-franol-warm
                         bg-white text-franol-text
                         focus:border-franol-accent-blue focus:outline-none transition-colors"
            >
              <option value="">{t("add.selectContext")}</option>
              {categories
                .filter((c) => c.type === "expression")
                .map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {getLangValue(cat, "name", sourceLang)}
                  </option>
                ))}
            </select>
            <button
              type="button"
              onClick={onOpenCategoryModal}
              className="px-3 py-3 rounded-xl bg-franol-accent-blue text-white
                         hover:bg-blue-700 transition-colors flex items-center justify-center"
              title={t("add.createCategory")}
            >
              <Plus size={20} />
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-franol-text mb-2">
            {t("add.notes")}
          </label>
          <textarea
            value={form.notes}
            onChange={(e) => onFieldChange("notes", e.target.value)}
            rows={3}
            className="w-full px-4 py-3 rounded-xl border-2 border-franol-warm
                       bg-white text-franol-text placeholder-franol-muted
                       focus:border-franol-accent-blue focus:outline-none transition-colors resize-none"
            placeholder={t("add.notesPlaceholder")}
          />
        </div>
      </div>

      {beforeSubmit}

      <button
        type="submit"
        disabled={isLoading || !form.expression_fr || !form.expression_es}
        className="w-full py-3 px-4 rounded-xl font-medium text-white
                   bg-gradient-to-r from-purple-500 to-purple-600
                   hover:from-purple-600 hover:to-purple-700
                   disabled:opacity-50 disabled:cursor-not-allowed
                   transition-all flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
        ) : (
          <>
            <Plus size={20} />
            {t("add.addExpression")}
          </>
        )}
      </button>
    </form>
  );
}
