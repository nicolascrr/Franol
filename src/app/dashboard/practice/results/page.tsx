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
import { getLangValue } from "@/lib/lang";
import { VocabularyModal } from "@/components/practice/VocabularyModal";
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
import type { Category } from "@/types";

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
  const { t, locale, sourceLang } = useLocale();
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
      <VocabularyModal
        show={showVocabModal}
        vocabToAdd={vocabToAdd}
        categories={categories}
        contexts={contexts}
        sourceLang={sourceLang}
        isAddingVocab={isAddingVocab}
        vocabAdded={vocabAdded}
        onClose={() => setShowVocabModal(false)}
        onToggleVocab={handleToggleVocab}
        onRemoveVocab={handleRemoveVocab}
        onUpdateVocab={handleUpdateVocab}
        onUpdateVocabType={handleUpdateVocabType}
        onAddAlias={handleAddAlias}
        onRemoveAlias={handleRemoveAlias}
        onSelectAll={handleSelectAll}
        onDeselectAll={handleDeselectAll}
        onAddVocabulary={handleAddVocabulary}
        setVocabToAdd={setVocabToAdd}
      />

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
