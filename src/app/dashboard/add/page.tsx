"use client";

import { useState, useEffect, KeyboardEvent } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { supabase } from "@/lib/supabase";
import {
  BookOpen,
  MessageSquare,
  Languages,
  History,
  Plus,
  X,
  Loader2,
  Check,
  Pencil,
  Trash2,
  ArrowLeft,
  Database,
} from "lucide-react";
import Link from "next/link";

type Tab = "vocabulary" | "expressions" | "verbs" | "history";

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

type HistoryItem =
  | (VocabularyItem & { type: "vocabulary" })
  | (ExpressionItem & { type: "expression" })
  | (ConjugationItem & { type: "conjugation" });

// Composant pour les tags/chips d'aliases
function AliasInput({
  aliases,
  onAdd,
  onRemove,
  placeholder,
}: {
  aliases: string[];
  onAdd: (alias: string) => void;
  onRemove: (index: number) => void;
  placeholder: string;
}) {
  const [inputValue, setInputValue] = useState("");

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      onAdd(inputValue.trim());
      setInputValue("");
    }
  };

  const handleAdd = () => {
    if (inputValue.trim()) {
      onAdd(inputValue.trim());
      setInputValue("");
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 px-4 py-2 rounded-xl border-2 border-franol-warm
                     bg-white text-franol-text placeholder-franol-muted
                     focus:border-franol-accent-blue focus:outline-none transition-colors"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="px-3 py-2 rounded-xl bg-franol-sand text-franol-text
                     hover:bg-franol-warm transition-colors"
        >
          <Plus size={20} />
        </button>
      </div>
      {aliases.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {aliases.map((alias, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full
                         bg-franol-sand text-franol-text text-sm"
            >
              {alias}
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="hover:text-red-500 transition-colors"
              >
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AddPage() {
  const { locale, t } = useLocale();
  const [activeTab, setActiveTab] = useState<Tab>("vocabulary");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [editingItem, setEditingItem] = useState<HistoryItem | null>(null);

  // États pour la modale de création de catégorie
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryType, setCategoryType] = useState<"vocabulary" | "expression">(
    "vocabulary",
  );
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [categoryForm, setCategoryForm] = useState({
    name_fr: "",
    name_es: "",
    color: "#10b981",
  });

  // États pour le formulaire vocabulaire
  const [vocabForm, setVocabForm] = useState({
    word_fr: "",
    word_es: "",
    aliases_fr: [] as string[],
    aliases_es: [] as string[],
    category: "",
    notes: "",
  });

  // États pour le formulaire expressions
  const [exprForm, setExprForm] = useState({
    expression_fr: "",
    expression_es: "",
    aliases_fr: [] as string[],
    aliases_es: [] as string[],
    context: "",
    notes: "",
  });

  // États pour le formulaire verbes
  const [verbForm, setVerbForm] = useState({
    infinitive_fr: "",
    infinitive_es: "",
    aliases_fr: [] as string[],
    aliases_es: [] as string[],
    group_fr: "",
    group_es: "",
    is_irregular: false,
    notes: "",
  });

  // Charger les catégories
  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from("categories")
        .select("*")
        .order("name_fr");
      if (data) setCategories(data);
    };
    fetchCategories();
  }, []);

  // Charger l'historique
  useEffect(() => {
    if (activeTab === "history") {
      fetchHistory();
    }
  }, [activeTab]);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const [vocabRes, exprRes, conjRes] = await Promise.all([
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
      ]);

      const items: HistoryItem[] = [
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

      setHistory(items);
    } catch {
      setError(t("common.error"));
    } finally {
      setIsLoading(false);
    }
  };

  const resetForms = () => {
    setVocabForm({
      word_fr: "",
      word_es: "",
      aliases_fr: [],
      aliases_es: [],
      category: "",
      notes: "",
    });
    setExprForm({
      expression_fr: "",
      expression_es: "",
      aliases_fr: [],
      aliases_es: [],
      context: "",
      notes: "",
    });
    setVerbForm({
      infinitive_fr: "",
      infinitive_es: "",
      aliases_fr: [],
      aliases_es: [],
      group_fr: "",
      group_es: "",
      is_irregular: false,
      notes: "",
    });
  };

  const showSuccess = () => {
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
  };

  // Ouvrir la modale de création de catégorie
  const openCategoryModal = (type: "vocabulary" | "expression") => {
    setCategoryType(type);
    setCategoryForm({ name_fr: "", name_es: "", color: "#10b981" });
    setShowCategoryModal(true);
  };

  // Fermer la modale de création de catégorie
  const closeCategoryModal = () => {
    setShowCategoryModal(false);
    setCategoryForm({ name_fr: "", name_es: "", color: "#10b981" });
  };

  // Créer une nouvelle catégorie
  const handleCreateCategory = async () => {
    if (!categoryForm.name_fr || !categoryForm.name_es) return;
    setIsSavingCategory(true);

    try {
      const { data, error: err } = await supabase
        .from("categories")
        .insert({
          name_fr: categoryForm.name_fr,
          name_es: categoryForm.name_es,
          type: categoryType,
          color: categoryForm.color,
          icon: "tag",
        })
        .select()
        .single();

      if (err) throw err;

      // Ajouter la nouvelle catégorie à la liste
      setCategories((prev) => [...prev, data]);

      // Sélectionner automatiquement la nouvelle catégorie
      if (categoryType === "vocabulary") {
        setVocabForm({ ...vocabForm, category: data.id });
      } else {
        setExprForm({ ...exprForm, context: data.id });
      }

      closeCategoryModal();
      showSuccess();
    } catch {
      setError(t("common.error"));
    } finally {
      setIsSavingCategory(false);
    }
  };

  // Soumission vocabulaire
  const handleVocabSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const { error: err } = await supabase.from("vocabulary").insert({
        word_fr: vocabForm.word_fr,
        word_es: vocabForm.word_es,
        aliases_fr: vocabForm.aliases_fr,
        aliases_es: vocabForm.aliases_es,
        category: vocabForm.category || null,
        notes: vocabForm.notes || null,
      });

      if (err) throw err;
      resetForms();
      showSuccess();
    } catch {
      setError(t("common.error"));
    } finally {
      setIsLoading(false);
    }
  };

  // Soumission expressions
  const handleExprSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const { error: err } = await supabase.from("expressions").insert({
        expression_fr: exprForm.expression_fr,
        expression_es: exprForm.expression_es,
        aliases_fr: exprForm.aliases_fr,
        aliases_es: exprForm.aliases_es,
        context: exprForm.context || null,
        notes: exprForm.notes || null,
      });

      if (err) throw err;
      resetForms();
      showSuccess();
    } catch {
      setError(t("common.error"));
    } finally {
      setIsLoading(false);
    }
  };

  // Soumission verbes
  const handleVerbSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const { error: err } = await supabase.from("conjugations").insert({
        infinitive_fr: verbForm.infinitive_fr,
        infinitive_es: verbForm.infinitive_es,
        aliases_fr: verbForm.aliases_fr,
        aliases_es: verbForm.aliases_es,
        group_fr: verbForm.group_fr || null,
        group_es: verbForm.group_es || null,
        is_irregular: verbForm.is_irregular,
        notes: verbForm.notes || null,
      });

      if (err) throw err;
      resetForms();
      showSuccess();
    } catch {
      setError(t("common.error"));
    } finally {
      setIsLoading(false);
    }
  };

  // Supprimer un élément
  const handleDelete = async (item: HistoryItem) => {
    if (!confirm(t("add.confirmDelete"))) return;

    setIsLoading(true);
    try {
      const table =
        item.type === "vocabulary"
          ? "vocabulary"
          : item.type === "expression"
            ? "expressions"
            : "conjugations";

      const { error: err } = await supabase
        .from(table)
        .delete()
        .eq("id", item.id);
      if (err) throw err;

      setHistory(history.filter((h) => h.id !== item.id));
    } catch {
      setError(t("common.error"));
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: "vocabulary" as Tab, icon: BookOpen, labelKey: "vocabulary" },
    { id: "expressions" as Tab, icon: MessageSquare, labelKey: "expressions" },
    { id: "verbs" as Tab, icon: Languages, labelKey: "verbs" },
    { id: "history" as Tab, icon: History, labelKey: "history" },
  ];

  const groupHistoryByDate = (items: HistoryItem[]) => {
    const groups: { [key: string]: HistoryItem[] } = {};
    items.forEach((item) => {
      const date = new Date(item.created_at).toLocaleDateString(
        locale === "fr" ? "fr-FR" : "es-ES",
        {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        },
      );
      if (!groups[date]) groups[date] = [];
      groups[date].push(item);
    });
    return groups;
  };

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <header className="mb-6 animate-fade-in">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-franol-muted hover:text-franol-text
                     transition-colors mb-4"
        >
          <ArrowLeft size={20} />
          <span className="text-sm">{t("common.back")}</span>
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-franol-text">
              {t("add.title")}
            </h1>
            <p className="mt-1 text-franol-muted">{t("add.subtitle")}</p>
          </div>
          <Link
            href="/dashboard/content"
            className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl
                       bg-franol-sand text-franol-text text-sm font-medium
                       hover:bg-franol-warm transition-colors"
          >
            <Database size={18} />
            {t("add.viewContent")}
          </Link>
        </div>
      </header>

      {/* Lien mobile vers le contenu */}
      <Link
        href="/dashboard/content"
        className="sm:hidden flex items-center justify-center gap-2 mb-4 px-4 py-3 rounded-xl
                   bg-franol-sand text-franol-text text-sm font-medium
                   hover:bg-franol-warm transition-colors animate-fade-in"
      >
        <Database size={18} />
        {t("add.viewContent")}
      </Link>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 animate-slide-up">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm
                         whitespace-nowrap transition-all ${
                           isActive
                             ? "bg-franol-accent-blue text-white"
                             : "bg-white border border-franol-warm text-franol-muted hover:text-franol-text hover:border-franol-accent-blue"
                         }`}
            >
              <Icon size={18} />
              {t(`add.tabs.${tab.labelKey}`)}
            </button>
          );
        })}
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-4 rounded-xl bg-red-50 text-red-600 animate-fade-in">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 rounded-xl bg-emerald-50 text-emerald-600 flex items-center gap-2 animate-fade-in">
          <Check size={20} />
          {t("add.success")}
        </div>
      )}

      {/* Formulaire Vocabulaire */}
      {activeTab === "vocabulary" && (
        <form
          onSubmit={handleVocabSubmit}
          className="space-y-4 animate-fade-in"
        >
          <div className="bg-white rounded-2xl p-6 border border-franol-warm space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-franol-text mb-2">
                  {t("add.wordFr")} *
                </label>
                <input
                  type="text"
                  value={vocabForm.word_fr}
                  onChange={(e) =>
                    setVocabForm({ ...vocabForm, word_fr: e.target.value })
                  }
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
                  value={vocabForm.word_es}
                  onChange={(e) =>
                    setVocabForm({ ...vocabForm, word_es: e.target.value })
                  }
                  required
                  className="w-full px-4 py-3 rounded-xl border-2 border-franol-warm
                             bg-white text-franol-text placeholder-franol-muted
                             focus:border-franol-accent-blue focus:outline-none transition-colors"
                  placeholder={t("add.wordEsPlaceholder")}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-franol-text mb-2">
                {t("add.aliases")}
              </label>
              {locale === "fr" ? (
                <AliasInput
                  aliases={vocabForm.aliases_fr}
                  onAdd={(alias) =>
                    setVocabForm({
                      ...vocabForm,
                      aliases_fr: [...vocabForm.aliases_fr, alias],
                    })
                  }
                  onRemove={(index) =>
                    setVocabForm({
                      ...vocabForm,
                      aliases_fr: vocabForm.aliases_fr.filter(
                        (_, i) => i !== index,
                      ),
                    })
                  }
                  placeholder={t("add.aliasPlaceholderVocab")}
                />
              ) : (
                <AliasInput
                  aliases={vocabForm.aliases_es}
                  onAdd={(alias) =>
                    setVocabForm({
                      ...vocabForm,
                      aliases_es: [...vocabForm.aliases_es, alias],
                    })
                  }
                  onRemove={(index) =>
                    setVocabForm({
                      ...vocabForm,
                      aliases_es: vocabForm.aliases_es.filter(
                        (_, i) => i !== index,
                      ),
                    })
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
                <select
                  value={vocabForm.category}
                  onChange={(e) =>
                    setVocabForm({ ...vocabForm, category: e.target.value })
                  }
                  className="flex-1 px-4 py-3 rounded-xl border-2 border-franol-warm
                             bg-white text-franol-text
                             focus:border-franol-accent-blue focus:outline-none transition-colors"
                >
                  <option value="">{t("add.selectCategory")}</option>
                  {categories
                    .filter((c) => c.type === "vocabulary")
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {locale === "fr" ? cat.name_fr : cat.name_es}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  onClick={() => openCategoryModal("vocabulary")}
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
                value={vocabForm.notes}
                onChange={(e) =>
                  setVocabForm({ ...vocabForm, notes: e.target.value })
                }
                rows={3}
                className="w-full px-4 py-3 rounded-xl border-2 border-franol-warm
                           bg-white text-franol-text placeholder-franol-muted
                           focus:border-franol-accent-blue focus:outline-none transition-colors resize-none"
                placeholder={t("add.notesPlaceholder")}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !vocabForm.word_fr || !vocabForm.word_es}
            className="w-full py-3 px-4 rounded-xl font-medium text-white
                       bg-gradient-to-r from-emerald-500 to-emerald-600
                       hover:from-emerald-600 hover:to-emerald-700
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Plus size={20} />
                {t("add.addVocabulary")}
              </>
            )}
          </button>
        </form>
      )}

      {/* Formulaire Expressions */}
      {activeTab === "expressions" && (
        <form onSubmit={handleExprSubmit} className="space-y-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 border border-franol-warm space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-franol-text mb-2">
                  {t("add.expressionFr")} *
                </label>
                <input
                  type="text"
                  value={exprForm.expression_fr}
                  onChange={(e) =>
                    setExprForm({ ...exprForm, expression_fr: e.target.value })
                  }
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
                  value={exprForm.expression_es}
                  onChange={(e) =>
                    setExprForm({ ...exprForm, expression_es: e.target.value })
                  }
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
              {locale === "fr" ? (
                <AliasInput
                  aliases={exprForm.aliases_fr}
                  onAdd={(alias) =>
                    setExprForm({
                      ...exprForm,
                      aliases_fr: [...exprForm.aliases_fr, alias],
                    })
                  }
                  onRemove={(index) =>
                    setExprForm({
                      ...exprForm,
                      aliases_fr: exprForm.aliases_fr.filter(
                        (_, i) => i !== index,
                      ),
                    })
                  }
                  placeholder={t("add.aliasPlaceholderExpr")}
                />
              ) : (
                <AliasInput
                  aliases={exprForm.aliases_es}
                  onAdd={(alias) =>
                    setExprForm({
                      ...exprForm,
                      aliases_es: [...exprForm.aliases_es, alias],
                    })
                  }
                  onRemove={(index) =>
                    setExprForm({
                      ...exprForm,
                      aliases_es: exprForm.aliases_es.filter(
                        (_, i) => i !== index,
                      ),
                    })
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
                  value={exprForm.context}
                  onChange={(e) =>
                    setExprForm({ ...exprForm, context: e.target.value })
                  }
                  className="flex-1 px-4 py-3 rounded-xl border-2 border-franol-warm
                             bg-white text-franol-text
                             focus:border-franol-accent-blue focus:outline-none transition-colors"
                >
                  <option value="">{t("add.selectContext")}</option>
                  {categories
                    .filter((c) => c.type === "expression")
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {locale === "fr" ? cat.name_fr : cat.name_es}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  onClick={() => openCategoryModal("expression")}
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
                value={exprForm.notes}
                onChange={(e) =>
                  setExprForm({ ...exprForm, notes: e.target.value })
                }
                rows={3}
                className="w-full px-4 py-3 rounded-xl border-2 border-franol-warm
                           bg-white text-franol-text placeholder-franol-muted
                           focus:border-franol-accent-blue focus:outline-none transition-colors resize-none"
                placeholder={t("add.notesPlaceholder")}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={
              isLoading || !exprForm.expression_fr || !exprForm.expression_es
            }
            className="w-full py-3 px-4 rounded-xl font-medium text-white
                       bg-gradient-to-r from-purple-500 to-purple-600
                       hover:from-purple-600 hover:to-purple-700
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Plus size={20} />
                {t("add.addExpression")}
              </>
            )}
          </button>
        </form>
      )}

      {/* Formulaire Verbes */}
      {activeTab === "verbs" && (
        <form onSubmit={handleVerbSubmit} className="space-y-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 border border-franol-warm space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-franol-text mb-2">
                  {t("add.infinitiveFr")} *
                </label>
                <input
                  type="text"
                  value={verbForm.infinitive_fr}
                  onChange={(e) =>
                    setVerbForm({ ...verbForm, infinitive_fr: e.target.value })
                  }
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
                  value={verbForm.infinitive_es}
                  onChange={(e) =>
                    setVerbForm({ ...verbForm, infinitive_es: e.target.value })
                  }
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
              {locale === "fr" ? (
                <AliasInput
                  aliases={verbForm.aliases_fr}
                  onAdd={(alias) =>
                    setVerbForm({
                      ...verbForm,
                      aliases_fr: [...verbForm.aliases_fr, alias],
                    })
                  }
                  onRemove={(index) =>
                    setVerbForm({
                      ...verbForm,
                      aliases_fr: verbForm.aliases_fr.filter(
                        (_, i) => i !== index,
                      ),
                    })
                  }
                  placeholder={t("add.aliasPlaceholderVerb")}
                />
              ) : (
                <AliasInput
                  aliases={verbForm.aliases_es}
                  onAdd={(alias) =>
                    setVerbForm({
                      ...verbForm,
                      aliases_es: [...verbForm.aliases_es, alias],
                    })
                  }
                  onRemove={(index) =>
                    setVerbForm({
                      ...verbForm,
                      aliases_es: verbForm.aliases_es.filter(
                        (_, i) => i !== index,
                      ),
                    })
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
                  value={verbForm.group_fr}
                  onChange={(e) =>
                    setVerbForm({ ...verbForm, group_fr: e.target.value })
                  }
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
                  value={verbForm.group_es}
                  onChange={(e) =>
                    setVerbForm({ ...verbForm, group_es: e.target.value })
                  }
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
                checked={verbForm.is_irregular}
                onChange={(e) =>
                  setVerbForm({ ...verbForm, is_irregular: e.target.checked })
                }
                className="w-5 h-5 rounded border-2 border-franol-warm text-franol-accent-blue
                           focus:ring-franol-accent-blue focus:ring-offset-0"
              />
              <label
                htmlFor="is_irregular"
                className="text-sm font-medium text-franol-text"
              >
                {t("add.isIrregular")}
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-franol-text mb-2">
                {t("add.notes")}
              </label>
              <textarea
                value={verbForm.notes}
                onChange={(e) =>
                  setVerbForm({ ...verbForm, notes: e.target.value })
                }
                rows={3}
                className="w-full px-4 py-3 rounded-xl border-2 border-franol-warm
                           bg-white text-franol-text placeholder-franol-muted
                           focus:border-franol-accent-blue focus:outline-none transition-colors resize-none"
                placeholder={t("add.notesPlaceholder")}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={
              isLoading || !verbForm.infinitive_fr || !verbForm.infinitive_es
            }
            className="w-full py-3 px-4 rounded-xl font-medium text-white
                       bg-gradient-to-r from-blue-500 to-blue-600
                       hover:from-blue-600 hover:to-blue-700
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Plus size={20} />
                {t("add.addVerb")}
              </>
            )}
          </button>
        </form>
      )}

      {/* Historique */}
      {activeTab === "history" && (
        <div className="space-y-6 animate-fade-in">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-franol-muted" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12 text-franol-muted">
              {t("add.noHistory")}
            </div>
          ) : (
            Object.entries(groupHistoryByDate(history)).map(([date, items]) => (
              <div key={date}>
                <h3 className="text-sm font-medium text-franol-muted mb-3 capitalize">
                  {date}
                </h3>
                <div className="space-y-2">
                  {items.map((item) => (
                    <div
                      key={`${item.type}-${item.id}`}
                      className="bg-white rounded-xl p-4 border border-franol-warm
                                 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`p-2 rounded-lg ${
                            item.type === "vocabulary"
                              ? "bg-emerald-100 text-emerald-600"
                              : item.type === "expression"
                                ? "bg-purple-100 text-purple-600"
                                : "bg-blue-100 text-blue-600"
                          }`}
                        >
                          {item.type === "vocabulary" && <BookOpen size={16} />}
                          {item.type === "expression" && (
                            <MessageSquare size={16} />
                          )}
                          {item.type === "conjugation" && (
                            <Languages size={16} />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-franol-text truncate">
                            {item.type === "vocabulary"
                              ? (item as VocabularyItem).word_fr
                              : item.type === "expression"
                                ? (item as ExpressionItem).expression_fr
                                : (item as ConjugationItem).infinitive_fr}
                          </p>
                          <p className="text-sm text-franol-muted truncate">
                            {item.type === "vocabulary"
                              ? (item as VocabularyItem).word_es
                              : item.type === "expression"
                                ? (item as ExpressionItem).expression_es
                                : (item as ConjugationItem).infinitive_es}
                          </p>
                          {/* Afficher la catégorie/contexte */}
                          {((item.type === "vocabulary" &&
                            (item as VocabularyItem).category) ||
                            (item.type === "expression" &&
                              (item as ExpressionItem).context)) && (
                            <div className="mt-1">
                              {(() => {
                                const categoryId =
                                  item.type === "vocabulary"
                                    ? (item as VocabularyItem).category
                                    : (item as ExpressionItem).context;
                                const category = categories.find(
                                  (c) => c.id === categoryId,
                                );
                                if (!category) return null;
                                return (
                                  <span
                                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                                    style={{
                                      backgroundColor: `${category.color}20`,
                                      color: category.color,
                                    }}
                                  >
                                    {locale === "fr"
                                      ? category.name_fr
                                      : category.name_es}
                                  </span>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleDelete(item)}
                          className="p-2 rounded-lg text-franol-muted hover:text-red-500
                                     hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal de création de catégorie */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md">
            {/* Header modal */}
            <div className="flex items-center justify-between p-6 border-b border-franol-warm">
              <h2 className="text-xl font-display font-bold text-franol-text">
                {categoryType === "vocabulary"
                  ? t("add.newCategory")
                  : t("add.newContext")}
              </h2>
              <button
                onClick={closeCategoryModal}
                className="p-2 rounded-lg text-franol-muted hover:text-franol-text
                           hover:bg-franol-sand transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Contenu modal */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-franol-text mb-2">
                  {t("add.categoryNameFr")} *
                </label>
                <input
                  type="text"
                  value={categoryForm.name_fr}
                  onChange={(e) =>
                    setCategoryForm({
                      ...categoryForm,
                      name_fr: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 rounded-xl border-2 border-franol-warm
                             bg-white text-franol-text
                             focus:border-franol-accent-blue focus:outline-none transition-colors"
                  placeholder={
                    categoryType === "vocabulary"
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
                  value={categoryForm.name_es}
                  onChange={(e) =>
                    setCategoryForm({
                      ...categoryForm,
                      name_es: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 rounded-xl border-2 border-franol-warm
                             bg-white text-franol-text
                             focus:border-franol-accent-blue focus:outline-none transition-colors"
                  placeholder={
                    categoryType === "vocabulary"
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
                    value={categoryForm.color}
                    onChange={(e) =>
                      setCategoryForm({
                        ...categoryForm,
                        color: e.target.value,
                      })
                    }
                    className="w-16 h-12 rounded-xl border-2 border-franol-warm cursor-pointer"
                  />
                  <input
                    type="text"
                    value={categoryForm.color}
                    onChange={(e) =>
                      setCategoryForm({
                        ...categoryForm,
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

            {/* Footer modal */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-franol-warm">
              <button
                onClick={closeCategoryModal}
                className="px-6 py-2 rounded-xl font-medium text-franol-muted
                           hover:bg-franol-sand transition-colors"
              >
                {t("content.cancel")}
              </button>
              <button
                onClick={handleCreateCategory}
                disabled={
                  isSavingCategory ||
                  !categoryForm.name_fr ||
                  !categoryForm.name_es
                }
                className="px-6 py-2 rounded-xl font-medium text-white
                           bg-franol-accent-blue hover:bg-blue-700
                           disabled:opacity-50 disabled:cursor-not-allowed
                           transition-colors flex items-center gap-2"
              >
                {isSavingCategory && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                {categoryType === "vocabulary"
                  ? t("add.addCategory")
                  : t("add.addContext")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
