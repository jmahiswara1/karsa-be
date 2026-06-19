/**
 * Fuzzy match nama entity ke ID menggunakan Levenshtein similarity.
 * Threshold 0.7 default untuk menghindari false positive.
 */

export interface Matchable {
  id: string;
  title?: string;
  name?: string;
}

function normalize(text: string): string {
  return text.toLowerCase().trim();
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function similarity(a: string, b: string): number {
  const aN = normalize(a);
  const bN = normalize(b);
  if (!aN || !bN) return 0;
  if (aN === bN) return 1;
  // Substring containment bonus
  if (aN.includes(bN) || bN.includes(aN)) return 0.9;
  const longer = aN.length > bN.length ? aN : bN;
  const distance = levenshteinDistance(aN, bN);
  return (longer.length - distance) / longer.length;
}

/**
 * Find best matching candidate above threshold.
 * Returns the matched entity or null if none exceed threshold.
 */
export function fuzzyMatch<T extends Matchable>(
  query: string,
  candidates: T[],
  threshold = 0.7,
): T | null {
  if (!query || !candidates.length) return null;
  let best: T | null = null;
  let bestScore = threshold;
  for (const candidate of candidates) {
    const name = candidate.title || candidate.name;
    if (!name || typeof name !== 'string') continue;
    const score = similarity(query, name);
    if (score >= bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  return best;
}
