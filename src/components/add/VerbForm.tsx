"use client";

import { useLocale } from "@/contexts/LocaleContext";
import { AliasInput } from "@/components/forms/AliasInput";
import type { Category } from "@/types";
import { getLangValue } from "@/lib/lang";
import { Plus } from "lucide-react";
import type { LangCode } from "@/lib/lang";

interface VerbFormProps {
  form: {
    infinitive_fr: string;
    infinitive_es: string;
    aliases_fr: string[];
    aliases_es: string[];
    group_fr: string;
    group_es: string;
    is_irregular: boolean;
    is_reflexive_fr: boolean;
    is_reflexive_es: boolean;
    category: string;
    notes: string;
  };
  categories: Category[];
  sourceLang: LangCode;
  isLoading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onFieldChange: (field: string, value: string | string[] | boolean) => void;
  onOpenCategoryModal: () => void;
  beforeSubmit?: React.ReactNode;
}

export function VerbForm({
  form,
  categories,
  sourceLang,
  isLoading,
  onSubmit,
  onFieldChange,
  onOpenCategoryModal,
  beforeSubmit,
}: VerbFormProps) {
  const { t } = useLocale();

  return (
    <form onSubmit={onSubmit} className="space-y-4 animate-fade-in">
      <div className="bg-white rounded-2xl p-6 border border-franol-warm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-franol-text mb-2">
              {t("add.infinitiveFr")} *
            </label>
            <input
              type="text"
              value={form.infinitive_fr}
              onChange={(e) => onFieldChange("infinitive_fr", e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border-2 border-franol-warm
                         bg-white text-franol-text placeholder-franol-muted
                         focus:border-franol-accent-blue focus:outline-none transition-colors"
              placeholder={t("add.infinitiveFrPlaceholder")}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-franol-text mb-2">
              {t("add.infinitiveEs")} *
            </label>
            <input
              type="text"
              value={form.infinitive_es}
              onChange={(e) => onFieldChange("infinitive_es", e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border-2 border-franol-warm
                         bg-white text-franol-text placeholder-franol-muted
                         focus:border-franol-accent-blue focus:outline-none transition-colors"
              placeholder={t("add.infinitiveEsPlaceholder")}
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
              placeholder={t("add.aliasPlaceholderVerb")}
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
              placeholder={t("add.aliasPlaceholderVerb")}
            />
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-franol-text mb-2">
              {t("add.groupFr")}
            </label>
            <select
              value={form.group_fr}
              onChange={(e) => onFieldChange("group_fr", e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-franol-warm
                          bg-white text-franol-text
                          focus:border-franol-accent-blue focus:outline-none transition-colors"
            >
              <option value="">{t("add.selectGroup")}</option>
              <option value="1">{t("add.group1")}</option>
              <option value="2">{t("add.group2")}</option>
              <option value="3">{t("add.group3")}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-franol-text mb-2">
              {t("add.groupEs")}
            </label>
            <select
              value={form.group_es}
              onChange={(e) => onFieldChange("group_es", e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-franol-warm
                          bg-white text-franol-text
                          focus:border-franol-accent-blue focus:outline-none transition-colors"
            >
              <option value="">{t("add.selectGroup")}</option>
              <option value="AR">-AR</option>
              <option value="ER">-ER</option>
              <option value="IR">-IR</option>
              <option value="irregular">{t("add.irregular")}</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="is_irregular"
            checked={form.is_irregular}
            onChange={(e) => onFieldChange("is_irregular", e.target.checked)}
            className="w-5 h-5 rounded border-2 border-franol-warm text-franol-accent-blue
                       focus:ring-franol-accent-blue focus:ring-offset-0"
          />
          <label htmlFor="is_irregular" className="text-sm font-medium text-franol-text">
            {t("add.isIrregular")}
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_reflexive_fr"
              checked={form.is_reflexive_fr}
              onChange={(e) => onFieldChange("is_reflexive_fr", e.target.checked)}
              className="w-5 h-5 rounded border-2 border-franol-warm text-franol-accent-blue
                          focus:ring-franol-accent-blue focus:ring-offset-0"
            />
            <label htmlFor="is_reflexive_fr" className="text-sm font-medium text-franol-text">
              {t("add.isReflexiveFr")}
            </label>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_reflexive_es"
              checked={form.is_reflexive_es}
              onChange={(e) => onFieldChange("is_reflexive_es", e.target.checked)}
              className="w-5 h-5 rounded border-2 border-franol-warm text-franol-accent-blue
                          focus:ring-franol-accent-blue focus:ring-offset-0"
            />
            <label htmlFor="is_reflexive_es" className="text-sm font-medium text-franol-text">
              {t("add.isReflexiveEs")}
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-franol-text mb-2">
            {t("add.category")}
          </label>
          <div className="flex gap-2">
            <select
              value={form.category}
              onChange={(e) => onFieldChange("category", e.target.value)}
              className="flex-1 px-4 py-3 rounded-xl border-2 border-franol-warm
                          bg-white text-franol-text
                          focus:border-franol-accent-blue focus:outline-none transition-colors"
            >
              <option value="">{t("add.selectCategory")}</option>
              {categories
                .filter((c) => c.type === "vocabulary")
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
        disabled={isLoading || !form.infinitive_fr || !form.infinitive_es}
        className="w-full py-3 px-4 rounded-xl font-medium text-white
                   bg-gradient-to-r from-blue-500 to-blue-600
                   hover:from-blue-600 hover:to-blue-700
                   disabled:opacity-50 disabled:cursor-not-allowed
                   transition-all flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
        ) : (
          <>
            <Plus size={20} />
            {t("add.addVerb")}
          </>
        )}
      </button>
    </form>
  );
}
