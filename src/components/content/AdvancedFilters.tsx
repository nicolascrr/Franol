import { X } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { getLangValue } from "@/lib/lang";
import { CustomDropdown } from "@/components/ui/CustomDropdown";
import { CustomDatePicker } from "@/components/ui/CustomDatePicker";
import type { Category } from "@/types";

interface AdvancedFiltersProps {
  categoryFilter: string;
  setCategoryFilter: (value: string) => void;
  contextFilter: string;
  setContextFilter: (value: string) => void;
  dateFrom: string;
  setDateFrom: (value: string) => void;
  dateTo: string;
  setDateTo: (value: string) => void;
  vocabularyCategories: Category[];
  expressionContexts: Category[];
  onClear: () => void;
}

export function AdvancedFilters({
  categoryFilter,
  setCategoryFilter,
  contextFilter,
  setContextFilter,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  vocabularyCategories,
  expressionContexts,
  onClear,
}: AdvancedFiltersProps) {
  const { t, sourceLang } = useLocale();

  const hasActiveFilters =
    categoryFilter || contextFilter || dateFrom || dateTo;

  return (
    <div className="space-y-3">
      {/* Dropdowns et filtres de date - Tous alignés sur PC, 2 par ligne sur mobile */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Filtre catégories */}
        <CustomDropdown
          value={categoryFilter}
          onChange={setCategoryFilter}
          options={[
            { value: "", label: t("content.allCategories") },
            ...vocabularyCategories.map((cat) => ({
              value: cat.id,
              label: getLangValue(cat, "name", sourceLang),
              color: cat.color,
            })),
          ]}
          placeholder={t("content.allCategories")}
          label={t("content.filterByCategory")}
        />

        {/* Filtre contextes */}
        <CustomDropdown
          value={contextFilter}
          onChange={setContextFilter}
          options={[
            { value: "", label: t("content.allContexts") },
            ...expressionContexts.map((ctx) => ({
              value: ctx.id,
              label: getLangValue(ctx, "name", sourceLang),
              color: ctx.color,
            })),
          ]}
          placeholder={t("content.allContexts")}
          label={t("content.filterByContext")}
        />

        {/* Date de début */}
        <CustomDatePicker
          value={dateFrom ? new Date(dateFrom) : null}
          onChange={(date) => setDateFrom(date.toISOString().split("T")[0])}
          placeholder={t("content.dateSelecter")}
          label={t("content.filterByDateOfBeginning")}
          maxDate={dateTo ? new Date(dateTo) : undefined}
        />

        {/* Date de fin */}
        <CustomDatePicker
          value={dateTo ? new Date(dateTo) : null}
          onChange={(date) => setDateTo(date.toISOString().split("T")[0])}
          placeholder={t("content.dateSelecter")}
          label={t("content.filterByDateOfEnding")}
          minDate={dateFrom ? new Date(dateFrom) : undefined}
        />
      </div>

      {/* Bouton clear - sous les filtres */}
      {hasActiveFilters && (
        <div className="flex justify-start">
          <button
            onClick={onClear}
            className="flex items-center gap-1 text-sm text-franol-muted hover:text-franol-text
                       transition-colors"
          >
            <X size={16} />
            {t("content.clearFilters")}
          </button>
        </div>
      )}
    </div>
  );
}
