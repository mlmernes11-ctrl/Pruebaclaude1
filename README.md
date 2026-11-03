# Gestión de Alquileres

Aplicación (Expo + React Native + TypeScript) para la gestión de una cartera de propiedades en alquiler: propiedades, inquilinos, contratos y pagos. Funciona como app de Android (APK) y como web; la web se adapta sola a celular o computadora.

## Funcionalidades

- **Inicio**: resumen con propiedades, contratos activos, ingreso mensual esperado, liquidaciones por vencer y vencidas, estado de cada propiedad (deudas, contratos por vencer) y liquidaciones pendientes.
- **Propiedades**: alta, edición, eliminación y ficha con tipo, dirección, ambientes, superficie, alquiler (en dólares o pesos), expensas y servicios (en pesos). El estado (disponible / alquilada / mantenimiento) se actualiza automáticamente según los contratos activos. Cada ficha tiene su historial de pagos.
- **Inquilinos**: alta, edición, eliminación y ficha con datos de contacto y sus contratos asociados.
- **Contratos**: vinculan una propiedad con un inquilino, con fechas de inicio/fin, moneda, alquiler, depósito, día de pago y estado.
- **Diseño**: estilo iOS minimalista, igual en todos los sistemas. Fondo gris con listas agrupadas, color reservado para el estado de cobro (rojo en mora, ámbar por vencer, verde al día, círculo vacío sin inquilino) y para lo que se puede tocar. El Inicio abre con un bloque de estado grande (mora o «Todo al día») y solo las carpetas que requieren atención. Deslizar hacia abajo actualiza la cotización y las fechas. «Eliminar» está dentro de cada formulario de edición.
- **Pestañas**: Inicio, Alquileres (propiedades, inquilinos y contratos en una sola pestaña, con un selector arriba), Pagos y Ajustes.
- **Ajustes y modo oscuro**: desde la pestaña Ajustes (a la derecha de Pagos) se elige la apariencia (Sistema, Claro u Oscuro) y la cotización del dólar, y se cierra la sesión (o, en modo demo, se cargan o borran los datos de ejemplo).
- **Liquidaciones**: cada mes se generan solas las liquidaciones de cada contrato activo (alquiler, y expensas y servicios si la propiedad los tiene). Se pueden editar, anular o crear a mano, y figuran como por vencer, vencidas o pagadas según lo pagado.
- **Pagos recibidos**: en un mismo recibo se pueden registrar varios conceptos a la vez (alquiler, expensas y servicios), cada uno con su monto; contrato, fecha y método se cargan una sola vez y los pagos quedan vinculados. Para cada concepto se elige cuánto paga (lo del mes, el total adeudado u otro monto); el sistema muestra a qué liquidaciones se aplica, acepta pagos parciales y deja el excedente a favor del inquilino. Las fechas se eligen con un calendario.
- **Pago en pesos de algo en dólares**: en un alquiler en dólares se elige «Paga en: Pesos», se escriben los pesos que entregó y la cotización (Blue, Oficial o MEP la completan con el valor del día; tocarla a mano la pasa a Manual; también se puede escribir el resultado en dólares). La app muestra «$ 1.551.000 ÷ $ 1.410 = US$ 1.100», descuenta esos dólares de la deuda y guarda los pesos recibidos y la cotización usada.
- **Buscador en Pagos**: en Recibidos y Liquidaciones hay una barra de búsqueda que filtra la lista y los totales mientras escribís, y resalta lo que coincide. Busca por carpeta, inquilino, concepto, mes, estado, método de pago, notas y monto (un monto se encuentra con o sin puntos: «95000» encuentra «$ 95.000»). Si coincide algo que la fila no muestra, como el método o una nota, aparece en una línea extra.
- **Pagos desde la ficha**: en la ficha de cada propiedad, «Liquidaciones» y «Pagos recibidos» abren la pestaña Pagos ya filtrada por esa carpeta; «Historial por mes» muestra su año mes a mes.
- **Historial y filtro por propiedad**: en Pagos, la vista Historial muestra el año calendario mes a mes (liquidado, pagado y sin pagar) con su total anual, y tocando un mes se ven sus liquidaciones. Las tres vistas de Pagos se pueden filtrar por propiedad con un buscador por carpeta, dirección, barrio o inquilino.
- **Buscador**: en cada vista de Alquileres (Propiedades, Inquilinos y Contratos) hay una barra de búsqueda que abre un buscador a pantalla completa. Busca cualquier parte del texto (sin importar mayúsculas ni acentos) en carpetas, calles, barrios, nombres, teléfonos, DNI y notas, y resalta las coincidencias. Los teléfonos y documentos se encuentran aunque se escriban sin espacios ni guiones.
- **Montos y saldo a favor**: los montos se pueden escribir como se usa en Argentina (1.500.000 o 1500,50). Si un inquilino paga de más, lo que queda a su favor se aplica solo a sus próximas liquidaciones del mismo concepto.
- **Contratos**: aviso de contratos que vencen en los próximos 60 días o ya vencidos, accesos directos a la propiedad y al inquilino, y llamada, WhatsApp o email desde la ficha del inquilino.
- **Cotización del dólar**: una función del servidor guarda una vez por día (11 h) el blue, el oficial y el MEP de [DolarAPI](https://dolarapi.com); ese valor queda fijo todo el día y es el mismo para todos. Cada cuenta elige cuál usar o carga uno a mano. «Ver en tiempo real» muestra el valor de ese momento sin cambiar el del día. Los montos en dólares muestran su estimado en pesos.
- **Versión de escritorio**: con pantalla grande (1024 px o más) la app usa barra lateral, tablas en Pagos, Inicio en dos columnas y en Alquileres la ficha al costado de la lista. En el celular se ve igual que el APK.

- **Cuentas e inicio de sesión**: cualquiera puede crear una cuenta (con Google o con mail y contraseña) y cada cuenta ve solo sus propios datos.
- **Modo demo**: desde la pantalla de ingreso, «Probar con datos de ejemplo» abre la app con una cartera de prueba guardada solo en el dispositivo, sin tocar la cuenta.

## Datos y Supabase

Con una cuenta, los datos se guardan en [Supabase](https://supabase.com) (Postgres) y se ven desde cualquier dispositivo con esa cuenta. Cada cambio se envía al momento; si falla (sin conexión), aparece un aviso rojo con «Reintentar» y los cambios quedan pendientes hasta que se guardan. El modo demo usa `AsyncStorage` en el dispositivo.

- **Tablas**: `properties`, `tenants`, `contracts`, `charges` (liquidaciones), `payments` (pagos con su reparto en `allocations`), `settings` y `exchange_rates`.
- **Seguridad**: cada fila tiene su dueño (`user_id`, lo completa la base). Las reglas de seguridad (Row Level Security) dejan leer y escribir solo las filas propias, y las relaciones incluyen la cuenta, así un contrato no puede apuntar a la propiedad de otra cuenta. Sin sesión no se ve nada. La cotización del día (`exchange_rates`) la leen todas las cuentas y solo la escribe el servidor.
- **Cotización del día**: función `supabase/functions/daily-exchange-rates`, que corre todos los días a las 11 h (tarea `cotizacion-del-dia` de pg_cron).
- **Migraciones**: en `supabase/migrations/`.
- **Configuración**: la URL del proyecto y la clave publicable están en `src/lib/supabase.ts`. La clave publicable puede ir en la app; la clave `service_role` nunca.

## Publicación

- **Web**: Vercel construye y publica la versión web en cada cambio (configuración en `vercel.json`).
- **APK de Android**: GitHub › Actions › «Armar APK» › Run workflow. Lo arma Expo (EAS Build, configuración en `eas.json`) y el enlace de descarga aparece en expo.dev › Builds. Necesita el secreto `EXPO_TOKEN` en GitHub.
- **Ingreso con Google**: se activa en Supabase › Authentication › Sign In / Providers › Google, con el cliente OAuth creado en Google Cloud.

## Requisitos

- Node.js 18+
- npm

## Instalación

```bash
npm install
```

## Ejecución

```bash
npm run start   # abre el menú de Expo (QR para dispositivo físico)
npm run android # emulador/dispositivo Android
npm run ios     # simulador iOS (requiere macOS)
npm run web     # versión web para pruebas rápidas
```

## Estructura del proyecto

```
App.tsx                 Punto de entrada: tema, sesión, datos, cotización y qué pantalla se ve
supabase/migrations/    Tablas de la base, reglas de seguridad y descripciones
supabase/functions/     Función del servidor que guarda la cotización del día
vercel.json, eas.json   Publicación de la web (Vercel) y armado del APK (Expo)
src/
  types.ts              Forma de cada dato (propiedad, inquilino, contrato, liquidación, pago)
  constants.ts          Textos de cada valor (tipos, estados, monedas, conceptos)
  theme.ts              Colores del modo claro y oscuro, espacios y tamaños de letra
  context/              Estado compartido: sesión (Auth), datos (Data), tema y cotización
  hooks/                useIsDesktop (¿pantalla grande?) y deslizar para actualizar
  lib/                  Conexión con Supabase y guardado en la base (remoteStore)
  navigation/           Pestañas y pantallas de cada una
  screens/              Pantallas, agrupadas por tema (pagos, propiedades, inquilinos…)
  components/           Piezas reutilizables (filas de lista, botones, buscador, calendario…)
  utils/                Cálculos: liquidaciones, cuenta corriente, búsqueda, formatos, estados
```

### Cómo está comentado el código

- Cada archivo empieza con un encabezado que dice qué hace.
- Los bloques se separan con `// ── Nombre ──` (por ejemplo «Estilos», «Pantalla», «Constantes»), y dentro de las pantallas grandes con `// — Nombre —` (estado, totales, acciones, dibujo).
- Todo lo que decide colores y etiquetas de estado (el semáforo) está en `src/utils/status.ts`; los colores en sí, en `src/theme.ts`.
