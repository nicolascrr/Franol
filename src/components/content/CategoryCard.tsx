import { Tag, Pencil, Trash2 } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";

interface Category {
  id: string;
  name_fr: string;
  name_es: string;
  type: "vocabulary" | "expression";
  color: string;
  icon: string;
  created_at?: string;
  updated_at?: string;
}

interface CategoryCardProps {
  category: Category;
  onEdit?: (category: Category) => void;
  onDelete?: (category: Category) => void;
}

export function CategoryCard({ category, onEdit, onDelete }: CategoryCardProps) {
  const { locale, t } = useLocale();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(locale === "fr" ? "fr-FR" : "es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div
      className="bg-white rounded-xl p-4 border-2 transition-all
                 hover:border-franol-accent-blue hover:shadow-sm"
      style={{ borderColor: `${category.color}40` }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {/* Icône colorée */}
          <div
            className="p-2 rounded-lg flex-shrink-0"
            style={{
              backgroundColor: `${category.color}20`,
              color: category.color,
            }}
          >
            <Tag size={20} />
          </div>

          {/* Contenu */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-franol-text">
                {locale === "fr" ? category.name_fr : category.name_es}
              </p>
              <span className="text-franol-muted">•</span>
              <p className="text-sm text-franol-muted">
                {locale === "fr" ? category.name_es : category.name_fr}
              </p>
            </div>

            <div className="flex items-center gap-2 mt-1">
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: `${category.color}20`,
                  color: category.color,
                }}
              >
                {category.type === "vocabulary"
                  ? t("content.types.categories")
                  : t("content.types.contexts")}
              </span>
            </div>

            {/* Dates */}
            {category.created_at && (
              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-franol-muted">
                <div className="flex items-center gap-1">
                  <span className="font-medium">{t("content.createdAt")}:</span>
                  <span>{formatDate(category.created_at)}</span>
                </div>
                {category.updated_at && (
                  <div className="flex items-center gap-1">
                    <span className="font-medium">{t("content.updatedAt")}:</span>
                    <span>{formatDate(category.updated_at)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        {(onEdit || onDelete) && (
          <div className="flex items-center gap-1 flex-shrink-0">
            {onEdit && (
              <button
                onClick={() => onEdit(category)}
                className="p-2 rounded-lg text-franol-muted hover:text-franol-accent-blue
                           hover:bg-franol-sand transition-colors"
                title={t("content.edit")}
              >
                <Pencil size={18} />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(category)}
                className="p-2 rounded-lg text-franol-muted hover:text-red-500
                           hover:bg-red-50 transition-colors"
                title={t("content.delete")}
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
