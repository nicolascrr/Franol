/**
 * Duplicate detection utilities for vocabulary, expressions, and verbs
 */

import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export interface DuplicateMatch {
  id: string;
  word_fr?: string;
  word_es?: string;
  expression_fr?: string;
  expression_es?: string;
  infinitive_fr?: string;
  infinitive_es?: string;
  matchedField: string;
  matchedValue: string;
}

export type ContentType = "vocabulary" | "expression" | "conjugation";

/**
 * Normalize a string for comparison (lowercase, trim)
 */
function normalize(str: string): string {
  return str.toLowerCase().trim();
}

/**
 * Check for duplicates in vocabulary table
 */
async function checkVocabularyDuplicates(
  wordFr: string,
  wordEs: string,
  aliasesFr: string[],
  aliasesEs: string[]
): Promise<DuplicateMatch[]> {
  const matches: DuplicateMatch[] = [];
  const normalizedWordFr = normalize(wordFr);
  const normalizedWordEs = normalize(wordEs);
  const normalizedAliasesFr = aliasesFr.map(normalize);
  const normalizedAliasesEs = aliasesEs.map(normalize);

  const { data } = await supabase.from("vocabulary").select("*");

  if (!data) return matches;

  data.forEach((item) => {
    const itemWordFr = normalize(item.word_fr);
    const itemWordEs = normalize(item.word_es);
    const itemAliasesFr = (item.aliases_fr || []).map(normalize);
    const itemAliasesEs = (item.aliases_es || []).map(normalize);

    // Check main word fields
    if (itemWordFr === normalizedWordFr) {
      matches.push({
        id: item.id,
        word_fr: item.word_fr,
        word_es: item.word_es,
        matchedField: "word_fr",
        matchedValue: item.word_fr,
      });
    } else if (itemWordEs === normalizedWordEs) {
      matches.push({
        id: item.id,
        word_fr: item.word_fr,
        word_es: item.word_es,
        matchedField: "word_es",
        matchedValue: item.word_es,
      });
    }

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
      if (itemWordFr === alias || itemAliasesFr.includes(alias)) {
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
      if (itemWordEs === alias || itemAliasesEs.includes(alias)) {
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

  return matches;
}

/**
 * Check for duplicates in expressions table
 */
async function checkExpressionDuplicates(
  exprFr: string,
  exprEs: string,
  aliasesFr: string[],
  aliasesEs: string[]
): Promise<DuplicateMatch[]> {
  const matches: DuplicateMatch[] = [];
  const normalizedExprFr = normalize(exprFr);
  const normalizedExprEs = normalize(exprEs);
  const normalizedAliasesFr = aliasesFr.map(normalize);
  const normalizedAliasesEs = aliasesEs.map(normalize);

  const { data } = await supabase.from("expressions").select("*");

  if (!data) return matches;

  data.forEach((item) => {
    const itemExprFr = normalize(item.expression_fr);
    const itemExprEs = normalize(item.expression_es);
    const itemAliasesFr = (item.aliases_fr || []).map(normalize);
    const itemAliasesEs = (item.aliases_es || []).map(normalize);

    // Check main expression fields
    if (itemExprFr === normalizedExprFr) {
      matches.push({
        id: item.id,
        expression_fr: item.expression_fr,
        expression_es: item.expression_es,
        matchedField: "expression_fr",
        matchedValue: item.expression_fr,
      });
    } else if (itemExprEs === normalizedExprEs) {
      matches.push({
        id: item.id,
        expression_fr: item.expression_fr,
        expression_es: item.expression_es,
        matchedField: "expression_es",
        matchedValue: item.expression_es,
      });
    }

    // Check if main expression matches any alias
    if (itemAliasesFr.includes(normalizedExprFr)) {
      matches.push({
        id: item.id,
        expression_fr: item.expression_fr,
        expression_es: item.expression_es,
        matchedField: "aliases_fr",
        matchedValue: normalizedExprFr,
      });
    }
    if (itemAliasesEs.includes(normalizedExprEs)) {
      matches.push({
        id: item.id,
        expression_fr: item.expression_fr,
        expression_es: item.expression_es,
        matchedField: "aliases_es",
        matchedValue: normalizedExprEs,
      });
    }

    // Check if any new alias matches existing expression or aliases
    normalizedAliasesFr.forEach((alias) => {
      if (itemExprFr === alias || itemAliasesFr.includes(alias)) {
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
      if (itemExprEs === alias || itemAliasesEs.includes(alias)) {
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

  return matches;
}

/**
 * Check for duplicates in conjugations table
 */
async function checkConjugationDuplicates(
  infFr: string,
  infEs: string,
  aliasesFr: string[],
  aliasesEs: string[]
): Promise<DuplicateMatch[]> {
  const matches: DuplicateMatch[] = [];
  const normalizedInfFr = normalize(infFr);
  const normalizedInfEs = normalize(infEs);
  const normalizedAliasesFr = aliasesFr.map(normalize);
  const normalizedAliasesEs = aliasesEs.map(normalize);

  const { data } = await supabase.from("conjugations").select("*");

  if (!data) return matches;

  data.forEach((item) => {
    const itemInfFr = normalize(item.infinitive_fr);
    const itemInfEs = normalize(item.infinitive_es);
    const itemAliasesFr = (item.aliases_fr || []).map(normalize);
    const itemAliasesEs = (item.aliases_es || []).map(normalize);

    // Check main infinitive fields
    if (itemInfFr === normalizedInfFr) {
      matches.push({
        id: item.id,
        infinitive_fr: item.infinitive_fr,
        infinitive_es: item.infinitive_es,
        matchedField: "infinitive_fr",
        matchedValue: item.infinitive_fr,
      });
    } else if (itemInfEs === normalizedInfEs) {
      matches.push({
        id: item.id,
        infinitive_fr: item.infinitive_fr,
        infinitive_es: item.infinitive_es,
        matchedField: "infinitive_es",
        matchedValue: item.infinitive_es,
      });
    }

    // Check if main infinitive matches any alias
    if (itemAliasesFr.includes(normalizedInfFr)) {
      matches.push({
        id: item.id,
        infinitive_fr: item.infinitive_fr,
        infinitive_es: item.infinitive_es,
        matchedField: "aliases_fr",
        matchedValue: normalizedInfFr,
      });
    }
    if (itemAliasesEs.includes(normalizedInfEs)) {
      matches.push({
        id: item.id,
        infinitive_fr: item.infinitive_fr,
        infinitive_es: item.infinitive_es,
        matchedField: "aliases_es",
        matchedValue: normalizedInfEs,
      });
    }

    // Check if any new alias matches existing infinitive or aliases
    normalizedAliasesFr.forEach((alias) => {
      if (itemInfFr === alias || itemAliasesFr.includes(alias)) {
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
      if (itemInfEs === alias || itemAliasesEs.includes(alias)) {
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

  return matches;
}

/**
 * Check for duplicates in the database
 */
export async function checkDuplicate(
  type: ContentType,
  wordFr: string,
  wordEs: string,
  aliasesFr: string[],
  aliasesEs: string[]
): Promise<DuplicateMatch[]> {
  let matches: DuplicateMatch[] = [];

  try {
    switch (type) {
      case "vocabulary":
        matches = await checkVocabularyDuplicates(
          wordFr,
          wordEs,
          aliasesFr,
          aliasesEs
        );
        break;
      case "expression":
        matches = await checkExpressionDuplicates(
          wordFr,
          wordEs,
          aliasesFr,
          aliasesEs
        );
        break;
      case "conjugation":
        matches = await checkConjugationDuplicates(
          wordFr,
          wordEs,
          aliasesFr,
          aliasesEs
        );
        break;
    }
  } catch (err) {
    console.error("Error checking duplicates:", err);
  }

  // Remove duplicate matches (same id)
  return matches.filter(
    (match, index, self) => index === self.findIndex((m) => m.id === match.id)
  );
}
