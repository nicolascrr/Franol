export interface Category {
  id: string;
  name_fr: string;
  name_es: string;
  type: "vocabulary" | "expression" | "conjugation";
  color: string;
  icon: string;
  created_at?: string;
  updated_at?: string;
}

export interface VocabularyItem {
  id: string;
  word_fr: string;
  word_es: string;
  article_fr: string | null;
  article_es: string | null;
  aliases_fr: string[];
  aliases_es: string[];
  category: string;
  notes: string;
  verified?: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExpressionItem {
  id: string;
  expression_fr: string;
  expression_es: string;
  aliases_fr: string[];
  aliases_es: string[];
  context: string;
  notes: string;
  verified?: boolean;
  created_at: string;
  updated_at: string;
}

export interface ConjugationItem {
  id: string;
  infinitive_fr: string;
  infinitive_es: string;
  aliases_fr: string[];
  aliases_es: string[];
  group_fr: string;
  group_es: string;
  is_irregular: boolean;
  is_reflexive_fr: boolean;
  is_reflexive_es: boolean;
  category?: string;
  notes: string;
  verified?: boolean;
  created_at: string;
  updated_at: string;
}

export type HistoryItem =
  | (VocabularyItem & { type: "vocabulary" })
  | (ExpressionItem & { type: "expression" })
  | (ConjugationItem & { type: "conjugation" });

export type ContentItem = HistoryItem;

export type CategoryDisplayItem = Omit<Category, "type"> & {
  type: "category";
  categoryType: Category["type"];
};

export type DisplayItem = ContentItem | CategoryDisplayItem;

export interface VocabFormState {
  word_fr: string;
  word_es: string;
  article_fr: string;
  article_es: string;
  aliases_fr: string[];
  aliases_es: string[];
  category: string;
  notes: string;
}

export interface ExpressionFormState {
  expression_fr: string;
  expression_es: string;
  aliases_fr: string[];
  aliases_es: string[];
  context: string;
  notes: string;
}

export interface VerbFormState {
  infinitive_fr: string;
  infinitive_es: string;
  aliases_fr: string[];
  aliases_es: string[];
  group_fr: string;
  group_es: string;
  is_irregular: boolean;
  is_reflexive_fr: boolean;
  is_reflexive_es: boolean;
  category: string;
  notes: string;
}

export const defaultVocabForm: VocabFormState = {
  word_fr: "",
  word_es: "",
  article_fr: "",
  article_es: "",
  aliases_fr: [],
  aliases_es: [],
  category: "",
  notes: "",
};

export const defaultExpressionForm: ExpressionFormState = {
  expression_fr: "",
  expression_es: "",
  aliases_fr: [],
  aliases_es: [],
  context: "",
  notes: "",
};

export const defaultVerbForm: VerbFormState = {
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
};
