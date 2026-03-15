"use client";

import { useLocale } from "@/contexts/LocaleContext";
import { AliasInput } from "@/components/forms/AliasInput";
import { CustomDropdown } from "@/components/ui/CustomDropdown";
import { ARTICLES_FR, ARTICLES_ES } from "@/lib/constants";
import type { Category } from "@/types";
import { getLangValue } from "@/lib/lang";
import { Plus } from "lucide-react";
import type { LangCode } from "@/lib/lang";

interface VocabularyFormProps {
  form: {
    word_fr: string;
    word_es: string;
    article_fr: string;
    article_es: string;
    aliases_fr: string[];
    aliases_es: string[];
    category: string;
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

export function VocabularyForm({
  form,
  categories,
  sourceLang,
  isLoading,
  onSubmit,
  onFieldChange,
  onOpenCategoryModal,
  beforeSubmit,
}: VocabularyFormProps) {
  const { t } = useLocale();

  return (
    <form onSubmit={onSubmit} className="space-y-4 animate-fade-in">
      <div className="bg-white rounded-2xl p-6 border border-franol-warm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-franol-text mb-2">
              {t("add.wordFr")} *
            </label>
            <input
              type="text"
              value={form.word_fr}
              onChange={(e) => onFieldChange("word_fr", e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border-2 border-franol-warm
                         bg-white text-franol-text placeholder-franol-muted
                         focus:border-franol-accent-blue focus:outline-none transition-colors"
              placeholder={t("add.wordFrPlaceholder")}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-franol-text mb-2">
              {t("add.wordEs")} *
            </label>
            <input
              type="text"
              value={form.word_es}
              onChange={(e) => onFieldChange("word_es", e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border-2 border-franol-warm
                         bg-white text-franol-text placeholder-franol-muted
                         focus:border-franol-accent-blue focus:outline-none transition-colors"
              placeholder={t("add.wordEsPlaceholder")}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CustomDropdown
            value={form.article_fr}
            onChange={(value) => onFieldChange("article_fr", value)}
            options={[
              { value: "", label: t("add.selectArticle") },
              ...ARTICLES_FR.map((article) => ({ value: article, label: article })),
            ]}
            placeholder={t("add.selectArticle")}
            label={t("add.articleFr")}
          />
          <CustomDropdown
            value={form.article_es}
            onChange={(value) => onFieldChange("article_es", value)}
            options={[
              { value: "", label: t("add.selectArticle") },
              ...ARTICLES_ES.map((article) => ({ value: article, label: article })),
            ]}
            placeholder={t("add.selectArticle")}
            label={t("add.articleEs")}
          />
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
              placeholder={t("add.aliasPlaceholderVocab")}
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
              placeholder={t("add.aliasPlaceholderVocab")}
            />
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-franol-text mb-2">
            {t("add.category")}
          </label>
          <div className="flex gap-2">
            <CustomDropdown
              value={form.category}
              onChange={(value) => onFieldChange("category", value)}
              options={[
                { value: "", label: t("add.selectCategory") },
                ...categories
                  .filter((c) => c.type === "vocabulary")
                  .map((cat) => ({
                    value: cat.id,
                    label: getLangValue(cat, "name", sourceLang),
                    color: cat.color,
                  })),
              ]}
              placeholder={t("add.selectCategory")}
              className="flex-1"
            />
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
        disabled={isLoading || !form.word_fr || !form.word_es}
        className="w-full py-3 px-4 rounded-xl font-medium text-white
                   bg-gradient-to-r from-emerald-500 to-emerald-600
                   hover:from-emerald-600 hover:to-emerald-700
                   disabled:opacity-50 disabled:cursor-not-allowed
                   transition-all flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
        ) : (
          <>
            <Plus size={20} />
            {t("add.addVocabulary")}
          </>
        )}
      </button>
    </form>
  );
}
