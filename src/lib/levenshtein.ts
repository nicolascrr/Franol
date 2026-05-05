/**
 * Calculate the Levenshtein distance between two strings
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  // Initialize first column
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i];
  }

  // Initialize first row
  for (let j = 0; j <= b.length; j++) {
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[a.length][b.length];
}

/**
 * Normalize a string for comparison (lowercase, remove accents, trim)
 */
export function normalizeString(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // Remove diacritics
}

/**
 * Check if the user's answer is acceptable
 * Uses exact match (normalized), aliases, and Levenshtein tolerance
 */
export function checkAnswer(
  input: string,
  expected: string,
  aliases: string[] = [],
  tolerance?: number,
): boolean {
  const normalizedInput = normalizeString(input);
  const normalizedExpected = normalizeString(expected);

  // Check exact match (normalized)
  if (normalizedInput === normalizedExpected) return true;

  // Check aliases
  for (const alias of aliases) {
    if (normalizedInput === normalizeString(alias)) return true;
  }

  // Determine Levenshtein tolerance
  // Max 1 character difference for vocabulary/expressions
  const defaultTolerance = 1;
  const effectiveTolerance = tolerance !== undefined ? tolerance : defaultTolerance;

  if (effectiveTolerance > 0 && levenshteinDistance(normalizedInput, normalizedExpected) <= effectiveTolerance) {
    return true;
  }

  // Check tolerance on aliases
  if (effectiveTolerance > 0) {
    for (const alias of aliases) {
      const normalizedAlias = normalizeString(alias);
      if (levenshteinDistance(normalizedInput, normalizedAlias) <= effectiveTolerance) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check a conjugation answer with minimal tolerance (0 = exact match only).
 *
 * For conjugation, the answer is a precise conjugated form (e.g. "yo como", "je mange").
 * We only allow exact match (normalized = case-insensitive, accent-insensitive).
 * No Levenshtein tolerance — conjugation must be exact.
 */
export function checkConjugationAnswer(
  input: string,
  expected: string,
  aliases: string[] = [],
): boolean {
  return checkAnswer(input, expected, aliases, 0);
}
