import { BookOpen, MessageSquare, Languages, Pencil, Trash2 } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";

interface Category {
  id: string;
  name_fr: string;
  name_es: string;
  type: "vocabulary" | "expression";
  color: string;
  icon: string;
}

interface VocabularyItem {
  id: string;
  word_fr: string;
  word_es: string;
  aliases_fr: string[];
  aliases_es: string[];
  category: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

interface ExpressionItem {
  id: string;
  expression_fr: string;
  expression_es: string;
  aliases_fr: string[];
  aliases_es: string[];
  context: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

interface ConjugationItem {
  id: string;
  infinitive_fr: string;
  infinitive_es: string;
  aliases_fr: string[];
  aliases_es: string[];
  group_fr: string;
  group_es: string;
  is_irregular: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
}

type ContentItem =
  | (VocabularyItem & { type: "vocabulary" })
  | (ExpressionItem & { type: "expression" })
  | (ConjugationItem & { type: "conjugation" });

interface ContentCardProps {
  item: ContentItem;
  category: Category | null;
  categories: Category[];
  onEdit: (item: ContentItem) => void;
  onDelete: (item: ContentItem) => void;
}

export function ContentCard({
  item,
  category,
  categories,
  onEdit,
  onDelete,
}: ContentCardProps) {
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

  const getItemLabels = () => {
    if (item.type === "vocabulary") {
      const v = item as VocabularyItem;
      return { fr: v.word_fr, es: v.word_es };
    } else if (item.type === "expression") {
      const e = item as ExpressionItem;
      return { fr: e.expression_fr, es: e.expression_es };
    } else {
      const c = item as ConjugationItem;
      return { fr: c.infinitive_fr, es: c.infinitive_es };
    }
  };

  const getItemAliases = () => {
    return {
      fr: item.aliases_fr || [],
      es: item.aliases_es || [],
    };
  };

  const labels = getItemLabels();
  const aliases = getItemAliases();
  const totalAliases = aliases.fr.length + aliases.es.length;

  return (
    <div
      className="bg-white rounded-xl p-4 border border-franol-warm
                 hover:border-franol-accent-blue transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {/* Icône du type */}
          <div
            className={`p-2 rounded-lg flex-shrink-0 ${
              item.type === "vocabulary"
                ? "bg-emerald-100 text-emerald-600"
                : item.type === "expression"
                  ? "bg-purple-100 text-purple-600"
                  : "bg-blue-100 text-blue-600"
            }`}
          >
            {item.type === "vocabulary" && <BookOpen size={18} />}
            {item.type === "expression" && <MessageSquare size={18} />}
            {item.type === "conjugation" && <Languages size={18} />}
          </div>

          {/* Contenu */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-franol-text">{labels.fr}</p>
              <span className="text-franol-muted">•</span>
              <p className="text-franol-muted">{labels.es}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-1">
              {category && (
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: `${category.color}20`,
                    color: category.color,
                  }}
                >
                  {locale === "fr" ? category.name_fr : category.name_es}
                </span>
              )}
              {totalAliases > 0 && (
                <span className="text-xs text-franol-muted">
                  {totalAliases} {t("content.aliases")}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-franol-muted">
              <div className="flex items-center gap-1">
                <span className="font-medium">{t("content.createdAt")}:</span>
                <span>{formatDate(item.created_at)}</span>
              </div>
              {item.updated_at && (
                <div className="flex items-center gap-1">
                  <span className="font-medium">{t("content.updatedAt")}:</span>
                  <span>{formatDate(item.updated_at)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onEdit(item)}
            className="p-2 rounded-lg text-franol-muted hover:text-franol-accent-blue
                       hover:bg-franol-sand transition-colors"
            title={t("content.edit")}
          >
            <Pencil size={18} />
          </button>
          <button
            onClick={() => onDelete(item)}
            className="p-2 rounded-lg text-franol-muted hover:text-red-500
                       hover:bg-red-50 transition-colors"
            title={t("content.delete")}
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
