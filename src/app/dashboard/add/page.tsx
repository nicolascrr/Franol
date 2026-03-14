"use client";

import { useState, useEffect } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { createClient } from "@/lib/supabase/client";
import { getLangValue } from "@/lib/lang";
import { checkDuplicate, type DuplicateMatch } from "@/lib/duplicates";
import { VocabularyForm } from "@/components/add/VocabularyForm";
import { ExpressionForm } from "@/components/add/ExpressionForm";
import { VerbForm } from "@/components/add/VerbForm";
import { DuplicateWarning } from "@/components/add/DuplicateWarning";
import {
  BookOpen,
  MessageSquare,
  Languages,
  History,
  Plus,
  X,
  Loader2,
  Check,
  Trash2,
  ArrowLeft,
  Database,
} from "lucide-react";
import Link from "next/link";
import type {
  Category,
  VocabularyItem,
  ExpressionItem,
  ConjugationItem,
  HistoryItem,
} from "@/types";

const supabase = createClient();

type Tab = "vocabulary" | "expressions" | "verbs" | "history";

export default function AddPage() {
  const { locale, t, sourceLang } = useLocale();
  const [activeTab, setActiveTab] = useState<Tab>("vocabulary");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [editingItem, setEditingItem] = useState<HistoryItem | null>(null);

  // États pour la détection de doublons
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [forceAdd, setForceAdd] = useState(false);

  // États pour la modale de création de catégorie
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryType, setCategoryType] = useState<
    "vocabulary" | "expression" | "conjugation"
  >("vocabulary");
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
    article_fr: "",
    article_es: "",
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
    is_reflexive_fr: false,
    is_reflexive_es: false,
    category: "",
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
      article_fr: "",
      article_es: "",
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
      is_reflexive_fr: false,
      is_reflexive_es: false,
      category: "",
      notes: "",
    });
  };

  const showSuccess = () => {
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
  };

  // Helper function to check for duplicates
  const checkDuplicate = async (
    type: "vocabulary" | "expression" | "conjugation",
    wordFr: string,
    wordEs: string,
    aliasesFr: string[],
    aliasesEs: string[],
  ): Promise<DuplicateMatch[]> => {
    const matches: DuplicateMatch[] = [];

    // Normalize to lowercase for comparison
    const normalizedWordFr = wordFr.toLowerCase().trim();
    const normalizedWordEs = wordEs.toLowerCase().trim();
    const normalizedAliasesFr = aliasesFr.map((a) => a.toLowerCase().trim());
    const normalizedAliasesEs = aliasesEs.map((a) => a.toLowerCase().trim());

    try {
      if (type === "vocabulary") {
        const { data } = await supabase.from("vocabulary").select("*");

        if (data) {
          data.forEach((item) => {
            // Check main word fields
            if (item.word_fr.toLowerCase().trim() === normalizedWordFr) {
              matches.push({
                id: item.id,
                word_fr: item.word_fr,
                word_es: item.word_es,
                matchedField: "word_fr",
                matchedValue: item.word_fr,
              });
            } else if (
              item.word_es.toLowerCase().trim() === normalizedWordEs
            ) {
              matches.push({
                id: item.id,
                word_fr: item.word_fr,
                word_es: item.word_es,
                matchedField: "word_es",
                matchedValue: item.word_es,
              });
            }

            // Check aliases
            const itemAliasesFr = (item.aliases_fr || []).map((a: string) =>
              a.toLowerCase().trim(),
            );
            const itemAliasesEs = (item.aliases_es || []).map((a: string) =>
              a.toLowerCase().trim(),
            );

            // Check if main word matches any alias
            if (itemAliasesFr.includes(normalizedWordFr)) {
              matches.push({
                id: item.id,
                word_fr: item.word_fr,
                word_es: item.word_es,
                matchedField: "aliases_fr",
                matchedValue: normalizedWordFr,
              });
            }
            if (itemAliasesEs.includes(normalizedWordEs)) {
              matches.push({
                id: item.id,
                word_fr: item.word_fr,
                word_es: item.word_es,
                matchedField: "aliases_es",
                matchedValue: normalizedWordEs,
              });
            }

            // Check if any new alias matches existing word or aliases
            normalizedAliasesFr.forEach((alias) => {
              if (
                item.word_fr.toLowerCase().trim() === alias ||
                itemAliasesFr.includes(alias)
              ) {
                matches.push({
                  id: item.id,
                  word_fr: item.word_fr,
                  word_es: item.word_es,
                  matchedField: "aliases_fr",
                  matchedValue: alias,
                });
              }
            });

            normalizedAliasesEs.forEach((alias) => {
              if (
                item.word_es.toLowerCase().trim() === alias ||
                itemAliasesEs.includes(alias)
              ) {
                matches.push({
                  id: item.id,
                  word_fr: item.word_fr,
                  word_es: item.word_es,
                  matchedField: "aliases_es",
                  matchedValue: alias,
                });
              }
            });
          });
        }
      } else if (type === "expression") {
        const { data } = await supabase.from("expressions").select("*");

        if (data) {
          data.forEach((item) => {
            // Check main expression fields
            if (
              item.expression_fr.toLowerCase().trim() === normalizedWordFr
            ) {
              matches.push({
                id: item.id,
                expression_fr: item.expression_fr,
                expression_es: item.expression_es,
                matchedField: "expression_fr",
                matchedValue: item.expression_fr,
              });
            } else if (
              item.expression_es.toLowerCase().trim() === normalizedWordEs
            ) {
              matches.push({
                id: item.id,
                expression_fr: item.expression_fr,
                expression_es: item.expression_es,
                matchedField: "expression_es",
                matchedValue: item.expression_es,
              });
            }

            // Check aliases
            const itemAliasesFr = (item.aliases_fr || []).map((a: string) =>
              a.toLowerCase().trim(),
            );
            const itemAliasesEs = (item.aliases_es || []).map((a: string) =>
              a.toLowerCase().trim(),
            );

            // Check if main expression matches any alias
            if (itemAliasesFr.includes(normalizedWordFr)) {
              matches.push({
                id: item.id,
                expression_fr: item.expression_fr,
                expression_es: item.expression_es,
                matchedField: "aliases_fr",
                matchedValue: normalizedWordFr,
              });
            }
            if (itemAliasesEs.includes(normalizedWordEs)) {
              matches.push({
                id: item.id,
                expression_fr: item.expression_fr,
                expression_es: item.expression_es,
                matchedField: "aliases_es",
                matchedValue: normalizedWordEs,
              });
            }

            // Check if any new alias matches existing expression or aliases
            normalizedAliasesFr.forEach((alias) => {
              if (
                item.expression_fr.toLowerCase().trim() === alias ||
                itemAliasesFr.includes(alias)
              ) {
                matches.push({
                  id: item.id,
                  expression_fr: item.expression_fr,
                  expression_es: item.expression_es,
                  matchedField: "aliases_fr",
                  matchedValue: alias,
                });
              }
            });

            normalizedAliasesEs.forEach((alias) => {
              if (
                item.expression_es.toLowerCase().trim() === alias ||
                itemAliasesEs.includes(alias)
              ) {
                matches.push({
                  id: item.id,
                  expression_fr: item.expression_fr,
                  expression_es: item.expression_es,
                  matchedField: "aliases_es",
                  matchedValue: alias,
                });
              }
            });
          });
        }
      } else if (type === "conjugation") {
        const { data } = await supabase.from("conjugations").select("*");

        if (data) {
          data.forEach((item) => {
            // Check main infinitive fields
            if (
              item.infinitive_fr.toLowerCase().trim() === normalizedWordFr
            ) {
              matches.push({
                id: item.id,
                infinitive_fr: item.infinitive_fr,
                infinitive_es: item.infinitive_es,
                matchedField: "infinitive_fr",
                matchedValue: item.infinitive_fr,
              });
            } else if (
              item.infinitive_es.toLowerCase().trim() === normalizedWordEs
            ) {
              matches.push({
                id: item.id,
                infinitive_fr: item.infinitive_fr,
                infinitive_es: item.infinitive_es,
                matchedField: "infinitive_es",
                matchedValue: item.infinitive_es,
              });
            }

            // Check aliases
            const itemAliasesFr = (item.aliases_fr || []).map((a: string) =>
              a.toLowerCase().trim(),
            );
            const itemAliasesEs = (item.aliases_es || []).map((a: string) =>
              a.toLowerCase().trim(),
            );

            // Check if main infinitive matches any alias
            if (itemAliasesFr.includes(normalizedWordFr)) {
              matches.push({
                id: item.id,
                infinitive_fr: item.infinitive_fr,
                infinitive_es: item.infinitive_es,
                matchedField: "aliases_fr",
                matchedValue: normalizedWordFr,
              });
            }
            if (itemAliasesEs.includes(normalizedWordEs)) {
              matches.push({
                id: item.id,
                infinitive_fr: item.infinitive_fr,
                infinitive_es: item.infinitive_es,
                matchedField: "aliases_es",
                matchedValue: normalizedWordEs,
              });
            }

            // Check if any new alias matches existing infinitive or aliases
            normalizedAliasesFr.forEach((alias) => {
              if (
                item.infinitive_fr.toLowerCase().trim() === alias ||
                itemAliasesFr.includes(alias)
              ) {
                matches.push({
                  id: item.id,
                  infinitive_fr: item.infinitive_fr,
                  infinitive_es: item.infinitive_es,
                  matchedField: "aliases_fr",
                  matchedValue: alias,
                });
              }
            });

            normalizedAliasesEs.forEach((alias) => {
              if (
                item.infinitive_es.toLowerCase().trim() === alias ||
                itemAliasesEs.includes(alias)
              ) {
                matches.push({
                  id: item.id,
                  infinitive_fr: item.infinitive_fr,
                  infinitive_es: item.infinitive_es,
                  matchedField: "aliases_es",
                  matchedValue: alias,
                });
              }
            });
          });
        }
      }
    } catch (err) {
      console.error("Error checking duplicates:", err);
    }

    // Remove duplicate matches (same id)
    const uniqueMatches = matches.filter(
      (match, index, self) => index === self.findIndex((m) => m.id === match.id),
    );

    return uniqueMatches;
  };

  // Ouvrir la modale de création de catégorie
  const openCategoryModal = (
    type: "vocabulary" | "expression" | "conjugation",
  ) => {
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
          // Verbs share vocabulary-type categories
          type: categoryType === "conjugation" ? "vocabulary" : categoryType,
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
      } else if (categoryType === "expression") {
        setExprForm({ ...exprForm, context: data.id });
      } else {
        setVerbForm({ ...verbForm, category: data.id });
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
      // Check for duplicates if not forcing add
      if (!forceAdd) {
        const foundDuplicates = await checkDuplicate(
          "vocabulary",
          vocabForm.word_fr,
          vocabForm.word_es,
          vocabForm.aliases_fr,
          vocabForm.aliases_es,
        );

        if (foundDuplicates.length > 0) {
          setDuplicates(foundDuplicates);
          setShowDuplicateWarning(true);
          setIsLoading(false);
          return;
        }
      }

      const { error: err } = await supabase.from("vocabulary").insert({
        word_fr: vocabForm.word_fr,
        word_es: vocabForm.word_es,
        article_fr: vocabForm.article_fr || null,
        article_es: vocabForm.article_es || null,
        aliases_fr: vocabForm.aliases_fr,
        aliases_es: vocabForm.aliases_es,
        category: vocabForm.category || null,
        notes: vocabForm.notes || null,
      });

      if (err) throw err;
      resetForms();
      setForceAdd(false);
      setShowDuplicateWarning(false);
      setDuplicates([]);
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
      // Check for duplicates if not forcing add
      if (!forceAdd) {
        const foundDuplicates = await checkDuplicate(
          "expression",
          exprForm.expression_fr,
          exprForm.expression_es,
          exprForm.aliases_fr,
          exprForm.aliases_es,
        );

        if (foundDuplicates.length > 0) {
          setDuplicates(foundDuplicates);
          setShowDuplicateWarning(true);
          setIsLoading(false);
          return;
        }
      }

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
      setForceAdd(false);
      setShowDuplicateWarning(false);
      setDuplicates([]);
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
      // Check for duplicates if not forcing add
      if (!forceAdd) {
        const foundDuplicates = await checkDuplicate(
          "conjugation",
          verbForm.infinitive_fr,
          verbForm.infinitive_es,
          verbForm.aliases_fr,
          verbForm.aliases_es,
        );

        if (foundDuplicates.length > 0) {
          setDuplicates(foundDuplicates);
          setShowDuplicateWarning(true);
          setIsLoading(false);
          return;
        }
      }

      const { error: err } = await supabase.from("conjugations").insert({
        infinitive_fr: verbForm.infinitive_fr,
        infinitive_es: verbForm.infinitive_es,
        aliases_fr: verbForm.aliases_fr,
        aliases_es: verbForm.aliases_es,
        group_fr: verbForm.group_fr || null,
        group_es: verbForm.group_es || null,
        is_irregular: verbForm.is_irregular,
        is_reflexive_fr: verbForm.is_reflexive_fr,
        is_reflexive_es: verbForm.is_reflexive_es,
        category: verbForm.category || null,
        notes: verbForm.notes || null,
      });

      if (err) throw err;
      resetForms();
      setForceAdd(false);
      setShowDuplicateWarning(false);
      setDuplicates([]);
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
        sourceLang === "fr" ? "fr-FR" : "es-ES",
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
        <VocabularyForm
          form={vocabForm}
          categories={categories}
          sourceLang={sourceLang}
          isLoading={isLoading}
          onSubmit={handleVocabSubmit}
          onFieldChange={(field, value) =>
            setVocabForm({ ...vocabForm, [field]: value })
          }
          onOpenCategoryModal={() => openCategoryModal("vocabulary")}
          beforeSubmit={
            showDuplicateWarning &&
            duplicates.length > 0 && (
              <DuplicateWarning
                duplicates={duplicates}
                onCancel={() => {
                  setShowDuplicateWarning(false);
                  setDuplicates([]);
                  setForceAdd(false);
                }}
                onForceAdd={() => {
                  setForceAdd(true);
                  setShowDuplicateWarning(false);
                  const form = document.querySelector("form");
                  if (form) {
                    form.dispatchEvent(
                      new Event("submit", { cancelable: true, bubbles: true }),
                    );
                  }
                }}
              />
            )
          }
        />
      )}

      {/* Formulaire Expressions */}
      {activeTab === "expressions" && (
        <ExpressionForm
          form={exprForm}
          categories={categories}
          sourceLang={sourceLang}
          isLoading={isLoading}
          onSubmit={handleExprSubmit}
          onFieldChange={(field, value) =>
            setExprForm({ ...exprForm, [field]: value })
          }
          onOpenCategoryModal={() => openCategoryModal("expression")}
          beforeSubmit={
            showDuplicateWarning &&
            duplicates.length > 0 && (
              <DuplicateWarning
                duplicates={duplicates}
                onCancel={() => {
                  setShowDuplicateWarning(false);
                  setDuplicates([]);
                  setForceAdd(false);
                }}
                onForceAdd={() => {
                  setForceAdd(true);
                  setShowDuplicateWarning(false);
                  const form = document.querySelector("form");
                  if (form) {
                    form.dispatchEvent(
                      new Event("submit", { cancelable: true, bubbles: true }),
                    );
                  }
                }}
              />
            )
          }
        />
      )}

      {/* Formulaire Verbes */}
      {activeTab === "verbs" && (
        <VerbForm
          form={verbForm}
          categories={categories}
          sourceLang={sourceLang}
          isLoading={isLoading}
          onSubmit={handleVerbSubmit}
          onFieldChange={(field, value) =>
            setVerbForm({ ...verbForm, [field]: value })
          }
          onOpenCategoryModal={() => openCategoryModal("conjugation")}
          beforeSubmit={
            showDuplicateWarning &&
            duplicates.length > 0 && (
              <DuplicateWarning
                duplicates={duplicates}
                onCancel={() => {
                  setShowDuplicateWarning(false);
                  setDuplicates([]);
                  setForceAdd(false);
                }}
                onForceAdd={() => {
                  setForceAdd(true);
                  setShowDuplicateWarning(false);
                  const form = document.querySelector("form");
                  if (form) {
                    form.dispatchEvent(
                      new Event("submit", { cancelable: true, bubbles: true }),
                    );
                  }
                }}
              />
            )
          }
        />
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
                                    {getLangValue(category, "name", sourceLang)}
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
                  : categoryType === "expression"
                    ? t("add.newContext")
                    : t("add.newCategory")}
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
                      ? sourceLang === "fr"
                        ? "Ex: Nourriture"
                        : "Ej: Nourriture"
                      : sourceLang === "fr"
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
                      ? sourceLang === "fr"
                        ? "Ex: Comida"
                        : "Ej: Comida"
                      : sourceLang === "fr"
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
                {categoryType === "vocabulary" || categoryType === "conjugation"
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
