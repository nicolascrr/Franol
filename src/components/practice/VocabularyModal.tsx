"use client";

import { useState } from "react";
import {
  BookPlus,
  X,
  ChevronDown,
  ChevronUp,
  Trash2,
  Plus,
  Loader2,
  Check,
} from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { getLangValue } from "@/lib/lang";
import { AliasInput } from "@/components/forms/AliasInput";
import { CustomDropdown } from "@/components/ui/CustomDropdown";
import type { Category } from "@/types";
import type { LangCode } from "@/lib/lang";

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
  groupFr: string;
  groupEs: string;
  isIrregular: boolean;
}

interface VocabularyModalProps {
  show: boolean;
  vocabToAdd: VocabToAdd[];
  categories: Category[];
  contexts: Category[];
  sourceLang: LangCode;
  isAddingVocab: boolean;
  vocabAdded: boolean;
  onClose: () => void;
  onToggleVocab: (id: string) => void;
  onRemoveVocab: (id: string) => void;
  onUpdateVocab: (id: string, field: keyof VocabToAdd, value: string | string[]) => void;
  onUpdateVocabType: (id: string, type: "vocabulary" | "expression" | "conjugation") => void;
  onAddAlias: (id: string, field: "aliasesFr" | "aliasesEs", alias: string) => void;
  onRemoveAlias: (id: string, field: "aliasesFr" | "aliasesEs", index: number) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onAddVocabulary: () => void;
  setVocabToAdd: React.Dispatch<React.SetStateAction<VocabToAdd[]>>;
}

