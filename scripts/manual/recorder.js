// =====================================================================
// Recorridos del manual: grabador
// ---------------------------------------------------------------------
// Graba un recorrido de la app (modo de ejemplo) cuadro por cuadro: arma el video (mp4, con
// ffmpeg) y anota dónde pausar y qué zona tocar en cada paso, para el modo «Probalo vos» del
// manual. Los recorridos están en flows.js; cómo correrlo, en el README.
// =====================================================================
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const W = 390, H = 844;
// La app web compilada (npx expo export -p web) servida en local.
const APP = process.env.APP_URL || 'http://localhost:8124/';

class Recorder {
  constructor(page, dir) {
    this.page = page; this.dir = dir; this.frames = []; this.steps = []; this.time = 0; this.n = 0;
    fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  }
  async shot(ms) {
    const file = path.join(this.dir, `f${String(this.n++).padStart(4, '0')}.png`);
    await this.page.screenshot({ path: file });
    this.frames.push({ file, ms }); this.time += ms;
  }
  async wait(ms) { await this.page.waitForTimeout(ms); }
  // Cuadros después de una acción, para que se vea la transición.
  async settle(total = 700) {
    for (const ms of [90, 140, 200, Math.max(100, total - 430)]) { await this.wait(ms); await this.shot(ms); }
  }
  async box(locator) {
    await locator.scrollIntoViewIfNeeded(); await this.wait(250);
    const b = await locator.boundingBox();
    if (!b) throw new Error('sin caja');
    return b;
  }
  // Paso para tocar: pausa con la zona marcada, toque visible, transición.
  async tap(locator, text, { pause = true, hold = 1600, settle = 700 } = {}) {
    const b = await this.box(locator);
    if (pause) this.steps.push({ t: +(this.time / 1000 + 0.12).toFixed(3), box: pct(b), text, kind: 'tap' });
    await this.shot(pause ? hold : 150);
    await this.indicator(b, true); await this.shot(220); await this.indicator(b, false);
    await locator.click(); await this.settle(settle);
  }
  // Paso para escribir: pausa en el campo y después se escribe solo.
  async type(locator, value, text, { hold = 1400, clear = false } = {}) {
    const b = await this.box(locator);
    this.steps.push({ t: +(this.time / 1000 + 0.12).toFixed(3), box: pct(b), text, kind: 'type' });
    await this.shot(hold);
    await this.indicator(b, true); await this.shot(180); await this.indicator(b, false);
    await locator.click(); await this.wait(80);
    if (clear) { await locator.fill(''); await this.wait(40); await this.shot(120); }
    for (let i = 0; i < value.length; i += 2) {
      await locator.pressSequentially(value.slice(i, i + 2)); await this.wait(30); await this.shot(75);
    }
    await this.shot(450);
  }
  async indicator(b, on) {
    await this.page.evaluate(({ x, y, on }) => {
      document.getElementById('__tap')?.remove();
      if (!on) return;
      const d = document.createElement('div'); d.id = '__tap';
      Object.assign(d.style, { position: 'fixed', left: `${x - 24}px`, top: `${y - 24}px`, width: '48px', height: '48px',
        borderRadius: '50%', background: 'rgba(10,79,168,0.28)', border: '3px solid rgba(10,79,168,0.9)', zIndex: 2147483647, pointerEvents: 'none' });
      document.body.appendChild(d);
    }, { x: b.x + b.width / 2, y: b.y + b.height / 2, on });
  }
  // Final: queda quieto con el resultado.
  async finish(text, hold = 2600) {
    this.steps.push({ t: +(this.time / 1000 + 0.12).toFixed(3), box: null, text, kind: 'done' });
    await this.shot(hold);
  }
  encode(outDir, name) {
    const list = this.frames.map((f) => `file '${f.file}'\nduration ${(f.ms / 1000).toFixed(3)}`).join('\n') + `\nfile '${this.frames.at(-1).file}'\n`;
    const listFile = path.join(this.dir, 'list.txt'); fs.writeFileSync(listFile, list);
    const mp4 = path.join(outDir, `${name}.mp4`);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', listFile,
      '-vf', 'fps=30,scale=780:1688,format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-crf', '27',
      '-movflags', '+faststart', '-an', mp4]);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', this.frames[0].file, '-vf', 'scale=780:1688', '-q:v', '5', path.join(outDir, `${name}.jpg`)]);
    return { duration: +(this.time / 1000).toFixed(3), steps: this.steps };
  }
}
const pct = (b) => ({ x: +(b.x / W * 100).toFixed(2), y: +(b.y / H * 100).toFixed(2), w: +(b.width / W * 100).toFixed(2), h: +(b.height / H * 100).toFixed(2) });

async function openDemo(browser) {
  const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, timezoneId: 'America/Argentina/Buenos_Aires', locale: 'es-AR' });
  const page = await context.newPage();
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  await page.route('**/dolarapi.com/**', (r) => r.fulfill({ json: [{ casa: 'blue', compra: 1400, venta: 1420 }] }));
  await page.goto(APP); await page.waitForTimeout(2000);
  await page.getByText('Probar con datos de ejemplo', { exact: true }).last().click(); await page.waitForTimeout(1800);
  return page;
}
const vis = (page, loc) => loc.locator('visible=true').last();

module.exports = { Recorder, openDemo, vis, chromium };
