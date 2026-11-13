// =====================================================================
// Marca de Locatia: genera los íconos
// ---------------------------------------------------------------------
// El logo es una L: el palito es un edificio con techo inclinado y ventanas, el piso es vereda y
// calle (unidas por un corte en el medio de la línea que las separa), y al lado va la casita con
// su puerta. Las ventanas y la puerta son huecos (se ve el fondo), así funciona igual sobre azul,
// blanco o transparente.
// Uso: node scripts/marca/logo.js  (necesita Playwright). Deja los PNG en assets/ y public/, e
// imprime el SVG para pegar en las páginas públicas (por ejemplo, la portada del manual).
// =====================================================================

const path = require('path');
const { chromium } = require('playwright');

const BLUE = '#0A4FA8';
const WHITE = '#FFFFFF';
const ROOT = path.join(__dirname, '../..');

// Ventana de 6×7 con las puntas apenas redondeadas.
const win = (x, y) => `M${x + 1} ${y}h4a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1z`;
const WINDOWS = [48, 60, 72, 84].map((y) => win(47, y) + win(57, y)).join('');

// Dibujo en unidades de 160 (centrado en 80,80).
function mark(fill) {
  return `<g transform="translate(-2 2)" fill="${fill}">` +
    `<path fill-rule="evenodd" d="M42 40L68 28V104H42Z${WINDOWS}"/>` +
    `<path d="M42 100H122V110H42Z"/><path d="M42 114H122V126H42Z"/><path d="M80 109H84V115H80Z"/>` +
    `<path d="M74 76L98 52L122 76V94H104V80Q104 78 102 78H94Q92 78 92 80V94H74Z"/>` +
    `</g>`;
}
// Achicado (para el ícono adaptable de Android, que recorta los bordes).
const scaled = (fill, s) => `<g transform="translate(80 80) scale(${s}) translate(-80 -80)">${mark(fill)}</g>`;
const tile = (radius) => `<rect width="160" height="160" rx="${radius}" fill="${BLUE}"/>${mark(WHITE)}`;

const JOBS = [
  { file: 'assets/icon.png', size: 1024, body: `<rect width="160" height="160" fill="${BLUE}"/>${mark(WHITE)}`, opaque: true },
  { file: 'assets/android-icon-foreground.png', size: 1024, body: scaled(WHITE, 0.62) },
  { file: 'assets/android-icon-monochrome.png', size: 1024, body: scaled(WHITE, 0.62) },
  { file: 'assets/android-icon-background.png', size: 1024, body: `<rect width="160" height="160" fill="${BLUE}"/>`, opaque: true },
  { file: 'assets/favicon.png', size: 48, body: tile(36) },
  { file: 'assets/brand-tile.png', size: 256, body: tile(36) },
  { file: 'assets/splash-icon.png', size: 1024, body: tile(36) },
  { file: 'public/locatia-logo.png', size: 256, body: tile(36) },
];

(async () => {
  const browser = await chromium.launch();
  for (const job of JOBS) {
    const page = await browser.newPage({ viewport: { width: job.size, height: job.size } });
    await page.setContent(`<html><body style="margin:0;background:transparent"><svg width="${job.size}" height="${job.size}" viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg">${job.body}</svg></body></html>`);
    await page.screenshot({ path: path.join(ROOT, job.file), omitBackground: !job.opaque });
    await page.close();
    console.log('ok', job.file);
  }
  await browser.close();
  console.log('\nSVG para páginas públicas:\n' + `<svg viewBox="0 0 160 160" aria-hidden="true">${tile(36)}</svg>`);
})();
