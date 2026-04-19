"use client";

import { useLocale } from "@/contexts/LocaleContext";
import { AliasSection } from "@/components/forms/AliasSection";
import { CustomDropdown } from "@/components/ui/CustomDropdown";
import { Checkbox } from "@/components/ui/Checkbox";
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

        <AliasSection
          aliasesFr={form.aliases_fr}
          aliasesEs={form.aliases_es}
          onAddFr={(alias) => onFieldChange("aliases_fr", [...form.aliases_fr, alias])}
          onRemoveFr={(index) => onFieldChange("aliases_fr", form.aliases_fr.filter((_, i) => i !== index))}
          onAddEs={(alias) => onFieldChange("aliases_es", [...form.aliases_es, alias])}
          onRemoveEs={(index) => onFieldChange("aliases_es", form.aliases_es.filter((_, i) => i !== index))}
          placeholderFr={t("add.aliasPlaceholderVerb")}
          placeholderEs={t("add.aliasPlaceholderVerb")}
          labelFr={t("add.aliasesFr")}
          labelEs={t("add.aliasesEs")}
          title={t("add.aliases")}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CustomDropdown
            value={form.group_fr}
            onChange={(value) => onFieldChange("group_fr", value)}
            options={[
              { value: "", label: t("add.selectGroup") },
              { value: "1", label: t("add.group1") },
              { value: "2", label: t("add.group2") },
              { value: "3", label: t("add.group3") },
            ]}
            placeholder={t("add.selectGroup")}
            label={t("add.groupFr")}
          />
          <CustomDropdown
            value={form.group_es}
            onChange={(value) => onFieldChange("group_es", value)}
            options={[
              { value: "", label: t("add.selectGroup") },
              { value: "AR", label: "-AR" },
              { value: "ER", label: "-ER" },
              { value: "IR", label: "-IR" },
              { value: "irregular", label: t("add.irregular") },
            ]}
            placeholder={t("add.selectGroup")}
            label={t("add.groupEs")}
          />
        </div>

        <Checkbox
          id="is_irregular"
          checked={form.is_irregular}
          onChange={(val) => onFieldChange("is_irregular", val)}
          label={t("add.isIrregular")}
        />

        <div className="flex flex-wrap items-center gap-6">
          <Checkbox
            id="is_reflexive_fr"
            checked={form.is_reflexive_fr}
            onChange={(val) => onFieldChange("is_reflexive_fr", val)}
            label={t("add.isReflexiveFr")}
          />
          <Checkbox
            id="is_reflexive_es"
            checked={form.is_reflexive_es}
            onChange={(val) => onFieldChange("is_reflexive_es", val)}
            label={t("add.isReflexiveEs")}
          />
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
