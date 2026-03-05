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
  aliases: string[] = []
): boolean {
  const normalizedInput = normalizeString(input);
  const normalizedExpected = normalizeString(expected);

  // Check exact match (normalized)
  if (normalizedInput === normalizedExpected) return true;

  // Check aliases
  for (const alias of aliases) {
    if (normalizedInput === normalizeString(alias)) return true;
  }

  // Check with Levenshtein tolerance
  // For short words (< 5 chars), allow 1 error; otherwise allow 2
  const tolerance = normalizedExpected.length < 5 ? 1 : 2;
  if (levenshteinDistance(normalizedInput, normalizedExpected) <= tolerance) {
    return true;
  }

  // Check tolerance on aliases
  for (const alias of aliases) {
    const normalizedAlias = normalizeString(alias);
    const aliasTolerance = normalizedAlias.length < 5 ? 1 : 2;
    if (levenshteinDistance(normalizedInput, normalizedAlias) <= aliasTolerance) {
      return true;
    }
  }

  return false;
}
