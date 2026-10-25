/**
 * Deterministic voiceover segmenter for sequence mode.
 * Splits narration into shot-sized fragments without relying on an LLM to count words.
 */

export interface ShotSegment {
  wordStart: number; // inclusive
  wordEnd: number;   // exclusive
  text: string;
}

export const DEFAULT_WORDS_PER_SECOND = 2.5; // ~150 wpm narration
const CLAUSE_END = /[.,;:!?…]["'”’)]*$/;

export function tokenizeWords(text: string): string[] {
  return (text || '').trim().split(/\s+/).filter(Boolean);
}

/** Target words per shot for a pacing, using the scene's real speech rate when known. */
export function computeWordsPerShot(
  pacingSeconds: number,
  wordCount: number,
  audioDurationSeconds?: number
): number {
  const rate =
    audioDurationSeconds && audioDurationSeconds > 0 && wordCount > 0
      ? wordCount / audioDurationSeconds
      : DEFAULT_WORDS_PER_SECOND;
  return Math.max(3, Math.round(pacingSeconds * rate));
}

function splitIntoClauses(words: string[]): Array<[number, number]> {
  const clauses: Array<[number, number]> = [];
  let start = 0;
  words.forEach((word, i) => {
    if (CLAUSE_END.test(word) || i === words.length - 1) {
      clauses.push([start, i + 1]);
      start = i + 1;
    }
  });
  return clauses;
}

function splitBalanced([start, end]: [number, number], parts: number): Array<[number, number]> {
  const len = end - start;
  const base = Math.floor(len / parts);
  let extra = len % parts;
  const out: Array<[number, number]> = [];
  let cursor = start;
  for (let p = 0; p < parts; p++) {
    const size = base + (extra > 0 ? 1 : 0);
    if (extra > 0) extra--;
    out.push([cursor, cursor + size]);
    cursor += size;
  }
  return out;
}

/**
 * Splits a voiceover into contiguous segments of roughly `wordsPerShot` words,
 * preferring punctuation boundaries and splitting long clauses into balanced parts.
 */
export function segmentVoiceover(voiceover: string, wordsPerShot: number): ShotSegment[] {
  const words = tokenizeWords(voiceover);
  if (words.length === 0) return [];
  const target = Math.max(1, wordsPerShot);

  const units: Array<[number, number]> = [];
  for (const clause of splitIntoClauses(words)) {
    const len = clause[1] - clause[0];
    if (len > target * 1.5) {
      units.push(...splitBalanced(clause, Math.max(2, Math.round(len / target))));
    } else {
      units.push(clause);
    }
  }

  const ranges: Array<[number, number]> = [];
  let current: [number, number] | null = null;
  for (const unit of units) {
    if (current && current[1] - current[0] + (unit[1] - unit[0]) > target * 1.3) {
      ranges.push(current);
      current = null;
    }
    current = current ? [current[0], unit[1]] : [unit[0], unit[1]];
    if (current[1] - current[0] >= target * 0.8) {
      ranges.push(current);
      current = null;
    }
  }
  if (current) {
    const last = ranges[ranges.length - 1];
    if (last && current[1] - current[0] < target * 0.5) {
      last[1] = current[1];
    } else {
      ranges.push(current);
    }
  }

  return ranges.map(([wordStart, wordEnd]) => ({
    wordStart,
    wordEnd,
    text: words.slice(wordStart, wordEnd).join(' '),
  }));
}