export function VocabularyModal({
  show,
  vocabToAdd,
  categories,
  contexts,
  sourceLang,
  isAddingVocab,
  vocabAdded,
  onClose,
  onToggleVocab,
  onRemoveVocab,
  onUpdateVocab,
  onUpdateVocabType,
  onAddAlias,
  onRemoveAlias,
  onSelectAll,
  onDeselectAll,
  onAddVocabulary,
  setVocabToAdd,
}: VocabularyModalProps) {
  const { t } = useLocale();
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  if (!show) return null;

  const selectedCount = vocabToAdd.filter((v) => v.selected).length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 animate-fade-in overflow-y-auto">
      <div className="bg-franol-cream w-full max-w-2xl min-h-screen sm:min-h-0 sm:my-8 sm:rounded-2xl sm:border sm:border-franol-warm animate-slide-up">
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
              onClick={onClose}
              className="p-2 text-franol-muted hover:text-franol-text
                        hover:bg-orange-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex items-center justify-between mt-3">
            <span className="text-sm text-franol-muted">
              {selectedCount} {t("practice.results.selected")}
            </span>
            <div className="flex gap-2">
              <button
                onClick={onSelectAll}
                className="text-xs px-3 py-1 rounded-lg bg-white border border-franol-warm
                          hover:border-orange-400 transition-colors"
              >
                {t("practice.results.selectAll")}
              </button>
              <button
                onClick={onDeselectAll}
                className="text-xs px-3 py-1 rounded-lg bg-white border border-franol-warm
                          hover:border-orange-400 transition-colors"
              >
                {t("practice.results.deselectAll")}
              </button>
            </div>
          </div>
        </div>

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
              <div className="p-3 flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={vocab.selected}
                  onChange={() => onToggleVocab(vocab.id)}
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
                  onClick={() => onRemoveVocab(vocab.id)}
                  className="p-1.5 text-franol-muted hover:text-red-500
                            hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {expandedItem === vocab.id && (
                <div className="px-4 pb-4 pt-0 space-y-4 border-t border-gray-100 animate-fade-in">
                  <div className="pt-3">
                    <label className="block text-xs font-medium text-franol-muted mb-1.5">
                      Type
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => onUpdateVocabType(vocab.id, "vocabulary")}
                        className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                          vocab.type === "vocabulary"
                            ? "bg-blue-100 border-blue-300 text-blue-700 font-medium"
                            : "bg-white border-franol-warm text-franol-muted hover:border-blue-200"
                        }`}
                      >
                        {t("add.tabs.vocabulary")}
                      </button>
                      <button
                        onClick={() => onUpdateVocabType(vocab.id, "expression")}
                        className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                          vocab.type === "expression"
                            ? "bg-emerald-100 border-emerald-300 text-emerald-700 font-medium"
                            : "bg-white border-franol-warm text-franol-muted hover:border-emerald-200"
                        }`}
                      >
                        {t("add.tabs.expressions")}
                      </button>
                      <button
                        onClick={() => onUpdateVocabType(vocab.id, "conjugation")}
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
                          onUpdateVocab(vocab.id, "wordFr", e.target.value)
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
                          onUpdateVocab(vocab.id, "wordEs", e.target.value)
                        }
                        className="w-full px-3 py-2 rounded-lg border border-franol-warm
                                  bg-white text-sm focus:border-orange-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  {vocab.type === "conjugation" && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-franol-muted mb-1.5">
                            {t("add.groupFr")}
                          </label>
                          <CustomDropdown
                            value={vocab.groupFr}
                            onChange={(value) =>
                              onUpdateVocab(vocab.id, "groupFr", value)
                            }
                            options={[
                              { value: "", label: t("add.selectGroup") },
                              { value: "1", label: t("add.group1") },
                              { value: "2", label: t("add.group2") },
                              { value: "3", label: t("add.group3") },
                            ]}
                            placeholder={t("add.selectGroup")}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-franol-muted mb-1.5">
                            {t("add.groupEs")}
                          </label>
                          <CustomDropdown
                            value={vocab.groupEs}
                            onChange={(value) =>
                              onUpdateVocab(vocab.id, "groupEs", value)
                            }
                            options={[
                              { value: "", label: t("add.selectGroup") },
                              { value: "AR", label: "-AR" },
                              { value: "ER", label: "-ER" },
                              { value: "IR", label: "-IR" },
                              { value: "irregular", label: t("add.irregular") },
                            ]}
                            placeholder={t("add.selectGroup")}
                          />
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

                  {vocab.type !== "conjugation" && (
                    <div>
                      <label className="block text-xs font-medium text-franol-muted mb-1.5">
                        {vocab.type === "expression"
                          ? t("add.context")
                          : t("add.category")}
                      </label>
                      <CustomDropdown
                        value={vocab.category}
                        onChange={(value) =>
                          onUpdateVocab(vocab.id, "category", value)
                        }
                        options={[
                          {
                            value: "",
                            label:
                              vocab.type === "expression"
                                ? t("add.selectContext")
                                : t("add.selectCategory"),
                          },
                          ...(vocab.type === "expression"
                            ? contexts
                            : categories
                          ).map((cat) => ({
                            value: cat.id,
                            label: getLangValue(cat, "name", sourceLang),
                            color: cat.color,
                          })),
                        ]}
                        placeholder={
                          vocab.type === "expression"
                            ? t("add.selectContext")
                            : t("add.selectCategory")
                        }
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-franol-muted mb-1.5">
                      {t("add.aliasesFr")}
                    </label>
                    <AliasInput
                      aliases={vocab.aliasesFr}
                      onAdd={(alias) => onAddAlias(vocab.id, "aliasesFr", alias)}
                      onRemove={(index) => onRemoveAlias(vocab.id, "aliasesFr", index)}
                      placeholder={t("add.aliasPlaceholderVocab")}
                      language="fr"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-franol-muted mb-1.5">
                      {t("add.aliasesEs")}
                    </label>
                    <AliasInput
                      aliases={vocab.aliasesEs}
                      onAdd={(alias) => onAddAlias(vocab.id, "aliasesEs", alias)}
                      onRemove={(index) => onRemoveAlias(vocab.id, "aliasesEs", index)}
                      placeholder={t("add.aliasPlaceholderVocab")}
                      language="es"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-franol-muted mb-1.5">
                      {t("add.notes")}
                    </label>
                    <input
                      type="text"
                      value={vocab.notes}
                      onChange={(e) =>
                        onUpdateVocab(vocab.id, "notes", e.target.value)
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

        <div className="sticky bottom-0 bg-franol-cream border-t border-orange-200 p-4 sm:rounded-b-2xl">
          {vocabAdded && (
            <p className="text-center text-sm text-emerald-600 mb-3 animate-fade-in">
              <Check size={14} className="inline mr-1" />
              {t("practice.results.vocabAdded")}
            </p>
          )}
          <button
            onClick={onAddVocabulary}
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
  );
}
