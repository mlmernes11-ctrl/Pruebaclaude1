# Locatia

App (Expo + React Native + TypeScript + Supabase) para administrar una cartera de alquileres: propiedades, contratos con su inquilino, cargos de cada mes y cobros. Funciona como app de Android (APK) y como web; la web se adapta sola a celular o computadora.

## Pantallas

- **Inicio**: responde «¿qué hago hoy?». Cuatro accesos directos (registrar cobro, recordar deuda, cargar importes, nuevo contrato); «Tus alquileres» con quién debe y quién tiene un vencimiento cerca, con nombre, monto y fecha, y cuántas propiedades están al día o sin alquilar; debajo, los otros pendientes (importes por cargar, contratos por renovar o ajustar). Arriba, la cotización del dólar.
- **Alquileres**: responde «¿qué tengo?». Una tarjeta por propiedad con su estado de pago, el alquiler, hasta cuándo va el contrato y el inquilino con WhatsApp y llamada; buscador y «Filtrar y ordenar». La ficha de la propiedad muestra el contrato vigente, la cuenta corriente, los últimos importes y el historial de contratos. El inquilino se carga dentro del contrato.
- **Cobros**: Vencido, A vencer y Cobrado del mes, con «Filtrar» por propiedad, estado y mes, y el «Historial por mes». «Registrar cobro» va en 3 pasos (importe → confirmar → listo), como en el banco.
- **Menú**: cuenta, «Expensas y servicios», cotización del dólar, apariencia (Sistema / Claro / Oscuro), privacidad, cerrar sesión y eliminar cuenta.
- **Expensas y servicios** (último acceso de Inicio): los importes del mes de expensas, servicios y alquiler, propiedad por propiedad, con «Igual que el mes anterior» o «Mantener el importe anterior en las pendientes».

## Vocabulario

Cargo (lo que se debe por un concepto y un mes) · Cobro (lo que se recibió) · Recibo · Cuenta corriente · Saldo · Saldo a favor · Vencido / A vencer / Pagado / Pago parcial · Contrato Vigente / Finalizado / Rescindido. «Liquidación» queda reservada para la futura rendición a propietarios.

## Cómo funciona

- **Cargos automáticos**: el servidor crea cada día los cargos del mes que falten (alquiler, expensas y servicios) y aplica los ajustes del alquiler por IPC (INDEC), ICL (BCRA) o porcentaje fijo. También aplica el saldo a favor a los próximos cargos del mismo concepto. Función `bill_account`, tarea diaria `cargos-del-mes`.
- **Cobros**: un importe cubre primero el mes más viejo y, dentro del mes, alquiler → servicios → expensas; se registra un cobro por concepto y lo que sobra queda como saldo a favor. Se puede cobrar en pesos un alquiler en dólares, con la cotización del día o una manual.
- **Sincronización**: cada cambio se envía al momento (solo lo que cambió). La app consulta cada minuto si hubo cambios en la cuenta (`account_versions`) y relee solo si los hubo; también al volver a la app y al deslizar hacia abajo. Sin conexión, aparece un aviso con «Reintentar» y los cambios quedan pendientes.
- **Modo demo**: «Probar con datos de ejemplo» abre una cartera de prueba guardada solo en el dispositivo; ahí los cargos y el saldo a favor los calcula la app.

## Base de datos (Supabase)

- **Tablas**: `properties`, `tenants`, `contracts`, `charges` (cargos), `payments` (cobros), `payment_allocations` (a qué cargo va cada parte de un cobro), `account_versions`, `settings`, `exchange_rates` y `price_indices`.
- **Seguridad**: cada fila tiene su dueño (`user_id`, lo completa la base) y las reglas de seguridad (RLS) dejan ver y tocar solo las filas propias. Las relaciones incluyen la cuenta, así un contrato no puede apuntar a la propiedad de otra.
- **Funciones del servidor** (`supabase/functions/`): `daily-exchange-rates` (dólar del día, 11 h), `daily-indices` (IPC e ICL) y `delete-account` (borra la cuenta y todos sus datos).
- **Migraciones**: `supabase/migrations/`. Los tipos de la app (`src/lib/database.types.ts`) salen de la base, y `remoteStore.ts` falla al compilar si falta una columna.
- **Claves**: la URL y la clave publicable están en `src/lib/supabase.ts`. La clave `service_role` nunca va en la app.

## Publicación

- **Web**: Vercel publica cada cambio (`vercel.json`).
- **APK**: GitHub › Actions › «Armar APK». Lo arma Expo (EAS, `eas.json`); el enlace queda en expo.dev › Builds o en «Estado del APK».
- **Link para descargar el APK**: `/descargar` (por ejemplo, gestion-alquileres-sero0.vercel.app/descargar) lleva al último APK. Cuando se arma uno nuevo, se cambia su destino en `vercel.json` por el enlace que muestra «Estado del APK».
- **Manual de uso**: `public/manual.html` (gestion-alquileres-sero0.vercel.app/manual.html), con capturas en `public/manual/`. En la app, Menú › Ayuda.
- **Recorridos del manual** (video + «Probalo vos»): `public/manual/recorridos/`. Se graban de la app real en modo de ejemplo. Si cambia una de esas pantallas, volver a grabarlos (necesita Playwright y ffmpeg):
  1. `npx expo export -p web` y servir `dist/` en `http://localhost:8124/` con un servidor que acepte pedidos por partes (por ejemplo `npx serve dist -l 8124`).
  2. `node scripts/manual/flows.js` (o solo algunos: `node scripts/manual/flows.js cobro importes`).
  3. Las capturas fijas del manual: `node scripts/manual/capturas.js`.
- **Actualizar la app sin APK nuevo**: GitHub › Actions › «Actualizar la app» (actualización OTA de Expo).
- **Mantener Supabase activo**: «Mantener activo el servidor» corre cada 3 días.
- Los workflows usan el secreto `EXPO_TOKEN` de GitHub.

## Desarrollo

```bash
npm install
npm run web       # versión web
npm run android   # emulador o celular Android
npx tsc --noEmit  # chequeo de tipos
```

## Estructura

```
App.tsx               Punto de entrada: tema, sesión, datos, cotización
supabase/             Migraciones y funciones del servidor
public/               Páginas públicas (privacidad, eliminar cuenta)
src/
  types.ts            Forma de cada dato (propiedad, inquilino, contrato, cargo, cobro)
  constants.ts        Textos de cada valor (tipos, estados, monedas, conceptos)
  theme.ts            Colores claro/oscuro, espacios y tamaños de letra
  context/            Sesión, datos, tema y cotización
  lib/                Conexión con Supabase y sincronización (remoteStore)
  navigation/         Pestañas y pantallas de cada una
  screens/            Pantallas por tema (cobros, propiedades, contratos, importes…)
  components/         Piezas reutilizables (filas, botones, buscador, calendario…)
  utils/              Cálculos: cuenta corriente, cargos, ajustes, búsqueda, formatos
```

Cada archivo empieza con un encabezado que dice qué hace, y los bloques se separan con `// ── Nombre ──`.
