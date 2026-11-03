// =====================================================================
// Ayudas de texto
// ---------------------------------------------------------------------
// Plurales, mayúscula inicial y orden "natural" de nombres con números.
// =====================================================================

// "vence el 10/11" → "Vence el 10/11".
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

// "Carpeta 9" antes que "Carpeta 15": los números dentro de los nombres se ordenan por valor.
export function compareTitles(a: string, b: string): number {
  return a.localeCompare(b, 'es', { numeric: true, sensitivity: 'base' });
}
