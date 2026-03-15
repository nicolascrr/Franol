"use client";

import { X, Loader2, Plus } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { getLangValue } from "@/lib/lang";
import { AliasInput } from "@/components/forms/AliasInput";
import { CustomDropdown } from "@/components/ui/CustomDropdown";
import { ARTICLES_FR, ARTICLES_ES } from "@/lib/constants";
import type { ContentItem, Category, VocabularyItem, ExpressionItem, ConjugationItem } from "@/types";
import type { LangCode } from "@/lib/lang";

interface EditFormState {
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
}

interface EditModalProps {
  editingItem: ContentItem | null;
  editForm: EditFormState;
  setEditForm: React.Dispatch<React.SetStateAction<EditFormState>>;
  vocabularyCategories: Category[];
  expressionContexts: Category[];
  sourceLang: LangCode;
  isSaving: boolean;
  onClose: () => void;
  onSave: () => void;
  onOpenNewCategoryModal: (type: "vocabulary" | "expression" | "conjugation") => void;
}

export function EditModal({
  editingItem,
  editForm,
  setEditForm,
  vocabularyCategories,
  expressionContexts,
  sourceLang,
  isSaving,
  onClose,
  onSave,
  onOpenNewCategoryModal,
}: EditModalProps) {
  const { t } = useLocale();

  if (!editingItem) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg my-8 max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-franol-warm flex-shrink-0">
          <h2 className="text-xl font-display font-bold text-franol-text">
            {t("content.editTitle")}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-franol-muted hover:text-franol-text
                       hover:bg-franol-sand transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto hide-scrollbar flex-1">
          {editingItem.type === "vocabulary" && (
            <>
              <div>
                <label className="block text-sm font-medium text-franol-text mb-2">
                  {t("add.wordFr")} *
                </label>
                <input
                  type="text"
                  value={editForm.word_fr || ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, word_fr: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-xl border-2 border-franol-warm
                             bg-white text-franol-text
                             focus:border-franol-accent-blue focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-franol-text mb-2">
                  {t("add.wordEs")} *
                </label>
                <input
                  type="text"
                  value={editForm.word_es || ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, word_es: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-xl border-2 border-franol-warm
                             bg-white text-franol-text
                             focus:border-franol-accent-blue focus:outline-none transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <CustomDropdown
                  value={editForm.article_fr || ""}
                  onChange={(value) =>
                    setEditForm({
                      ...editForm,
                      article_fr: value,
                    })
                  }
                  options={[
                    { value: "", label: t("add.selectArticle") },
                    ...ARTICLES_FR.map((article) => ({ value: article, label: article })),
                  ]}
                  placeholder={t("add.selectArticle")}
                  label={t("add.articleFr")}
                />
                <CustomDropdown
                  value={editForm.article_es || ""}
                  onChange={(value) =>
                    setEditForm({
                      ...editForm,
                      article_es: value,
                    })
                  }
                  options={[
                    { value: "", label: t("add.selectArticle") },
                    ...ARTICLES_ES.map((article) => ({ value: article, label: article })),
                  ]}
                  placeholder={t("add.selectArticle")}
                  label={t("add.articleEs")}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-franol-text mb-2">
                  {t("add.aliases")}
                </label>
                {sourceLang === "fr" ? (
                  <AliasInput
                    aliases={editForm.aliases_fr}
                    onAdd={(alias) =>
                      setEditForm({
                        ...editForm,
                        aliases_fr: [...editForm.aliases_fr, alias],
                      })
                    }
                    onRemove={(index) =>
                      setEditForm({
                        ...editForm,
                        aliases_fr: editForm.aliases_fr.filter(
                          (_, i) => i !== index,
                        ),
                      })
                    }
                    placeholder={t("add.aliasPlaceholderVocab")}
                  />
                ) : (
                  <AliasInput
                    aliases={editForm.aliases_es}
                    onAdd={(alias) =>
                      setEditForm({
                        ...editForm,
                        aliases_es: [...editForm.aliases_es, alias],
                      })
                    }
                    onRemove={(index) =>
                      setEditForm({
                        ...editForm,
                        aliases_es: editForm.aliases_es.filter(
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
                    value={editForm.category || ""}
                    onChange={(e) =>
                      setEditForm({ ...editForm, category: e.target.value })
                    }
                    className="flex-1 px-4 py-3 rounded-xl border-2 border-franol-warm
                               bg-white text-franol-text
                               focus:border-franol-accent-blue focus:outline-none transition-colors"
                  >
                    <option value="">{t("add.selectCategory")}</option>
                    {vocabularyCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {getLangValue(cat, "name", sourceLang)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => onOpenNewCategoryModal("vocabulary")}
                    className="px-3 py-3 rounded-xl bg-franol-accent-blue text-white
                               hover:bg-blue-700 transition-colors flex items-center justify-center"
                    title={t("add.createCategory")}
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>
            </>
          )}

          {editingItem.type === "expression" && (
            <>
              <div>
                <label className="block text-sm font-medium text-franol-text mb-2">
                  {t("add.expressionFr")} *
                </label>
                <input
                  type="text"
                  value={editForm.expression_fr || ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, expression_fr: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-xl border-2 border-franol-warm
                             bg-white text-franol-text
                             focus:border-franol-accent-blue focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-franol-text mb-2">
                  {t("add.expressionEs")} *
                </label>
                <input
                  type="text"
                  value={editForm.expression_es || ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, expression_es: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-xl border-2 border-franol-warm
                             bg-white text-franol-text
                             focus:border-franol-accent-blue focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-franol-text mb-2">
                  {t("add.aliases")}
                </label>
                {sourceLang === "fr" ? (
                  <AliasInput
                    aliases={editForm.aliases_fr}
                    onAdd={(alias) =>
                      setEditForm({
                        ...editForm,
                        aliases_fr: [...editForm.aliases_fr, alias],
                      })
                    }
                    onRemove={(index) =>
                      setEditForm({
                        ...editForm,
                        aliases_fr: editForm.aliases_fr.filter(
                          (_, i) => i !== index,
                        ),
                      })
                    }
                    placeholder={t("add.aliasPlaceholderExpr")}
                  />
                ) : (
                  <AliasInput
                    aliases={editForm.aliases_es}
                    onAdd={(alias) =>
                      setEditForm({
                        ...editForm,
                        aliases_es: [...editForm.aliases_es, alias],
                      })
                    }
                    onRemove={(index) =>
                      setEditForm({
                        ...editForm,
                        aliases_es: editForm.aliases_es.filter(
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
                  <CustomDropdown
                    value={editForm.context || ""}
                    onChange={(value) =>
                      setEditForm({ ...editForm, context: value })
                    }
                    options={[
                      { value: "", label: t("add.selectContext") },
                      ...expressionContexts.map((cat) => ({
                        value: cat.id,
                        label: getLangValue(cat, "name", sourceLang),
                        color: cat.color,
                      })),
                    ]}
                    placeholder={t("add.selectContext")}
                    className="flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => onOpenNewCategoryModal("expression")}
                    className="px-3 py-3 rounded-xl bg-franol-accent-blue text-white
                               hover:bg-blue-700 transition-colors flex items-center justify-center"
                    title={t("add.createCategory")}
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>
            </>
          )}

          {editingItem.type === "conjugation" && (
            <>
              <div>
                <label className="block text-sm font-medium text-franol-text mb-2">
                  {t("add.infinitiveFr")} *
                </label>
                <input
                  type="text"
                  value={editForm.infinitive_fr || ""}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      infinitive_fr: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 rounded-xl border-2 border-franol-warm
                             bg-white text-franol-text
                             focus:border-franol-accent-blue focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-franol-text mb-2">
                  {t("add.infinitiveEs")} *
                </label>
                <input
                  type="text"
                  value={editForm.infinitive_es || ""}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      infinitive_es: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 rounded-xl border-2 border-franol-warm
                             bg-white text-franol-text
                             focus:border-franol-accent-blue focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-franol-text mb-2">
                  {t("add.aliases")}
                </label>
                {sourceLang === "fr" ? (
                  <AliasInput
                    aliases={editForm.aliases_fr}
                    onAdd={(alias) =>
                      setEditForm({
                        ...editForm,
                        aliases_fr: [...editForm.aliases_fr, alias],
                      })
                    }
                    onRemove={(index) =>
                      setEditForm({
                        ...editForm,
                        aliases_fr: editForm.aliases_fr.filter(
                          (_, i) => i !== index,
                        ),
                      })
                    }
                    placeholder={t("add.aliasPlaceholderVerb")}
                  />
                ) : (
                  <AliasInput
                    aliases={editForm.aliases_es}
                    onAdd={(alias) =>
                      setEditForm({
                        ...editForm,
                        aliases_es: [...editForm.aliases_es, alias],
                      })
                    }
                    onRemove={(index) =>
                      setEditForm({
                        ...editForm,
                        aliases_es: editForm.aliases_es.filter(
                          (_, i) => i !== index,
                        ),
                      })
                    }
                    placeholder={t("add.aliasPlaceholderVerb")}
                  />
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <CustomDropdown
                  value={editForm.group_fr || ""}
                  onChange={(value) =>
                    setEditForm({ ...editForm, group_fr: value })
                  }
                  options={[
                    { value: "", label: t("add.selectGroup") },
                    { value: "1", label: t("add.group1") },
                    { value: "2", label: t("add.group2") },
                    { value: "3", label: t("add.group3") },
                  ]}
                  placeholder={t("add.selectGroup")}
                  label={t("add.groupFr")}
                />
                <CustomDropdown
                  value={editForm.group_es || ""}
                  onChange={(value) =>
                    setEditForm({ ...editForm, group_es: value })
                  }
                  options={[
                    { value: "", label: t("add.selectGroup") },
                    { value: "AR", label: "-AR" },
                    { value: "ER", label: "-ER" },
                    { value: "IR", label: "-IR" },
                    { value: "irregular", label: t("add.irregular") },
                  ]}
                  placeholder={t("add.selectGroup")}
                  label={t("add.groupEs")}
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="edit_is_irregular"
                  checked={editForm.is_irregular || false}
                  onChange={(e) =>
                    setEditForm({ ...editForm, is_irregular: e.target.checked })
                  }
                  className="w-5 h-5 rounded border-2 border-franol-warm text-franol-accent-blue
                             focus:ring-franol-accent-blue focus:ring-offset-0"
                />
                <label
                  htmlFor="edit_is_irregular"
                  className="text-sm font-medium text-franol-text"
                >
                  {t("add.isIrregular")}
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="edit_is_reflexive_fr"
                    checked={editForm.is_reflexive_fr || false}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        is_reflexive_fr: e.target.checked,
                      })
                    }
                    className="w-5 h-5 rounded border-2 border-franol-warm text-franol-accent-blue
                               focus:ring-franol-accent-blue focus:ring-offset-0"
                  />
                  <label
                    htmlFor="edit_is_reflexive_fr"
                    className="text-sm font-medium text-franol-text"
                  >
                    {t("add.isReflexiveFr")}
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="edit_is_reflexive_es"
                    checked={editForm.is_reflexive_es || false}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        is_reflexive_es: e.target.checked,
                      })
                    }
                    className="w-5 h-5 rounded border-2 border-franol-warm text-franol-accent-blue
                               focus:ring-franol-accent-blue focus:ring-offset-0"
                  />
                  <label
                    htmlFor="edit_is_reflexive_es"
                    className="text-sm font-medium text-franol-text"
                  >
                    {t("add.isReflexiveEs")}
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-franol-text mb-2">
                  {t("add.category")}
                </label>
                <div className="flex gap-2">
                  <CustomDropdown
                    value={editForm.category || ""}
                    onChange={(value) =>
                      setEditForm({ ...editForm, category: value })
                    }
                    options={[
                      { value: "", label: t("add.selectCategory") },
                      ...vocabularyCategories.map((cat) => ({
                        value: cat.id,
                        label: getLangValue(cat, "name", sourceLang),
                        color: cat.color,
                      })),
                    ]}
                    placeholder={t("add.selectCategory")}
                    className="flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => onOpenNewCategoryModal("conjugation")}
                    className="px-3 py-3 rounded-xl bg-franol-accent-blue text-white
                               hover:bg-blue-700 transition-colors flex items-center justify-center"
                    title={t("add.createCategory")}
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>
            </>
          )}

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="edit_verified"
              checked={editForm.verified || false}
              onChange={(e) =>
                setEditForm({ ...editForm, verified: e.target.checked })
              }
              className="w-5 h-5 rounded border-2 border-franol-warm text-franol-accent-blue
                         focus:ring-franol-accent-blue focus:ring-offset-0"
            />
            <label
              htmlFor="edit_verified"
              className="text-sm font-medium text-franol-text"
            >
              {t("content.verified")}
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-franol-text mb-2">
              {t("add.notes")}
            </label>
            <textarea
              value={editForm.notes || ""}
              onChange={(e) =>
                setEditForm({ ...editForm, notes: e.target.value })
              }
              rows={3}
              className="w-full px-4 py-3 rounded-xl border-2 border-franol-warm
                         bg-white text-franol-text
                         focus:border-franol-accent-blue focus:outline-none transition-colors resize-none"
              placeholder={t("add.notesPlaceholder")}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-franol-warm flex-shrink-0 bg-white">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl font-medium text-franol-muted
                       hover:bg-franol-sand transition-colors"
          >
            {t("content.cancel")}
          </button>
          <button
            onClick={onSave}
            disabled={isSaving}
            className="px-6 py-2 rounded-xl font-medium text-white
                       bg-franol-accent-blue hover:bg-blue-700
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors flex items-center gap-2"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            {t("content.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
