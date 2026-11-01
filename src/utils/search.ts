// Flexible "contains" search: case and accent insensitive, every typed word must appear
// somewhere in the record, and phone/ID fields also match ignoring spaces, dots and dashes.

export type Range = [start: number, end: number];

export interface SearchField {
  label: string;
  value?: string;
  // Phones and documents: "1155551234" also finds "11 5555-1234".
  digits?: boolean;
}

export interface FieldMatch {
  field: SearchField;
  index: number;
  ranges: Range[];
}

interface Normalized {
  text: string;
  // Original index of every normalized character, to highlight the original text.
  map: number[];
}

function normalizeWithMap(value: string, digitsOnly = false): Normalized {
  let text = '';
  const map: number[] = [];
  for (let i = 0; i < value.length; i += 1) {
    const plain = value[i].normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    for (const char of plain) {
      if (digitsOnly && !/[0-9]/.test(char)) continue;
      text += char;
      map.push(i);
    }
  }
  return { text, map };
}

export function searchWords(query: string): string[] {
  return normalizeWithMap(query).text.split(/\s+/).filter(Boolean);
}

function findIn(normalized: Normalized, word: string): Range[] {
  const ranges: Range[] = [];
  if (!word) return ranges;
  let from = normalized.text.indexOf(word);
  while (from !== -1) {
    const last = from + word.length - 1;
    ranges.push([normalized.map[from], normalized.map[last] + 1]);
    from = normalized.text.indexOf(word, from + 1);
  }
  return ranges;
}

function mergeRanges(ranges: Range[]): Range[] {
  const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
  const merged: Range[] = [];
  sorted.forEach((range) => {
    const previous = merged[merged.length - 1];
    if (previous && range[0] <= previous[1]) previous[1] = Math.max(previous[1], range[1]);
    else merged.push([...range]);
  });
  return merged;
}

export function highlightRanges(value: string | undefined, words: string[], digits = false): Range[] {
  if (!value || !words.length) return [];
  const plain = normalizeWithMap(value);
  const digitsOnly = digits ? normalizeWithMap(value, true) : undefined;
  const ranges: Range[] = [];
  words.forEach((word) => {
    ranges.push(...findIn(plain, word));
    if (digitsOnly && /^\d+$/.test(word)) ranges.push(...findIn(digitsOnly, word));
  });
  return mergeRanges(ranges);
}

// Returns the fields that matched, or undefined when some word is not found anywhere.
export function matchFields(fields: SearchField[], words: string[]): FieldMatch[] | undefined {
  if (!words.length) return undefined;
  const found = new Set<string>();
  const matches: FieldMatch[] = [];
  fields.forEach((field, index) => {
    if (!field.value) return;
    const matchedWords = words.filter((word) => highlightRanges(field.value, [word], field.digits).length > 0);
    if (!matchedWords.length) return;
    matchedWords.forEach((word) => found.add(word));
    matches.push({ field, index, ranges: highlightRanges(field.value, matchedWords, field.digits) });
  });
  return words.every((word) => found.has(word)) ? matches : undefined;
}
