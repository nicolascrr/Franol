"use client";

import { useState, useEffect, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/contexts/LocaleContext";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();
import {
  saveQuizResult,
  getScoreEmoji,
  formatDuration,
  type QuizConfig,
  type QuizResult,
  type QuizQuestion,
} from "@/lib/quiz";
import {
  Loader2,
  RotateCcw,
  RefreshCw,
  Plus,
  Home,
  Clock,
  Target,
  X,
  Check,
  Sparkles,
  BookPlus,
  ChevronDown,
  ChevronUp,
  Trash2,
} from "lucide-react";

interface Category {
  id: string;
  name_fr: string;
  name_es: string;
  type: string;
}

interface VocabToAdd {
  id: string;
  wordFr: string;
  wordEs: string;
  aliasesFr: string[];
  aliasesEs: string[];
  category: string;
  notes: string;
  selected: boolean;
  type: "vocabulary" | "expression" | "conjugation";
  // Verb-specific fields
  groupFr: string;
  groupEs: string;
  isIrregular: boolean;
}

// Composant AliasInput (comme dans la page add)
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
          className="flex-1 px-3 py-2 rounded-lg border border-franol-warm
                     bg-white text-sm text-franol-text placeholder-franol-muted
                     focus:border-orange-400 focus:outline-none transition-colors"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="px-2.5 py-2 rounded-lg bg-franol-sand text-franol-text
                     hover:bg-franol-warm transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>
      {aliases.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {aliases.map((alias, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full
                         bg-franol-sand text-franol-text text-xs"
            >
              {alias}
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="hover:text-red-500 transition-colors"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Tente de deviner la catégorie la plus pertinente à partir du prompt du quiz
 */
function guessCategory(
  prompt: string,
  categories: Category[],
  locale: string,
): string {
  if (!prompt || categories.length === 0) return "";
  const lower = prompt.toLowerCase();

  for (const cat of categories) {
    const nameFr = cat.name_fr.toLowerCase();
    const nameEs = cat.name_es.toLowerCase();
    // Match si le nom de la catégorie apparaît dans le prompt
    if (lower.includes(nameFr) || lower.includes(nameEs)) {
      return cat.id;
    }
  }

  // Match partiel : si un mot du prompt ressemble à un nom de catégorie
  const promptWords = lower.split(/\s+/);
  for (const cat of categories) {
    const catWords = [
      ...cat.name_fr.toLowerCase().split(/\s+/),
      ...cat.name_es.toLowerCase().split(/\s+/),
    ];
    for (const pw of promptWords) {
      if (pw.length < 3) continue;
      for (const cw of catWords) {
        if (cw.length < 3) continue;
        if (cw.startsWith(pw) || pw.startsWith(cw)) {
          return cat.id;
        }
      }
    }
  }

  return "";
}

export default function ResultsPage() {
  const { t, locale } = useLocale();
  const router = useRouter();

  const [result, setResult] = useState<QuizResult | null>(null);
  const [config, setConfig] = useState<QuizConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Vocabulary addition state
  const [showVocabModal, setShowVocabModal] = useState(false);
  const [vocabToAdd, setVocabToAdd] = useState<VocabToAdd[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [contexts, setContexts] = useState<Category[]>([]);
  const [isAddingVocab, setIsAddingVocab] = useState(false);
  const [vocabAdded, setVocabAdded] = useState(false);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const isDiscoveryMode = config?.mode === "discovery";

  useEffect(() => {
    const loadResults = async () => {
      const resultStr = sessionStorage.getItem("quizResult");
      const configStr = sessionStorage.getItem("quizConfig");

      if (!resultStr || !configStr) {
        router.replace("/dashboard/practice");
        return;
      }

      try {
        const parsedResult = JSON.parse(resultStr) as QuizResult;
        const parsedConfig = JSON.parse(configStr) as QuizConfig;

        setResult(parsedResult);
        setConfig(parsedConfig);

        // Save quiz result to database (non-blocking for vocab extraction)
        setIsSaving(true);
        saveQuizResult(parsedResult, parsedConfig)
          .then(() => setSaved(true))
          .catch((err) => console.error("Error saving result:", err))
          .finally(() => setIsSaving(false));

        // If discovery mode, prepare vocabulary for addition
        if (parsedConfig.mode === "discovery") {
          // Fetch categories
          const [catRes, ctxRes] = await Promise.all([
            supabase.from("categories").select("*").eq("type", "vocabulary"),
            supabase.from("categories").select("*").eq("type", "expression"),
          ]);
          const cats = catRes.data || [];
          const ctxs = ctxRes.data || [];
          setCategories(cats);
          setContexts(ctxs);

          // Smart category guess from prompt
          const guessedCatId = guessCategory(
            parsedConfig.prompt || "",
            cats,
            locale || "fr",
          );
          const guessedCtxId = guessCategory(
            parsedConfig.prompt || "",
            ctxs,
            locale || "fr",
          );

          // Find the conjugation category by name
          const conjugationCat = cats.find(
            (c) =>
              c.name_fr.toLowerCase().includes("conjug") ||
              c.name_es.toLowerCase().includes("conjug"),
          );
          const conjugationCatId = conjugationCat?.id || "";

          const vocab = extractVocabularyFromQuestions(
            parsedResult.questions,
            parsedConfig.direction,
            guessedCatId,
            guessedCtxId,
            conjugationCatId,
          );
          setVocabToAdd(vocab);
        }
      } catch (error) {
        console.error("Error loading results:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadResults();
  }, [router, locale]);

  const extractVocabularyFromQuestions = (
    questions: {
      question: QuizQuestion;
      userAnswer: string;
      isCorrect: boolean;
    }[],
    direction: string,
    defaultCategoryId: string,
    defaultContextId: string,
    conjugationCategoryId: string,
  ): VocabToAdd[] => {
    const vocab: VocabToAdd[] = [];
    const seen = new Set<string>();

    questions.forEach((q, index) => {
      const question = q.question;

      let wordFr = question.wordFr || "";
      let wordEs = question.wordEs || "";

      if (!wordFr || !wordEs) {
        if (direction === "fr-to-es") {
          wordFr = wordFr || question.questionText;
          wordEs = wordEs || question.correctAnswer;
        } else {
          wordEs = wordEs || question.questionText;
          wordFr = wordFr || question.correctAnswer;
        }
      }

      const key = `${wordFr.toLowerCase()}-${wordEs.toLowerCase()}`;
      if (!wordFr || !wordEs || seen.has(key)) return;
      seen.add(key);

      const isExpression = question.type === "expression";
      const isConjugation = question.type === "conjugation";

      let itemType: "vocabulary" | "expression" | "conjugation" = "vocabulary";
      if (isExpression) itemType = "expression";
      else if (isConjugation) itemType = "conjugation";

      let itemCategory = defaultCategoryId;
      if (isExpression) itemCategory = defaultContextId;
      else if (isConjugation) itemCategory = conjugationCategoryId;

      vocab.push({
        id: `vocab-${index}`,
        wordFr,
        wordEs,
        aliasesFr: question.aliasesFr || [],
        aliasesEs: question.aliasesEs || [],
        category: itemCategory,
        notes: "",
        selected: true,
        type: itemType,
        groupFr: "",
        groupEs: "",
        isIrregular: false,
      });
    });

    return vocab;
  };

  const handleToggleVocab = (id: string) => {
    setVocabToAdd((prev) =>
      prev.map((v) => (v.id === id ? { ...v, selected: !v.selected } : v)),
    );
  };

  const handleUpdateVocab = (
    id: string,
    field: keyof VocabToAdd,
    value: string | string[],
  ) => {
    setVocabToAdd((prev) =>
      prev.map((v) => (v.id === id ? { ...v, [field]: value } : v)),
    );
  };

  const handleUpdateVocabType = (
    id: string,
    type: "vocabulary" | "expression" | "conjugation",
  ) => {
    setVocabToAdd((prev) =>
      prev.map((v) => (v.id === id ? { ...v, type } : v)),
    );
  };

  const handleAddAlias = (
    vocabId: string,
    field: "aliasesFr" | "aliasesEs",
    alias: string,
  ) => {
    setVocabToAdd((prev) =>
      prev.map((v) =>
        v.id === vocabId
          ? { ...v, [field]: [...v[field], alias] }
          : v,
      ),
    );
  };

  const handleRemoveAlias = (
    vocabId: string,
    field: "aliasesFr" | "aliasesEs",
    index: number,
  ) => {
    setVocabToAdd((prev) =>
      prev.map((v) =>
        v.id === vocabId
          ? { ...v, [field]: v[field].filter((_, i) => i !== index) }
          : v,
      ),
    );
  };

  const handleRemoveVocab = (id: string) => {
    setVocabToAdd((prev) => prev.filter((v) => v.id !== id));
  };

  const handleSelectAll = () => {
    setVocabToAdd((prev) => prev.map((v) => ({ ...v, selected: true })));
  };

  const handleDeselectAll = () => {
    setVocabToAdd((prev) => prev.map((v) => ({ ...v, selected: false })));
  };

  const handleAddVocabulary = async () => {
    const selectedVocab = vocabToAdd.filter((v) => v.selected);
    if (selectedVocab.length === 0) return;

    setIsAddingVocab(true);

    try {
      const vocabItems = selectedVocab.filter((v) => v.type === "vocabulary");
      const exprItems = selectedVocab.filter((v) => v.type === "expression");
      const conjItems = selectedVocab.filter((v) => v.type === "conjugation");

      if (vocabItems.length > 0) {
        const { error: vocabError } = await supabase.from("vocabulary").insert(
          vocabItems.map((v) => ({
            word_fr: v.wordFr,
            word_es: v.wordEs,
            aliases_fr: v.aliasesFr,
            aliases_es: v.aliasesEs,
            category: v.category || null,
            notes: v.notes || null,
          })),
        );
        if (vocabError) throw vocabError;
      }

      if (exprItems.length > 0) {
        const { error: exprError } = await supabase.from("expressions").insert(
          exprItems.map((v) => ({
            expression_fr: v.wordFr,
            expression_es: v.wordEs,
            aliases_fr: v.aliasesFr,
            aliases_es: v.aliasesEs,
            context: v.category || null,
            notes: v.notes || null,
          })),
        );
        if (exprError) throw exprError;
      }

      if (conjItems.length > 0) {
        const { error: conjError } = await supabase
          .from("conjugations")
          .insert(
            conjItems.map((v) => ({
              infinitive_fr: v.wordFr,
              infinitive_es: v.wordEs,
              aliases_fr: v.aliasesFr,
              aliases_es: v.aliasesEs,
              group_fr: v.groupFr || null,
              group_es: v.groupEs || null,
              is_irregular: v.isIrregular,
              notes: v.notes || null,
            })),
          );
        if (conjError) throw conjError;
      }

      setVocabAdded(true);
      setVocabToAdd((prev) => prev.filter((v) => !v.selected));
    } catch (error) {
      console.error("Error adding vocabulary:", error);
    } finally {
      setIsAddingVocab(false);
    }
  };

  const handleRetry = () => {
    sessionStorage.removeItem("quizResult");

    // Remettre le savedQuiz à la question 0 pour rejouer depuis le début
    try {
      const saved = localStorage.getItem("savedQuiz");
      if (saved) {
        const data = JSON.parse(saved);
        data.currentIndex = 0;
        data.answers = [];
        localStorage.setItem("savedQuiz", JSON.stringify(data));
      }
    } catch {
      // Ignore
    }

    router.push("/dashboard/practice/quiz");
  };

  const handleNewQuestions = () => {
    if (result) {
      const usedItems: string[] = [];
      result.questions.forEach((q) => {
        const question = q.question;
        if (question.wordFr) usedItems.push(question.wordFr);
        if (question.wordEs) usedItems.push(question.wordEs);
        if (question.correctAnswer) usedItems.push(question.correctAnswer);
      });

      const existingExcluded = sessionStorage.getItem("excludedWords");
      const existingWords: string[] = existingExcluded
        ? JSON.parse(existingExcluded)
        : [];

      const allWords = [
        ...existingWords,
        ...usedItems.map((w) => w.toLowerCase()),
      ];
      const uniqueWords = allWords.filter(
        (word, index) => allWords.indexOf(word) === index,
      );

      sessionStorage.setItem(
        "excludedWords",
        JSON.stringify(uniqueWords.slice(-100)),
      );
    }

    sessionStorage.removeItem("quizResult");
    sessionStorage.removeItem("cachedQuizQuestions");
    localStorage.removeItem("savedQuiz");
    sessionStorage.setItem("forceRegenerate", "true");
    router.push("/dashboard/practice/quiz");
  };

  const handleNewQuiz = () => {
    sessionStorage.removeItem("quizResult");
    sessionStorage.removeItem("quizConfig");
    sessionStorage.removeItem("discoveryPrompt");
    sessionStorage.removeItem("excludedWords");
    sessionStorage.removeItem("cachedQuizQuestions");
    localStorage.removeItem("savedQuiz");
    router.push("/dashboard/practice");
  };

  const handleBackToHome = () => {
    sessionStorage.removeItem("quizResult");
    sessionStorage.removeItem("quizConfig");
    sessionStorage.removeItem("discoveryPrompt");
    sessionStorage.removeItem("excludedWords");
    localStorage.removeItem("savedQuiz");
    router.push("/dashboard");
  };

  if (isLoading || !result) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6">
        <Loader2 className="w-12 h-12 animate-spin text-franol-accent-blue mb-4" />
        <p className="text-franol-muted">{t("common.loading")}</p>
      </div>
    );
  }

  const emoji = getScoreEmoji(result.scorePercentage);
  const errors = result.questions.filter((q) => !q.isCorrect);
  const selectedCount = vocabToAdd.filter((v) => v.selected).length;

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto">
      {/* Vocabulary Addition Modal */}
      {showVocabModal && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 animate-fade-in overflow-y-auto">
          <div className="bg-franol-cream w-full max-w-2xl min-h-screen sm:min-h-0 sm:my-8 sm:rounded-2xl sm:border sm:border-franol-warm animate-slide-up">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-200 p-4 sm:rounded-t-2xl z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <BookPlus size={20} className="text-orange-600" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-franol-text">
                      {t("practice.results.addVocab")}
                    </h2>
                    <p className="text-sm text-franol-muted">
                      {vocabToAdd.length} {t("practice.results.wordsAvailable")}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowVocabModal(false)}
                  className="p-2 text-franol-muted hover:text-franol-text
                            hover:bg-orange-100 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Selection controls */}
              <div className="flex items-center justify-between mt-3">
                <span className="text-sm text-franol-muted">
                  {selectedCount} {t("practice.results.selected")}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={handleSelectAll}
                    className="text-xs px-3 py-1 rounded-lg bg-white border border-franol-warm
                              hover:border-orange-400 transition-colors"
                  >
                    {t("practice.results.selectAll")}
                  </button>
                  <button
                    onClick={handleDeselectAll}
                    className="text-xs px-3 py-1 rounded-lg bg-white border border-franol-warm
                              hover:border-orange-400 transition-colors"
                  >
                    {t("practice.results.deselectAll")}
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Body - Vocabulary list */}
            <div className="p-4 space-y-3">
              {vocabToAdd.map((vocab) => (
                <div
                  key={vocab.id}
                  className={`bg-white rounded-xl border transition-all ${
                    vocab.selected
                      ? "border-orange-300 shadow-sm"
                      : "border-gray-200 opacity-60"
                  }`}
                >
                  {/* Header row */}
                  <div className="p-3 flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={vocab.selected}
                      onChange={() => handleToggleVocab(vocab.id)}
                      className="w-5 h-5 rounded border-gray-300 text-orange-500
                                focus:ring-orange-500 cursor-pointer shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-franol-text">
                          {vocab.wordFr}
                        </span>
                        <span className="text-franol-muted">→</span>
                        <span className="font-medium text-franol-text">
                          {vocab.wordEs}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            vocab.type === "expression"
                              ? "bg-emerald-100 text-emerald-700"
                              : vocab.type === "conjugation"
                                ? "bg-purple-100 text-purple-700"
                                : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {vocab.type === "expression"
                            ? t("add.tabs.expressions")
                            : vocab.type === "conjugation"
                              ? t("practice.modes.conjugation")
                              : t("add.tabs.vocabulary")}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        setExpandedItem(
                          expandedItem === vocab.id ? null : vocab.id,
                        )
                      }
                      className="p-1.5 text-franol-muted hover:text-franol-text
                                hover:bg-franol-sand rounded-lg transition-colors"
                    >
                      {expandedItem === vocab.id ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                    </button>
                    <button
                      onClick={() => handleRemoveVocab(vocab.id)}
                      className="p-1.5 text-franol-muted hover:text-red-500
                                hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Expanded details - Full add form */}
                  {expandedItem === vocab.id && (
                    <div className="px-4 pb-4 pt-0 space-y-4 border-t border-gray-100 animate-fade-in">
                      {/* Type selector */}
                      <div className="pt-3">
                        <label className="block text-xs font-medium text-franol-muted mb-1.5">
                          Type
                        </label>
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              handleUpdateVocabType(vocab.id, "vocabulary")
                            }
                            className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                              vocab.type === "vocabulary"
                                ? "bg-blue-100 border-blue-300 text-blue-700 font-medium"
                                : "bg-white border-franol-warm text-franol-muted hover:border-blue-200"
                            }`}
                          >
                            {t("add.tabs.vocabulary")}
                          </button>
                          <button
                            onClick={() =>
                              handleUpdateVocabType(vocab.id, "expression")
                            }
                            className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                              vocab.type === "expression"
                                ? "bg-emerald-100 border-emerald-300 text-emerald-700 font-medium"
                                : "bg-white border-franol-warm text-franol-muted hover:border-emerald-200"
                            }`}
                          >
                            {t("add.tabs.expressions")}
                          </button>
                          <button
                            onClick={() =>
                              handleUpdateVocabType(vocab.id, "conjugation")
                            }
                            className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                              vocab.type === "conjugation"
                                ? "bg-purple-100 border-purple-300 text-purple-700 font-medium"
                                : "bg-white border-franol-warm text-franol-muted hover:border-purple-200"
                            }`}
                          >
                            {t("practice.modes.conjugation")}
                          </button>
                        </div>
                      </div>

                      {/* Editable word pair */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-franol-muted mb-1.5">
                            {vocab.type === "conjugation"
                              ? t("add.infinitiveFr")
                              : t("add.wordFr")}
                          </label>
                          <input
                            type="text"
                            value={vocab.wordFr}
                            onChange={(e) =>
                              handleUpdateVocab(
                                vocab.id,
                                "wordFr",
                                e.target.value,
                              )
                            }
                            className="w-full px-3 py-2 rounded-lg border border-franol-warm
                                      bg-white text-sm focus:border-orange-400 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-franol-muted mb-1.5">
                            {vocab.type === "conjugation"
                              ? t("add.infinitiveEs")
                              : t("add.wordEs")}
                          </label>
                          <input
                            type="text"
                            value={vocab.wordEs}
                            onChange={(e) =>
                              handleUpdateVocab(
                                vocab.id,
                                "wordEs",
                                e.target.value,
                              )
                            }
                            className="w-full px-3 py-2 rounded-lg border border-franol-warm
                                      bg-white text-sm focus:border-orange-400 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Verb-specific fields: Group FR, Group ES, Irregular */}
                      {vocab.type === "conjugation" && (
                        <>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-franol-muted mb-1.5">
                                {t("add.groupFr")}
                              </label>
                              <select
                                value={vocab.groupFr}
                                onChange={(e) =>
                                  handleUpdateVocab(
                                    vocab.id,
                                    "groupFr",
                                    e.target.value,
                                  )
                                }
                                className="w-full px-3 py-2 rounded-lg border border-franol-warm
                                          bg-white text-sm focus:border-orange-400 focus:outline-none
                                          cursor-pointer"
                              >
                                <option value="">{t("add.selectGroup")}</option>
                                <option value="1">{t("add.group1")}</option>
                                <option value="2">{t("add.group2")}</option>
                                <option value="3">{t("add.group3")}</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-franol-muted mb-1.5">
                                {t("add.groupEs")}
                              </label>
                              <select
                                value={vocab.groupEs}
                                onChange={(e) =>
                                  handleUpdateVocab(
                                    vocab.id,
                                    "groupEs",
                                    e.target.value,
                                  )
                                }
                                className="w-full px-3 py-2 rounded-lg border border-franol-warm
                                          bg-white text-sm focus:border-orange-400 focus:outline-none
                                          cursor-pointer"
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
                              id={`irregular-${vocab.id}`}
                              checked={vocab.isIrregular}
                              onChange={(e) =>
                                setVocabToAdd((prev) =>
                                  prev.map((v) =>
                                    v.id === vocab.id
                                      ? { ...v, isIrregular: e.target.checked }
                                      : v,
                                  ),
                                )
                              }
                              className="w-4 h-4 rounded border-gray-300 text-purple-500
                                        focus:ring-purple-500 cursor-pointer"
                            />
                            <label
                              htmlFor={`irregular-${vocab.id}`}
                              className="text-xs font-medium text-franol-muted cursor-pointer"
                            >
                              {t("add.isIrregular")}
                            </label>
                          </div>
                        </>
                      )}

                      {/* Category/Context (not for conjugation) */}
                      {vocab.type !== "conjugation" && (
                        <div>
                          <label className="block text-xs font-medium text-franol-muted mb-1.5">
                            {vocab.type === "expression"
                              ? t("add.context")
                              : t("add.category")}
                          </label>
                          <select
                            value={vocab.category}
                            onChange={(e) =>
                              handleUpdateVocab(
                                vocab.id,
                                "category",
                                e.target.value,
                              )
                            }
                            className="w-full px-3 py-2 rounded-lg border border-franol-warm
                                      bg-white text-sm focus:border-orange-400 focus:outline-none
                                      cursor-pointer"
                          >
                            <option value="">
                              {vocab.type === "expression"
                                ? t("add.selectContext")
                                : t("add.selectCategory")}
                            </option>
                            {(vocab.type === "expression"
                              ? contexts
                              : categories
                            ).map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {locale === "fr" ? cat.name_fr : cat.name_es}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Aliases FR */}
                      <div>
                        <label className="block text-xs font-medium text-franol-muted mb-1.5">
                          {t("add.aliases")} (FR)
                        </label>
                        <AliasInput
                          aliases={vocab.aliasesFr}
                          onAdd={(alias) =>
                            handleAddAlias(vocab.id, "aliasesFr", alias)
                          }
                          onRemove={(index) =>
                            handleRemoveAlias(vocab.id, "aliasesFr", index)
                          }
                          placeholder={t("add.aliasPlaceholderVocab")}
                        />
                      </div>

                      {/* Aliases ES */}
                      <div>
                        <label className="block text-xs font-medium text-franol-muted mb-1.5">
                          {t("add.aliases")} (ES)
                        </label>
                        <AliasInput
                          aliases={vocab.aliasesEs}
                          onAdd={(alias) =>
                            handleAddAlias(vocab.id, "aliasesEs", alias)
                          }
                          onRemove={(index) =>
                            handleRemoveAlias(vocab.id, "aliasesEs", index)
                          }
                          placeholder={t("add.aliasPlaceholderVocab")}
                        />
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="block text-xs font-medium text-franol-muted mb-1.5">
                          {t("add.notes")}
                        </label>
                        <input
                          type="text"
                          value={vocab.notes}
                          onChange={(e) =>
                            handleUpdateVocab(
                              vocab.id,
                              "notes",
                              e.target.value,
                            )
                          }
                          placeholder={t("add.notesPlaceholder")}
                          className="w-full px-3 py-2 rounded-lg border border-franol-warm
                                    bg-white text-sm focus:border-orange-400 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Modal Footer - Sticky add button */}
            <div className="sticky bottom-0 bg-franol-cream border-t border-orange-200 p-4 sm:rounded-b-2xl">
              {vocabAdded && (
                <p className="text-center text-sm text-emerald-600 mb-3 animate-fade-in">
                  <Check size={14} className="inline mr-1" />
                  {t("practice.results.vocabAdded")}
                </p>
              )}
              <button
                onClick={handleAddVocabulary}
                disabled={selectedCount === 0 || isAddingVocab}
                className="w-full flex items-center justify-center gap-2 px-4 py-3
                          bg-gradient-to-r from-orange-500 to-amber-500 text-white
                          font-semibold rounded-xl hover:from-orange-600 hover:to-amber-600
                          transition-all active:scale-[0.98]
                          disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAddingVocab ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    {t("practice.results.adding")}
                  </>
                ) : (
                  <>
                    <Plus size={18} />
                    {t("practice.results.addSelected")} ({selectedCount})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="text-center mb-8 animate-fade-in">
        <div className="text-6xl mb-4">{emoji}</div>
        <div className="flex items-center justify-center gap-2">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-franol-text">
            {t("practice.results.title")}
          </h1>
          {isDiscoveryMode && (
            <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full text-xs font-semibold text-white">
              <Sparkles size={12} />
              IA
            </div>
          )}
        </div>
      </header>

      {/* Score Card */}
      <div className="bg-white rounded-2xl p-6 border border-franol-warm mb-6 animate-slide-up">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-franol-sand rounded-xl">
            <div className="flex items-center justify-center gap-2 text-franol-muted mb-1">
              <Target size={18} />
              <span className="text-sm font-medium">
                {t("practice.results.score")}
              </span>
            </div>
            <p className="text-3xl font-bold text-franol-text">
              {result.correctAnswers}/{result.totalQuestions}
            </p>
            <p className="text-lg font-semibold text-franol-accent-blue">
              {result.scorePercentage}%
            </p>
          </div>

          <div className="text-center p-4 bg-franol-sand rounded-xl">
            <div className="flex items-center justify-center gap-2 text-franol-muted mb-1">
              <Clock size={18} />
              <span className="text-sm font-medium">
                {t("practice.results.time")}
              </span>
            </div>
            <p className="text-3xl font-bold text-franol-text">
              {formatDuration(result.durationSeconds)}
            </p>
          </div>
        </div>

        {isSaving && (
          <div className="flex items-center justify-center gap-2 mt-4 text-franol-muted">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-sm">{t("practice.results.saving")}</span>
          </div>
        )}
        {saved && !isSaving && (
          <div className="flex items-center justify-center gap-2 mt-4 text-emerald-600">
            <Check size={16} />
            <span className="text-sm">{t("practice.results.saved")}</span>
          </div>
        )}
      </div>

      {/* Add Vocabulary Button - Discovery Mode Only */}
      {isDiscoveryMode && vocabToAdd.length > 0 && !vocabAdded && (
        <button
          onClick={() => setShowVocabModal(true)}
          className="w-full flex items-center justify-center gap-3 px-6 py-4
                    bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-300
                    text-orange-700 font-semibold rounded-2xl
                    hover:from-orange-100 hover:to-amber-100 hover:border-orange-400
                    active:scale-[0.98] transition-all mb-6 animate-slide-up"
          style={{ animationDelay: "0.05s" }}
        >
          <BookPlus size={22} />
          {t("practice.results.addVocab")}
          <span className="text-sm font-normal text-orange-500">
            ({vocabToAdd.length})
          </span>
        </button>
      )}

      {/* Vocab added confirmation */}
      {isDiscoveryMode && vocabAdded && (
        <div
          className="flex items-center justify-center gap-2 p-4
                    bg-emerald-50 border border-emerald-200 rounded-2xl mb-6
                    text-emerald-700 animate-fade-in"
        >
          <Check size={18} />
          <span className="font-medium">
            {t("practice.results.vocabAdded")}
          </span>
        </div>
      )}

      {/* Errors Section */}
      <div
        className="bg-white rounded-2xl p-6 border border-franol-warm mb-6 animate-slide-up"
        style={{ animationDelay: "0.1s" }}
      >
        <h2 className="text-lg font-semibold text-franol-text mb-4 flex items-center gap-2">
          <X className="w-5 h-5 text-red-500" />
          {t("practice.results.errors")}
        </h2>

        {errors.length === 0 ? (
          <div className="text-center py-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-3">
              <Check className="w-8 h-8 text-emerald-600" />
            </div>
            <p className="text-franol-muted">
              {t("practice.results.noErrors")}
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {errors.map((error, index) => (
              <div
                key={index}
                className="p-4 bg-red-50 rounded-xl border border-red-100"
              >
                <p className="font-medium text-franol-text mb-2">
                  {error.question.questionText}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-franol-muted">
                      {t("practice.results.yourAnswer")}:{" "}
                    </span>
                    <span className="text-red-600 font-medium">
                      {error.userAnswer || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-franol-muted">
                      {t("practice.results.correctAnswer")}:{" "}
                    </span>
                    <span className="text-emerald-600 font-medium">
                      {error.question.correctAnswer}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div
        className="space-y-3 animate-slide-up"
        style={{ animationDelay: "0.2s" }}
      >
        <button
          onClick={handleRetry}
          className={`w-full flex items-center justify-center gap-2 px-6 py-4
                    font-semibold rounded-xl transition-colors active:scale-[0.98]
                    ${
                      isDiscoveryMode
                        ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600"
                        : "bg-franol-accent-blue text-white hover:bg-blue-700"
                    }`}
        >
          <RotateCcw size={20} />
          {t("practice.results.retry")}
        </button>

        <button
          onClick={handleNewQuestions}
          className={`w-full flex items-center justify-center gap-2 px-6 py-4
                    font-semibold rounded-xl transition-colors active:scale-[0.98]
                    ${
                      isDiscoveryMode
                        ? "bg-white border-2 border-orange-300 text-orange-600 hover:bg-orange-50 hover:border-orange-400"
                        : "bg-white border-2 border-franol-accent-blue text-franol-accent-blue hover:bg-blue-50"
                    }`}
        >
          <RefreshCw size={20} />
          {t("practice.results.newQuestions")}
        </button>

        <button
          onClick={handleNewQuiz}
          className="w-full flex items-center justify-center gap-2 px-6 py-4
                    bg-white border-2 border-franol-warm text-franol-text
                    font-semibold rounded-xl hover:border-franol-accent-blue
                    transition-colors active:scale-[0.98]"
        >
          <Plus size={20} />
          {t("practice.results.newQuiz")}
        </button>

        <button
          onClick={handleBackToHome}
          className="w-full flex items-center justify-center gap-2 px-6 py-4
                    bg-franol-sand text-franol-text font-medium rounded-xl
                    hover:bg-franol-warm transition-colors active:scale-[0.98]"
        >
          <Home size={20} />
          {t("practice.results.backToHome")}
        </button>
      </div>
    </div>
  );
}
