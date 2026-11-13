const { Recorder, openDemo, vis, chromium } = require('./recorder');
// =====================================================================
// Recorridos del manual: los cuatro trámites
// ---------------------------------------------------------------------
// Cargar una propiedad, nuevo contrato, registrar cobro y cargar importes. Cada paso dice qué
// tocar o escribir y el texto que muestra el manual. Uso: node scripts/manual/flows.js
// [propiedad contrato cobro importes]. Deja el video, la portada y recorridos.json en
// public/manual/recorridos/.
// =====================================================================

const fs = require('fs');
const os = require('os');
const path = require('path');
const OUT = path.join(__dirname, '../../public/manual/recorridos');
const FR = path.join(os.tmpdir(), 'locatia-recorridos');

const flows = {
  async propiedad(page, r) {
    await page.getByRole('tab', { name: 'Alquileres' }).click(); await page.waitForTimeout(900);
    await r.shot(900);
    await r.tap(vis(page, page.getByRole('button', { name: 'Nueva propiedad' })), 'En Alquileres, tocá el + de arriba para cargar una propiedad.');
    await r.type(vis(page, page.getByPlaceholder('Ej: Carpeta 102')), 'Carpeta 150', 'Nombre: cómo la llamás. Tocá el campo y se completa solo.');
    await r.type(vis(page, page.getByPlaceholder('Calle, número y piso')), 'Av. Cabildo 1500 3°B', 'Dirección: calle, número y piso.');
    await r.type(vis(page, page.getByPlaceholder('Ej: Belgrano')), 'Belgrano', 'Barrio: ayuda a buscar y ordenar.');
    await r.tap(vis(page, page.getByText('Departamento', { exact: true })), 'Tipo de propiedad: elegí el que corresponda.', { settle: 400 });
    const expensas = page.getByText('Expensas mensuales en pesos (opcional)').locator('xpath=following-sibling::*[1]');
    await r.type(vis(page, expensas), '85000', 'Expensas por mes (opcional): si tiene, la app las cobra cada mes junto con el alquiler.');
    await r.tap(vis(page, page.getByText('Crear propiedad', { exact: true })), 'Tocá Crear propiedad.');
    await r.tap(vis(page, page.getByText('Cancelar', { exact: true })), 'La app ofrece cargar el contrato ahora. Para este ejemplo, tocá Cancelar: se puede cargar después.');
    await r.box(vis(page, page.getByText('Carpeta 150', { exact: true })));
    await r.shot(300);
    await r.finish('¡Listo! Carpeta 150 ya está en Alquileres, como disponible.');
  },

  async contrato(page, r) {
    await r.shot(900);
    await r.tap(vis(page, page.getByRole('button', { name: 'Nuevo contrato', exact: true })), 'En Inicio, tocá Nuevo contrato.');
    await r.tap(vis(page, page.getByText('Elegí una propiedad', { exact: true })), 'Elegí la propiedad que se alquila.', { settle: 600 });
    await r.tap(vis(page, page.getByText('Carpeta 9', { exact: true })), 'Tocá Carpeta 9: está disponible.');
    await r.type(vis(page, field(page, 'Nombre y apellido (o razón social)')), 'Ana Gómez', 'Inquilino: nombre y apellido.');
    await r.type(vis(page, field(page, 'DNI o CUIT')), '30123456', 'DNI o CUIT.');
    await r.type(vis(page, field(page, 'Teléfono')), '1155550000', 'Teléfono: con esto andan los botones de WhatsApp y llamar.');
    await r.tap(vis(page, field(page, 'Fecha de fin')), 'Fecha de fin: tocala para abrir el calendario. La de inicio ya viene con la de hoy.', { settle: 500 });
    const next = vis(page, page.getByLabel('Mes siguiente', { exact: true }));
    for (let i = 0; i < 24; i++) { await next.click(); await page.waitForTimeout(40); await r.shot(i < 3 ? 260 : 70); }
    await r.tap(vis(page, page.getByLabel(endLabel(), { exact: true })), 'Con las flechas se pasa de mes. Tocá el día en que termina.');
    await r.box(vis(page, page.getByText('Ajuste del alquiler', { exact: true })));
    await r.shot(1300);
    await r.tap(vis(page, page.getByText('IPC', { exact: true })), 'El alquiler vino del precio publicado. Elegí cómo se ajusta: por IPC, cada 3 meses.', { settle: 500 });
    await r.type(vis(page, field(page, 'Día de vencimiento')), '10', 'Día de vencimiento: hasta qué día de cada mes tiene para pagar.', { clear: true });
    await r.tap(vis(page, page.getByText('Crear contrato', { exact: true })), 'Tocá Crear contrato.', { settle: 1000 });
    await r.finish('¡Listo! Carpeta 9 ya figura alquilada a Ana Gómez, y la app creó sola el cargo del mes.');
  },

  async cobro(page, r) {
    await r.shot(900);
    await r.tap(vis(page, page.getByRole('button', { name: 'Registrar cobro', exact: true })), 'En Inicio, tocá Registrar cobro.');
    await r.tap(vis(page, page.getByText('Elegí un contrato', { exact: true })), 'Elegí de quién es el cobro.', { settle: 600 });
    await r.tap(vis(page, page.getByText('Carpeta 64', { exact: true })), 'Tocá Carpeta 64 (Diego Herrera).');
    await r.shot(900);
    await r.tap(vis(page, page.getByText('Saldo total', { exact: true })), 'Arriba ves cuánto debe. Elegí qué te pagó: el saldo total, solo lo vencido u otro importe.', { settle: 400 });
    await r.tap(vis(page, page.getByText('Efectivo', { exact: true })), 'Elegí el medio de pago.', { settle: 400 });
    await r.tap(vis(page, page.getByText('Continuar', { exact: true })), 'Tocá Continuar.');
    await r.shot(1200);
    await r.tap(vis(page, page.getByText('Confirmar cobro', { exact: true })), 'Revisá a qué cargos se aplica y tocá Confirmar cobro.');
    await r.finish('¡Listo! Desde acá podés mandarle el recibo por WhatsApp.');
  },

  async importes(page, r) {
    await r.shot(900);
    await r.tap(vis(page, page.getByRole('button', { name: 'Expensas y servicios', exact: true })), 'En Inicio, tocá Expensas y servicios (el último acceso de arriba).');
    await r.tap(vis(page, page.getByRole('button', { name: /Carpeta 64/ })), 'Están las expensas del mes. Tocá una fila para cargar el importe nuevo.', { settle: 500 });
    const input = (name) => vis(page, page.getByLabel(`Importe de ${name}`, { exact: true }));
    await r.type(input('Carpeta 64'), '128000', 'Escribí el importe nuevo.', { clear: true });
    await r.tap(vis(page, page.getByText('Listo · siguiente', { exact: true })), 'Tocá Listo · siguiente: pasa a la próxima fila.', { settle: 500 });
    await r.type(input('Carpeta 83'), '74500', 'Otra que cambió.', { clear: true });
    await r.tap(vis(page, page.getByText('Listo · siguiente', { exact: true })), 'Listo · siguiente.', { settle: 500 });
    await r.tap(vis(page, page.getByText(/^Mantener el importe anterior/)), 'Las que no cambiaron se confirman todas juntas.', { settle: 500 });
    await r.tap(vis(page, page.getByText(/^Guardar \d+ importes$/)), 'Tocá Guardar.', { settle: 600 });
    await r.tap(vis(page, page.getByRole('button', { name: 'Guardar', exact: true })), 'Confirmá. Los importes nuevos quedan para los meses siguientes.', { settle: 900 });
    await r.finish('¡Listo! Las expensas del mes quedaron cargadas.');
  },
};

// El campo de un formulario a partir de su título.
function field(page, label) {
  return page.getByText(label, { exact: false }).locator('xpath=following-sibling::*[1]');
}

// Fin del contrato: dos años desde hoy, el día anterior (como se acostumbra).
function endLabel() {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
  const d = new Date(now.getFullYear() + 2, now.getMonth(), now.getDate() - 1);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

(async () => {
  const only = process.argv.slice(2);
  const browser = await chromium.launch();
  fs.mkdirSync(OUT, { recursive: true });
  const indexFile = OUT + '/recorridos.json';
  const index = fs.existsSync(indexFile) ? JSON.parse(fs.readFileSync(indexFile)) : {};
  for (const [name, run] of Object.entries(flows)) {
    if (only.length && !only.includes(name)) continue;
    const page = await openDemo(browser);
    const r = new Recorder(page, `${FR}/${name}`);
    await run(page, r);
    index[name] = r.encode(OUT, name);
    console.log(name, index[name].duration + 's', index[name].steps.length, 'pasos');
    await page.context().close();
  }
  fs.writeFileSync(indexFile, JSON.stringify(index, null, 1));
  await browser.close();
})();
