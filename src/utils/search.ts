// =====================================================================
// Buscador
// ---------------------------------------------------------------------
// La lógica de búsqueda que usan el buscador de Alquileres, el de Cobros y el filtro por
// propiedad, y el cálculo de qué partes del texto se resaltan.
// =====================================================================

// Búsqueda flexible: no importan mayúsculas ni acentos, cada palabra escrita tiene que aparecer
// en algún lado, y teléfonos y documentos coinciden aunque se escriban sin espacios, puntos ni guiones.

// Tramo de texto resaltado: [desde, hasta).
export type Range = [start: number, end: number];

// Un dato en el que se busca, con su nombre ("Teléfono", "Nota"…).
export interface SearchField {
  label: string;
  value?: string;
  // Teléfonos y documentos: "1155551234" también encuentra "11 5555-1234".
  digits?: boolean;
  // Montos: "350000" también encuentra "$ 350.000", pero solo desde el principio del número
  // (no "$ 1.350.000") y desde 4 cifras, así "500" no marca "$ 5.000".
  amount?: boolean;
}

// Un campo que coincidió y qué partes resaltar.
export interface FieldMatch {
  field: SearchField;
  index: number;
  ranges: Range[];
}

// ── Normalización (sin mayúsculas ni acentos) ─────────────────────────

interface Normalized {
  text: string;
  // Posición original de cada letra, para poder resaltar el texto tal como se ve.
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

// Separa lo escrito en palabras ya normalizadas.
export function searchWords(query: string): string[] {
  return normalizeWithMap(query).text.split(/\s+/).filter(Boolean);
}

// ── Coincidencias y resaltado ─────────────────────────────────────────

// Todas las apariciones de una palabra en un texto normalizado.
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

// Une tramos resaltados que se tocan o se pisan.
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

const isDigit = (char?: string) => char !== undefined && char >= '0' && char <= '9';

// Si una posición es el comienzo de un número (y no el medio, como el "350" de "1.350.000").
function startsNumber(value: string, index: number): boolean {
  const previous = value[index - 1];
  if (isDigit(previous)) return false;
  return !((previous === '.' || previous === ',') && isDigit(value[index - 2]));
}

// Qué partes de un texto resaltar para las palabras buscadas.
export function highlightRanges(
  value: string | undefined,
  words: string[],
  digits = false,
  amount = false,
): Range[] {
  if (!value || !words.length) return [];
  const plain = normalizeWithMap(value);
  const digitsOnly = digits || amount ? normalizeWithMap(value, true) : undefined;
  const ranges: Range[] = [];
  words.forEach((word) => {
    ranges.push(...findIn(plain, word));
    if (!digitsOnly || !/^\d+$/.test(word)) return;
    if (digits) ranges.push(...findIn(digitsOnly, word));
    else if (word.length >= 4) ranges.push(...findIn(digitsOnly, word).filter(([start]) => startsNumber(value, start)));
  });
  return mergeRanges(ranges);
}

// ── Búsqueda en registros ─────────────────────────────────────────────

// Devuelve los campos que coinciden, o nada si alguna palabra no aparece en ningún lado.
export function matchFields(fields: SearchField[], words: string[]): FieldMatch[] | undefined {
  if (!words.length) return undefined;
  const found = new Set<string>();
  const matches: FieldMatch[] = [];
  fields.forEach((field, index) => {
    if (!field.value) return;
    const matchedWords = words.filter(
      (word) => highlightRanges(field.value, [word], field.digits, field.amount).length > 0,
    );
    if (!matchedWords.length) return;
    matchedWords.forEach((word) => found.add(word));
    matches.push({ field, index, ranges: highlightRanges(field.value, matchedWords, field.digits, field.amount) });
  });
  return words.every((word) => found.has(word)) ? matches : undefined;
}

// Busca en lo que muestra una fila más campos ocultos (notas, método, mes…). Devuelve nada si
// falta alguna palabra; si no, los campos ocultos que vale la pena mostrar porque tienen una
// palabra que el texto visible no tiene.
export function matchRow(
  visible: SearchField[],
  hidden: SearchField[],
  words: string[],
): { detail?: string } | undefined {
  if (!matchFields([...visible, ...hidden], words)) return undefined;
  const has = (field: SearchField, word: string) =>
    highlightRanges(field.value, [word], field.digits, field.amount).length > 0;
  const shown = new Set(words.filter((word) => visible.some((field) => has(field, word))));
  const extra = hidden.filter((field) => field.value && words.some((word) => !shown.has(word) && has(field, word)));
  return { detail: extra.map((field) => `${field.label}: ${field.value}`).join(' · ') || undefined };
}
