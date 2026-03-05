import { Calendar, X } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";

interface Category {
  id: string;
  name_fr: string;
  name_es: string;
  type: "vocabulary" | "expression" | "conjugation";
  color: string;
  icon: string;
}

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
  const { locale, t } = useLocale();

  const hasActiveFilters =
    categoryFilter || contextFilter || dateFrom || dateTo;

  return (
    <div className="space-y-3">
      {/* En-tête avec bouton clear */}
      {hasActiveFilters && (
        <div className="flex justify-end">
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

      {/* Dropdowns et filtres de date - Tous alignés sur PC, 2 par ligne sur mobile */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Filtre catégories */}
        <div>
          <label className="block text-xs font-medium text-franol-muted mb-1">
            {t("content.filterByCategory")}
          </label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border-2 border-franol-warm
                       bg-white text-franol-text text-sm
                       focus:border-franol-accent-blue focus:outline-none transition-colors"
          >
            <option value="">{t("content.allCategories")}</option>
            {vocabularyCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {locale === "fr" ? cat.name_fr : cat.name_es}
              </option>
            ))}
          </select>
        </div>

        {/* Filtre contextes */}
        <div>
          <label className="block text-xs font-medium text-franol-muted mb-1">
            {t("content.filterByContext")}
          </label>
          <select
            value={contextFilter}
            onChange={(e) => setContextFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border-2 border-franol-warm
                       bg-white text-franol-text text-sm
                       focus:border-franol-accent-blue focus:outline-none transition-colors"
          >
            <option value="">{t("content.allContexts")}</option>
            {expressionContexts.map((ctx) => (
              <option key={ctx.id} value={ctx.id}>
                {locale === "fr" ? ctx.name_fr : ctx.name_es}
              </option>
            ))}
          </select>
        </div>

        {/* Date de début */}
        <div>
          <label className="block text-xs font-medium text-franol-muted mb-1">
            <Calendar size={14} className="inline mr-1" />
            {t("content.from")}
          </label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            max={dateTo || undefined}
            className="w-full px-3 py-2 rounded-lg border-2 border-franol-warm
                       bg-white text-franol-text text-sm
                       focus:border-franol-accent-blue focus:outline-none transition-colors"
          />
        </div>

        {/* Date de fin */}
        <div>
          <label className="block text-xs font-medium text-franol-muted mb-1">
            <Calendar size={14} className="inline mr-1" />
            {t("content.to")}
          </label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            min={dateFrom || undefined}
            className="w-full px-3 py-2 rounded-lg border-2 border-franol-warm
                       bg-white text-franol-text text-sm
                       focus:border-franol-accent-blue focus:outline-none transition-colors"
          />
        </div>
      </div>
    </div>
  );
}
