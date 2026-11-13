// =====================================================================
// Manual: capturas fijas
// ---------------------------------------------------------------------
// Saca las capturas de la app (modo de ejemplo) que usa public/manual.html. Los trámites con
// video se graban aparte (flows.js). Uso: node scripts/manual/capturas.js
// =====================================================================

const path = require('path');
const { chromium } = require('playwright');
const OUT = path.join(__dirname, '../../public/manual');
const APP = process.env.APP_URL || 'http://localhost:8124/';
(async () => {
  const b = await chromium.launch();
  const errors = [];
  const fresh = async (scheme = 'light') => {
    const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: scheme, timezoneId: 'America/Argentina/Buenos_Aires' });
    p.on('pageerror', (e) => errors.push(e.message));
    await p.route('**/dolarapi.com/**', (r) => r.fulfill({ json: [{ casa: 'blue', compra: 1400, venta: 1420 }, { casa: 'oficial', compra: 1350, venta: 1400 }, { casa: 'bolsa', compra: 1390, venta: 1410 }] }));
    await p.goto(APP); await p.waitForTimeout(2200);
    return p;
  };
  const shot = async (p, name) => { await p.waitForTimeout(900); await p.screenshot({ path: `${OUT}/${name}.jpg`, type: 'jpeg', quality: 82 }); console.log('ok', name); };
  const demo = async (p) => { await p.getByText('Probar con datos de ejemplo', { exact: true }).last().click(); await p.waitForTimeout(1500); };
  const tab = (p, name) => p.getByRole('tab', { name: new RegExp(name) }).last().click();
  const step = async (name, fn) => { try { await fn(); } catch (e) { console.log('FALLÓ', name, e.message.split('\n')[0]); } };

  await step('ingreso', async () => { const p = await fresh(); await shot(p, '01-ingreso'); await p.close(); });
  await step('inicio', async () => { const p = await fresh(); await demo(p); await shot(p, '02-inicio'); await p.close(); });
  await step('alquileres', async () => { const p = await fresh(); await demo(p); await tab(p, 'Alquileres'); await shot(p, '03-alquileres'); await p.close(); });
  await step('ficha', async () => {
    const p = await fresh(); await demo(p); await tab(p, 'Alquileres'); await p.waitForTimeout(800);
    await p.getByText('Carpeta 64', { exact: true }).last().click(); await shot(p, '04-ficha');
    await p.getByText('Ver contrato', { exact: true }).last().click(); await shot(p, '05-contrato');
    await p.close();
  });
  await step('cobro', async () => {
    const p = await fresh(); await demo(p); await tab(p, 'Alquileres'); await p.waitForTimeout(800);
    await p.getByText('Carpeta 64', { exact: true }).last().click(); await p.waitForTimeout(900);
    await p.getByText('Registrar cobro', { exact: true }).last().click(); await p.waitForTimeout(900);
    await p.getByText('Continuar', { exact: true }).last().click(); await shot(p, '07-cobro-confirmar');
    await p.getByText('Confirmar cobro', { exact: true }).last().click(); await shot(p, '08-cobro-listo');
    await p.close();
  });
  await step('cobros', async () => { const p = await fresh(); await demo(p); await tab(p, 'Cobros'); await shot(p, '09-cobros'); await p.close(); });
  await step('historial', async () => {
    const p = await fresh(); await demo(p); await tab(p, 'Alquileres'); await p.waitForTimeout(800);
    await p.getByText('Carpeta 64', { exact: true }).last().click(); await p.waitForTimeout(900);
    await p.getByText('Historial por mes', { exact: true }).last().click(); await shot(p, '10-historial'); await p.close();
  });
  await step('dolar', async () => { const p = await fresh(); await demo(p); await p.getByRole('button', { name: 'Cotización del dólar' }).first().click(); await shot(p, '14-dolar'); await p.close(); });
  await step('menu', async () => { const p = await fresh(); await demo(p); await tab(p, 'Menú'); await shot(p, '15-menu'); await p.close(); });
  await step('oscuro', async () => { const p = await fresh('dark'); await demo(p); await shot(p, '16-inicio-oscuro'); await p.close(); });
  console.log('errors', errors);
  await b.close();
})();
