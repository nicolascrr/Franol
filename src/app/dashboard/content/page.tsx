"use client";

import { useState, useEffect, useMemo } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { createClient } from "@/lib/supabase/client";
import { getLangValue } from "@/lib/lang";
import { AliasInput } from "@/components/forms/AliasInput";
import type {
  Category,
  VocabularyItem,
  ExpressionItem,
  ConjugationItem,
  ContentItem,
} from "@/types";
import { ARTICLES_FR, ARTICLES_ES } from "@/lib/constants";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { AdvancedFilters } from "@/components/content/AdvancedFilters";
import { ContentCard } from "@/components/content/ContentCard";
import { CategoryCard } from "@/components/content/CategoryCard";
import { EditModal } from "@/components/content/EditModal";
import { Search, X, Loader2, Plus } from "lucide-react";
import type { LangCode } from "@/lib/lang";

const supabase = createClient();

type ContentType = "vocabulary" | "expressions" | "verbs" | "categories" | "contexts";

type CategoryDisplayItem = Omit<Category, "type"> & {
  type: "category";
  categoryType: Category["type"];
};
type DisplayItem = ContentItem | CategoryDisplayItem;

export default function ContentPage() {
  const { locale, sourceLang, t } = useLocale();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [content, setContent] = useState<ContentItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Filtres - Multi-sélection (par défaut tout est sélectionné)
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<Set<ContentType>>(
    new Set<ContentType>([
      "vocabulary",
      "expressions",
      "verbs",
      "categories",
      "contexts",
    ]),
  );
  const [categoryFilter, setCategoryFilter] = useState("");
  const [contextFilter, setContextFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showOnlyUnverified, setShowOnlyUnverified] = useState(false);

  // Modal édition contenu
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Modal suppression contenu
  const [deletingItem, setDeletingItem] = useState<ContentItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Modal suppression catégorie
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(
    null,
  );
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);

  // Modal édition catégorie
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [categoryEditForm, setCategoryEditForm] = useState({
    name_fr: "",
    name_es: "",
    color: "#4F46E5",
  });

  // Modal création de catégorie (depuis le formulaire d'édition)
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [newCategoryType, setNewCategoryType] = useState<
    "vocabulary" | "expression" | "conjugation"
  >("vocabulary");
  const [isSavingNewCategory, setIsSavingNewCategory] = useState(false);
  const [newCategoryForm, setNewCategoryForm] = useState({
    name_fr: "",
    name_es: "",
    color: "#10b981",
  });

  // États du formulaire d'édition
  const [editForm, setEditForm] = useState<{
    word_fr?: string;
    word_es?: string;
    article_fr?: string;
    article_es?: string;
    expression_fr?: string;
    expression_es?: string;
    infinitive_fr?: string;
    infinitive_es?: string;
    aliases_fr: string[];
    aliases_es: string[];
    category?: string;
    context?: string;
    group_fr?: string;
    group_es?: string;
    is_irregular?: boolean;
    is_reflexive_fr?: boolean;
    is_reflexive_es?: boolean;
    verified?: boolean;
    notes: string;
  }>({
    aliases_fr: [],
    aliases_es: [],
    notes: "",
  });

  // Charger le contenu et les catégories
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [vocabRes, exprRes, conjRes, catRes] = await Promise.all([
          supabase
            .from("vocabulary")
            .select("*")
            .order("created_at", { ascending: false }),
          supabase
            .from("expressions")
            .select("*")
            .order("created_at", { ascending: false }),
          supabase
            .from("conjugations")
            .select("*")
            .order("created_at", { ascending: false }),
          supabase
            .from("categories")
            .select("*")
            .neq("type", "lesson")
            .order("created_at", { ascending: false }),
        ]);

        const items: ContentItem[] = [
          ...(vocabRes.data || []).map((item) => ({
            ...item,
            type: "vocabulary" as const,
          })),
          ...(exprRes.data || []).map((item) => ({
            ...item,
            type: "expression" as const,
          })),
          ...(conjRes.data || []).map((item) => ({
            ...item,
            type: "conjugation" as const,
          })),
        ].sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );

        setContent(items);
        setCategories(catRes.data || []);
      } catch {
        setError(t("common.error"));
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [t]);

  // Toggle de sélection de type (on/off indépendant)
  const toggleType = (type: ContentType) => {
    const newSelected = new Set(selectedTypes);
    if (newSelected.has(type)) {
      newSelected.delete(type);
    } else {
      newSelected.add(type);
    }
    // Autoriser la désélection complète
    setSelectedTypes(newSelected);
  };

  // Filtrer et combiner le contenu avec les catégories
  const filteredDisplayItems = useMemo(() => {
    // Si rien n'est sélectionné, retourner un tableau vide
    if (selectedTypes.size === 0) {
      return [];
    }

    const items: DisplayItem[] = [];

    // Ajouter les éléments de contenu
    const filteredContent = content.filter((item) => {
      // Filtre par type sélectionné
      if (item.type === "vocabulary" && !selectedTypes.has("vocabulary"))
        return false;
      if (item.type === "expression" && !selectedTypes.has("expressions"))
        return false;
      if (item.type === "conjugation" && !selectedTypes.has("verbs"))
        return false;

      // Filtre par catégorie
      if (categoryFilter) {
        if (
          item.type === "vocabulary" &&
          (item as VocabularyItem).category !== categoryFilter
        )
          return false;
        if (item.type !== "vocabulary") return false;
      }

      // Filtre par contexte
      if (contextFilter) {
        if (
          item.type === "expression" &&
          (item as ExpressionItem).context !== contextFilter
        )
          return false;
        if (item.type !== "expression") return false;
      }

      // Filtre par statut de vérification
      if (showOnlyUnverified) {
        if (item.type === "vocabulary" && (item as VocabularyItem).verified)
          return false;
        if (item.type === "expression" && (item as ExpressionItem).verified)
          return false;
        if (item.type === "conjugation" && (item as ConjugationItem).verified)
          return false;
      }

      // Filtre par plage de dates
      if (dateFrom) {
        const itemDate = new Date(item.created_at);
        const fromDate = new Date(dateFrom);
        if (itemDate < fromDate) return false;
      }
      if (dateTo) {
        const itemDate = new Date(item.created_at);
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (itemDate > toDate) return false;
      }

      // Filtre par recherche
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const searchFields: string[] = [];

        if (item.type === "vocabulary") {
          const v = item as VocabularyItem;
          searchFields.push(
            v.word_fr,
            v.word_es,
            ...(v.aliases_fr || []),
            ...(v.aliases_es || []),
          );
        } else if (item.type === "expression") {
          const e = item as ExpressionItem;
          searchFields.push(
            e.expression_fr,
            e.expression_es,
            ...(e.aliases_fr || []),
            ...(e.aliases_es || []),
          );
        } else {
          const c = item as ConjugationItem;
          searchFields.push(
            c.infinitive_fr,
            c.infinitive_es,
            ...(c.aliases_fr || []),
            ...(c.aliases_es || []),
          );
        }

        return searchFields.some((field) =>
          field?.toLowerCase().includes(query),
        );
      }

      return true;
    });

    items.push(...filteredContent);

    // Ajouter les catégories/contextes
    const filteredCategories = categories.filter((cat) => {
      // Ne pas afficher les catégories si on filtre par contenu non vérifié
      if (showOnlyUnverified) return false;

      // Ne pas afficher les catégories/contextes si un filtre par catégorie ou contexte est actif
      if (categoryFilter || contextFilter) return false;

      // Filtre par type sélectionné
      if (cat.type === "vocabulary" && !selectedTypes.has("categories"))
        return false;
      if (cat.type === "expression" && !selectedTypes.has("contexts"))
        return false;

      // Filtre par plage de dates
      if (cat.created_at) {
        if (dateFrom) {
          const catDate = new Date(cat.created_at);
          const fromDate = new Date(dateFrom);
          if (catDate < fromDate) return false;
        }
        if (dateTo) {
          const catDate = new Date(cat.created_at);
          const toDate = new Date(dateTo);
          toDate.setHours(23, 59, 59, 999);
          if (catDate > toDate) return false;
        }
      }

      // Filtre par recherche
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          cat.name_fr.toLowerCase().includes(query) ||
          cat.name_es.toLowerCase().includes(query)
        );
      }

      return true;
    });

    items.push(
      ...filteredCategories.map((cat) => ({
        id: cat.id,
        name_fr: cat.name_fr,
        name_es: cat.name_es,
        color: cat.color,
        icon: cat.icon,
        created_at: cat.created_at,
        updated_at: cat.updated_at,
        type: "category" as const,
        categoryType: cat.type,
      })),
    );

    // Trier par date de création (plus récent en premier)
    return items.sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateB - dateA;
    });
  }, [
    content,
    categories,
    selectedTypes,
    categoryFilter,
    contextFilter,
    dateFrom,
    dateTo,
    searchQuery,
    showOnlyUnverified,
  ]);

  // Catégories pour les filtres
  const vocabularyCategories = useMemo(
    () => categories.filter((c) => c.type === "vocabulary"),
    [categories],
  );
  const expressionContexts = useMemo(
    () => categories.filter((c) => c.type === "expression"),
    [categories],
  );
  const conjugationCategories = useMemo(
    () => categories.filter((c) => c.type === "conjugation"),
    [categories],
  );

  // Obtenir la catégorie d'un item
  const getItemCategory = (item: ContentItem): Category | null => {
    let categoryId: string | undefined;
    if (item.type === "vocabulary") {
      categoryId = (item as VocabularyItem).category;
    } else if (item.type === "expression") {
      categoryId = (item as ExpressionItem).context;
    }
    if (!categoryId) return null;
    return categories.find((c) => c.id === categoryId) ?? null;
  };

  const clearFilters = () => {
    setCategoryFilter("");
    setContextFilter("");
    setDateFrom("");
    setDateTo("");
  };

  // Ouvrir la modal d'édition
  const openEditModal = (item: ContentItem) => {
    setEditingItem(item);
    if (item.type === "vocabulary") {
      const v = item as VocabularyItem;
      setEditForm({
        word_fr: v.word_fr,
        word_es: v.word_es,
        article_fr: v.article_fr || "",
        article_es: v.article_es || "",
        aliases_fr: v.aliases_fr || [],
        aliases_es: v.aliases_es || [],
        category: v.category || "",
        verified: v.verified || false,
        notes: v.notes || "",
      });
    } else if (item.type === "expression") {
      const e = item as ExpressionItem;
      setEditForm({
        expression_fr: e.expression_fr,
        expression_es: e.expression_es,
        aliases_fr: e.aliases_fr || [],
        aliases_es: e.aliases_es || [],
        context: e.context || "",
        verified: e.verified || false,
        notes: e.notes || "",
      });
    } else {
      const c = item as ConjugationItem;
      setEditForm({
        infinitive_fr: c.infinitive_fr,
        infinitive_es: c.infinitive_es,
        aliases_fr: c.aliases_fr || [],
        aliases_es: c.aliases_es || [],
        group_fr: c.group_fr || "",
        group_es: c.group_es || "",
        is_irregular: c.is_irregular || false,
        is_reflexive_fr: c.is_reflexive_fr || false,
        is_reflexive_es: c.is_reflexive_es || false,
        category: c.category || "",
        verified: c.verified || false,
        notes: c.notes || "",
      });
    }
  };

  const closeEditModal = () => {
    setEditingItem(null);
    setEditForm({ aliases_fr: [], aliases_es: [], notes: "" });
  };

  // Sauvegarder les modifications
  const handleSave = async () => {
    if (!editingItem) return;
    setIsSaving(true);

    try {
      let updateData: Record<string, unknown>;
      let table: string;
      const now = new Date().toISOString();

      if (editingItem.type === "vocabulary") {
        table = "vocabulary";
        updateData = {
          word_fr: editForm.word_fr,
          word_es: editForm.word_es,
          article_fr: editForm.article_fr || null,
          article_es: editForm.article_es || null,
          aliases_fr: editForm.aliases_fr,
          aliases_es: editForm.aliases_es,
          category: editForm.category || null,
          verified: editForm.verified || false,
          notes: editForm.notes || null,
          updated_at: now,
        };
      } else if (editingItem.type === "expression") {
        table = "expressions";
        updateData = {
          expression_fr: editForm.expression_fr,
          expression_es: editForm.expression_es,
          aliases_fr: editForm.aliases_fr,
          aliases_es: editForm.aliases_es,
          context: editForm.context || null,
          verified: editForm.verified || false,
          notes: editForm.notes || null,
          updated_at: now,
        };
      } else {
        table = "conjugations";
        updateData = {
          infinitive_fr: editForm.infinitive_fr,
          infinitive_es: editForm.infinitive_es,
          aliases_fr: editForm.aliases_fr,
          aliases_es: editForm.aliases_es,
          group_fr: editForm.group_fr || null,
          group_es: editForm.group_es || null,
          is_irregular: editForm.is_irregular,
          is_reflexive_fr: editForm.is_reflexive_fr || false,
          is_reflexive_es: editForm.is_reflexive_es || false,
          category: editForm.category || null,
          verified: editForm.verified || false,
          notes: editForm.notes || null,
          updated_at: now,
        };
      }

      const { data, error: err } = await supabase
        .from(table)
        .update(updateData)
        .eq("id", editingItem.id)
        .select()
        .single();

      if (err) throw err;

      setContent((prev) =>
        prev.map((item) =>
          item.id === editingItem.id ? { ...data, type: item.type } : item,
        ),
      );

      closeEditModal();
    } catch {
      setError(t("common.error"));
    } finally {
      setIsSaving(false);
    }
  };

  const openDeleteModal = (item: ContentItem) => {
    setDeletingItem(item);
  };

  const closeDeleteModal = () => {
    setDeletingItem(null);
  };

  const confirmDelete = async () => {
    if (!deletingItem) return;
    setIsDeleting(true);

    try {
      const table =
        deletingItem.type === "vocabulary"
          ? "vocabulary"
          : deletingItem.type === "expression"
            ? "expressions"
            : "conjugations";

      const { error: err } = await supabase
        .from(table)
        .delete()
        .eq("id", deletingItem.id);
      if (err) throw err;

      setContent((prev) => prev.filter((c) => c.id !== deletingItem.id));
      closeDeleteModal();
    } catch {
      setError(t("common.error"));
    } finally {
      setIsDeleting(false);
    }
  };

  // Édition de catégorie
  const openEditCategoryModal = (category: Category) => {
    setEditingCategory(category);
    setCategoryEditForm({
      name_fr: category.name_fr,
      name_es: category.name_es,
      color: category.color,
    });
  };

  const closeEditCategoryModal = () => {
    setEditingCategory(null);
    setCategoryEditForm({
      name_fr: "",
      name_es: "",
      color: "#4F46E5",
    });
  };

  const handleSaveCategory = async () => {
    if (!editingCategory) return;
    if (!categoryEditForm.name_fr.trim() || !categoryEditForm.name_es.trim()) {
      setError(
        locale === "fr"
          ? "Les noms en français et en espagnol sont obligatoires."
          : "Los nombres en francés y español son obligatorios."
      );
      return;
    }
    setIsSavingCategory(true);
    setError("");

    try {
      const { data, error: err } = await supabase
        .from("categories")
        .update({
          name_fr: categoryEditForm.name_fr.trim(),
          name_es: categoryEditForm.name_es.trim(),
          color: categoryEditForm.color,
        })
        .eq("id", editingCategory.id)
        .select()
        .single();

      if (err) {
        console.error("Supabase error updating category:", err.message, err.code);
        throw err;
      }

      setCategories((prev) =>
        prev.map((c) => (c.id === editingCategory.id ? data : c)),
      );
      closeEditCategoryModal();
    } catch (error) {
      console.error("Error saving category:", error);
      setError(t("content.saveError"));
    } finally {
      setIsSavingCategory(false);
    }
  };

  // Création de catégorie (depuis le formulaire d'édition)
  const openNewCategoryModal = (
    type: "vocabulary" | "expression" | "conjugation",
  ) => {
    setNewCategoryType(type);
    setNewCategoryForm({ name_fr: "", name_es: "", color: "#10b981" });
    setShowNewCategoryModal(true);
  };

  const closeNewCategoryModal = () => {
    setShowNewCategoryModal(false);
    setNewCategoryForm({ name_fr: "", name_es: "", color: "#10b981" });
  };

  const handleCreateNewCategory = async () => {
    if (!newCategoryForm.name_fr || !newCategoryForm.name_es) return;
    setIsSavingNewCategory(true);

    try {
      const { data, error: err } = await supabase
        .from("categories")
        .insert({
          name_fr: newCategoryForm.name_fr,
          name_es: newCategoryForm.name_es,
          type: newCategoryType,
          color: newCategoryForm.color,
          icon: "tag",
        })
        .select()
        .single();

      if (err) throw err;

      setCategories((prev) => [...prev, data]);

      if (newCategoryType === "expression") {
        setEditForm((prev) => ({ ...prev, context: data.id }));
      } else {
        setEditForm((prev) => ({ ...prev, category: data.id }));
      }

      closeNewCategoryModal();
    } catch {
      setError(t("common.error"));
    } finally {
      setIsSavingNewCategory(false);
    }
  };

  // Suppression de catégorie
  const openDeleteCategoryModal = (category: Category) => {
    setDeletingCategory(category);
  };

  const closeDeleteCategoryModal = () => {
    setDeletingCategory(null);
  };

  const confirmDeleteCategory = async () => {
    if (!deletingCategory) return;
    setIsDeletingCategory(true);

    try {
      const { error: err } = await supabase
        .from("categories")
        .delete()
        .eq("id", deletingCategory.id);
      if (err) throw err;

      setCategories((prev) => prev.filter((c) => c.id !== deletingCategory.id));
      closeDeleteCategoryModal();
    } catch {
      setError(t("common.error"));
    } finally {
      setIsDeletingCategory(false);
    }
  };

  const getItemLabels = (item: ContentItem) => {
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

  const typeButtons: { key: ContentType | "all"; labelKey: string }[] = [
    { key: "all", labelKey: "all" },
    { key: "vocabulary", labelKey: "vocabulary" },
    { key: "expressions", labelKey: "expressions" },
    { key: "verbs", labelKey: "verbs" },
    { key: "categories", labelKey: "categories" },
    { key: "contexts", labelKey: "contexts" },
  ];

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto min-w-0 overflow-x-hidden">
      {/* Header */}
      <header className="mb-6 animate-fade-in">
        <h1 className="text-2xl md:text-3xl font-display font-bold text-franol-text">
          {t("content.title")}
        </h1>
        <p className="mt-1 text-franol-muted">{t("content.subtitle")}</p>
      </header>

      {/* Barre de recherche */}
      <div className="mb-4 animate-slide-up">
        <div className="relative">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-franol-muted"
            size={20}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("content.searchPlaceholder")}
            className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-franol-warm
                       bg-white text-franol-text placeholder-franol-muted
                       focus:border-franol-accent-blue focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-franol-muted
                         hover:text-franol-text transition-colors"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Filtres type - Multi-sélection */}
      <div className="mb-4 animate-slide-up">
        <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
          {typeButtons.map((btn) => {
            const isAll = btn.key === "all";
            // "Tout" n'est jamais visuellement sélectionné
            const isSelected = isAll
              ? false
              : selectedTypes.has(btn.key as ContentType);

            return (
              <button
                key={btn.key}
                onClick={() => {
                  if (isAll) {
                    // Sélectionner tous les types
                    setSelectedTypes(
                      new Set<ContentType>([
                        "vocabulary",
                        "expressions",
                        "verbs",
                        "categories",
                        "contexts",
                      ]),
                    );
                  } else {
                    toggleType(btn.key as ContentType);
                  }
                }}
                className={`px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all flex-shrink-0 ${
                  isSelected
                    ? "bg-franol-accent-blue text-white"
                    : "bg-white border border-franol-warm text-franol-muted hover:text-franol-text hover:border-franol-accent-blue"
                }`}
              >
                {t(`content.types.${btn.labelKey}`)}
              </button>
            );
          })}
          {/* To verify filter button */}
          <button
            onClick={() => setShowOnlyUnverified(!showOnlyUnverified)}
            className={`px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all flex-shrink-0 ${
              showOnlyUnverified
                ? "bg-amber-500 text-white"
                : "bg-white border border-franol-warm text-franol-muted hover:text-franol-text hover:border-amber-500"
            }`}
          >
            {t("content.types.toVerify")}
          </button>
        </div>
      </div>

      {/* Filtres avancés */}
      <div className="mb-6 animate-slide-up">
        <AdvancedFilters
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          contextFilter={contextFilter}
          setContextFilter={setContextFilter}
          dateFrom={dateFrom}
          setDateFrom={setDateFrom}
          dateTo={dateTo}
          setDateTo={setDateTo}
          vocabularyCategories={vocabularyCategories}
          expressionContexts={expressionContexts}
          onClear={clearFilters}
        />
      </div>

      {/* Erreur */}
      {error && (
        <div className="mb-4 p-4 rounded-xl bg-red-50 text-red-600 animate-fade-in">
          {error}
          <button onClick={() => setError("")} className="ml-2 underline">
            {t("common.close")}
          </button>
        </div>
      )}

      {/* Liste combinée du contenu et des catégories */}
      <div className="space-y-3 animate-fade-in">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-franol-muted" />
          </div>
        ) : filteredDisplayItems.length === 0 ? (
          <div className="text-center py-12 text-franol-muted">
            {searchQuery ||
            categoryFilter ||
            contextFilter ||
            dateFrom ||
            dateTo
              ? t("content.noResults")
              : t("content.noContent")}
          </div>
        ) : (
          <>
            <p className="text-sm text-franol-muted mb-4">
              {filteredDisplayItems.length} {t("content.items")}
            </p>
            {filteredDisplayItems.map((item) => {
              if ("type" in item && item.type === "category") {
                const catItem = item as CategoryDisplayItem;
                const category: Category = {
                  id: catItem.id,
                  name_fr: catItem.name_fr,
                  name_es: catItem.name_es,
                  type: catItem.categoryType,
                  color: catItem.color,
                  icon: catItem.icon,
                  created_at: catItem.created_at,
                  updated_at: catItem.updated_at,
                };
                return (
                  <CategoryCard
                    key={`category-${category.id}`}
                    category={category}
                    onEdit={openEditCategoryModal}
                    onDelete={openDeleteCategoryModal}
                  />
                );
              } else {
                const contentItem = item as ContentItem;
                return (
                  <ContentCard
                    key={`${contentItem.type}-${contentItem.id}`}
                    item={contentItem}
                    category={getItemCategory(contentItem)}
                    categories={categories}
                    onEdit={openEditModal}
                    onDelete={openDeleteModal}
                  />
                );
              }
            })}
          </>
        )}
      </div>

      {/* Modal d'édition */}
      <EditModal
        editingItem={editingItem}
        editForm={editForm}
        setEditForm={setEditForm}
        vocabularyCategories={vocabularyCategories}
        expressionContexts={expressionContexts}
        sourceLang={sourceLang}
        isSaving={isSaving}
        onClose={closeEditModal}
        onSave={handleSave}
        onOpenNewCategoryModal={openNewCategoryModal}
      />

      {/* Modal d'édition de catégorie */}
      {editingCategory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-franol-warm">
              <h2 className="text-xl font-display font-bold text-franol-text">
                {t("content.editCategory")}
              </h2>
              <button
                onClick={closeEditCategoryModal}
                className="p-2 rounded-lg text-franol-muted hover:text-franol-text
                           hover:bg-franol-sand transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-franol-accent-red/20 text-franol-accent-red text-sm">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-franol-text mb-2">
                  {locale === "fr" ? "Type" : "Tipo"}
                </label>
                <input
                  type="text"
                  value={
                    editingCategory.type === "vocabulary"
                      ? t("content.types.categories")
                      : t("content.types.contexts")
                  }
                  disabled
                  className="w-full px-4 py-3 rounded-xl border-2 border-franol-warm
                             bg-gray-100 text-franol-muted cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-franol-text mb-2">
                  {locale === "fr"
                    ? "Nom en français *"
                    : "Nombre en francés *"}
                </label>
                <input
                  type="text"
                  value={categoryEditForm.name_fr}
                  onChange={(e) =>
                    setCategoryEditForm({
                      ...categoryEditForm,
                      name_fr: e.target.value,
                    })
                  }
                  placeholder={
                    locale === "fr"
                      ? editingCategory.type === "vocabulary"
                        ? "Ex : Nourriture"
                        : "Ex : Argot"
                      : editingCategory.type === "vocabulary"
                        ? "Ej: Nourriture"
                        : "Ej: Argot"
                  }
                  className="w-full px-4 py-3 rounded-xl border-2 border-franol-warm
                             bg-white text-franol-text
                             focus:border-franol-accent-blue focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-franol-text mb-2">
                  {locale === "fr"
                    ? "Nom en espagnol *"
                    : "Nombre en español *"}
                </label>
                <input
                  type="text"
                  value={categoryEditForm.name_es}
                  onChange={(e) =>
                    setCategoryEditForm({
                      ...categoryEditForm,
                      name_es: e.target.value,
                    })
                  }
                  placeholder={
                    locale === "fr"
                      ? editingCategory.type === "vocabulary"
                        ? "Ex : Comida"
                        : "Ex : Jerga"
                      : editingCategory.type === "vocabulary"
                        ? "Ej: Comida"
                        : "Ej: Jerga"
                  }
                  className="w-full px-4 py-3 rounded-xl border-2 border-franol-warm
                             bg-white text-franol-text
                             focus:border-franol-accent-blue focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-franol-text mb-2">
                  {locale === "fr" ? "Couleur" : "Color"}
                </label>
                <input
                  type="color"
                  value={categoryEditForm.color}
                  onChange={(e) =>
                    setCategoryEditForm({
                      ...categoryEditForm,
                      color: e.target.value,
                    })
                  }
                  className="w-full h-12 rounded-xl border-2 border-franol-warm
                             bg-white cursor-pointer
                             focus:border-franol-accent-blue focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-franol-warm">
              <button
                onClick={closeEditCategoryModal}
                className="px-6 py-2 rounded-xl font-medium text-franol-muted
                           hover:bg-franol-sand transition-colors"
              >
                {t("content.cancel")}
              </button>
              <button
                onClick={handleSaveCategory}
                disabled={isSavingCategory}
                className="px-6 py-2 rounded-xl font-medium text-white
                           bg-franol-accent-blue hover:bg-blue-700
                           disabled:opacity-50 disabled:cursor-not-allowed
                           transition-colors flex items-center gap-2"
              >
                {isSavingCategory && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                {t("content.save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmation de suppression de contenu */}
      <ConfirmModal
        isOpen={!!deletingItem}
        onClose={closeDeleteModal}
        onConfirm={confirmDelete}
        title={t("content.deleteTitle")}
        message={t("content.deleteMessage")}
        confirmLabel={t("content.confirmDeleteBtn")}
        cancelLabel={t("content.cancel")}
        isLoading={isDeleting}
        variant="danger"
        preview={
          deletingItem && (
            <>
              <p className="font-medium text-franol-text">
                {deletingItem.type === "vocabulary"
                  ? (deletingItem as VocabularyItem).word_fr
                  : deletingItem.type === "expression"
                    ? (deletingItem as ExpressionItem).expression_fr
                    : (deletingItem as ConjugationItem).infinitive_fr}
              </p>
              <p className="text-sm text-franol-muted">
                {deletingItem.type === "vocabulary"
                  ? (deletingItem as VocabularyItem).word_es
                  : deletingItem.type === "expression"
                    ? (deletingItem as ExpressionItem).expression_es
                    : (deletingItem as ConjugationItem).infinitive_es}
              </p>
            </>
          )
        }
      />

      {/* Modal de confirmation de suppression de catégorie */}
      <ConfirmModal
        isOpen={!!deletingCategory}
        onClose={closeDeleteCategoryModal}
        onConfirm={confirmDeleteCategory}
        title={t("content.deleteTitle")}
        message={t("content.deleteMessage")}
        confirmLabel={t("content.confirmDeleteBtn")}
        cancelLabel={t("content.cancel")}
        isLoading={isDeletingCategory}
        variant="danger"
        preview={
          deletingCategory && (
            <>
              <p className="font-medium text-franol-text">
                {locale === "fr"
                  ? deletingCategory.name_fr
                  : deletingCategory.name_es}
              </p>
              <p className="text-sm text-franol-muted">
                {deletingCategory.type === "vocabulary"
                  ? t("content.types.categories")
                  : t("content.types.contexts")}
              </p>
            </>
          )
        }
      />

      {/* Modal de création de catégorie (depuis le formulaire d'édition) */}
      {showNewCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-franol-warm">
              <h2 className="text-xl font-display font-bold text-franol-text">
                {newCategoryType === "expression"
                  ? t("add.newContext")
                  : t("add.newCategory")}
              </h2>
              <button
                onClick={closeNewCategoryModal}
                className="p-2 rounded-lg text-franol-muted hover:text-franol-text
                           hover:bg-franol-sand transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-franol-text mb-2">
                  {t("add.categoryNameFr")} *
                </label>
                <input
                  type="text"
                  value={newCategoryForm.name_fr}
                  onChange={(e) =>
                    setNewCategoryForm({
                      ...newCategoryForm,
                      name_fr: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 rounded-xl border-2 border-franol-warm
                             bg-white text-franol-text
                             focus:border-franol-accent-blue focus:outline-none transition-colors"
                  placeholder={
                    newCategoryType === "vocabulary"
                      ? locale === "fr"
                        ? "Ex: Nourriture"
                        : "Ej: Nourriture"
                      : locale === "fr"
                        ? "Ex: Argot"
                        : "Ej: Argot"
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-franol-text mb-2">
                  {t("add.categoryNameEs")} *
                </label>
                <input
                  type="text"
                  value={newCategoryForm.name_es}
                  onChange={(e) =>
                    setNewCategoryForm({
                      ...newCategoryForm,
                      name_es: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 rounded-xl border-2 border-franol-warm
                             bg-white text-franol-text
                             focus:border-franol-accent-blue focus:outline-none transition-colors"
                  placeholder={
                    newCategoryType === "vocabulary"
                      ? locale === "fr"
                        ? "Ex: Comida"
                        : "Ej: Comida"
                      : locale === "fr"
                        ? "Ex: Jerga"
                        : "Ej: Jerga"
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-franol-text mb-2">
                  {t("add.categoryColor")}
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={newCategoryForm.color}
                    onChange={(e) =>
                      setNewCategoryForm({
                        ...newCategoryForm,
                        color: e.target.value,
                      })
                    }
                    className="w-16 h-12 rounded-xl border-2 border-franol-warm cursor-pointer"
                  />
                  <input
                    type="text"
                    value={newCategoryForm.color}
                    onChange={(e) =>
                      setNewCategoryForm({
                        ...newCategoryForm,
                        color: e.target.value,
                      })
                    }
                    className="flex-1 px-4 py-3 rounded-xl border-2 border-franol-warm
                               bg-white text-franol-text font-mono text-sm
                               focus:border-franol-accent-blue focus:outline-none transition-colors"
                    placeholder="#10b981"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-franol-warm">
              <button
                onClick={closeNewCategoryModal}
                className="px-6 py-2 rounded-xl font-medium text-franol-muted
                           hover:bg-franol-sand transition-colors"
              >
                {t("content.cancel")}
              </button>
              <button
                onClick={handleCreateNewCategory}
                disabled={
                  isSavingNewCategory ||
                  !newCategoryForm.name_fr ||
                  !newCategoryForm.name_es
                }
                className="px-6 py-2 rounded-xl font-medium text-white
                           bg-franol-accent-blue hover:bg-blue-700
                           disabled:opacity-50 disabled:cursor-not-allowed
                           transition-colors flex items-center gap-2"
              >
                {isSavingNewCategory && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                {newCategoryType === "expression"
                  ? t("add.addContext")
                  : t("add.addCategory")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
