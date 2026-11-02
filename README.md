# Gestión de Alquileres

Aplicación móvil (Expo + React Native + TypeScript) para la gestión de una cartera de propiedades en alquiler: propiedades, inquilinos, contratos y pagos.

## Funcionalidades

- **Inicio**: resumen con propiedades, contratos activos, ingreso mensual esperado, liquidaciones por vencer y vencidas, estado de cada propiedad (deudas, contratos por vencer) y liquidaciones pendientes.
- **Propiedades**: alta, edición, eliminación y ficha con tipo, dirección, ambientes, superficie, alquiler (en dólares o pesos), expensas y servicios (en pesos). El estado (disponible / alquilada / mantenimiento) se actualiza automáticamente según los contratos activos. Cada ficha tiene su historial de pagos.
- **Inquilinos**: alta, edición, eliminación y ficha con datos de contacto y sus contratos asociados.
- **Contratos**: vinculan una propiedad con un inquilino, con fechas de inicio/fin, moneda, alquiler, depósito, día de pago y estado.
- **Diseño**: estilo iOS minimalista, igual en todos los sistemas. Fondo gris con listas agrupadas, color reservado para el estado de cobro (rojo en mora, ámbar por vencer, verde al día, círculo vacío sin inquilino) y para lo que se puede tocar. El Inicio abre con un bloque de estado grande (mora o «Todo al día») y solo las carpetas que requieren atención. Deslizar hacia abajo actualiza la cotización y las fechas. «Eliminar» está dentro de cada formulario de edición.
- **Pestañas**: Inicio, Alquileres (propiedades, inquilinos y contratos en una sola pestaña, con un selector arriba), Pagos y Ajustes.
- **Ajustes y modo oscuro**: desde la pestaña Ajustes (a la derecha de Pagos) se elige la apariencia (Sistema, Claro u Oscuro) y la cotización del dólar, y se cierra la sesión (o, en modo demo, se cargan o borran los datos de ejemplo).
- **Liquidaciones**: cada mes se generan solas las liquidaciones de cada contrato activo (alquiler, y expensas y servicios si la propiedad los tiene). Se pueden editar, anular o crear a mano, y figuran como por vencer, vencidas o pagadas según lo pagado.
- **Pagos recibidos**: en un mismo recibo se pueden registrar varios conceptos a la vez (alquiler, expensas y servicios), cada uno con su monto; contrato, fecha y método se cargan una sola vez y los pagos quedan vinculados. Para cada concepto se elige cuánto paga (lo del mes, el total adeudado u otro monto); el sistema muestra a qué liquidaciones se aplica, acepta pagos parciales y deja el excedente a favor del inquilino. En los pagos en dólares se puede anotar la cotización usada. Las fechas se eligen con un calendario.
- **Historial y filtro por propiedad**: en Pagos, la vista Historial muestra el año calendario mes a mes (liquidado, pagado y sin pagar) con su total anual, y tocando un mes se ven sus liquidaciones. Las tres vistas de Pagos se pueden filtrar por propiedad con un buscador por carpeta, dirección, barrio o inquilino.
- **Buscador**: en cada vista de Alquileres (Propiedades, Inquilinos y Contratos) hay una barra de búsqueda que abre un buscador a pantalla completa. Busca cualquier parte del texto (sin importar mayúsculas ni acentos) en carpetas, calles, barrios, nombres, teléfonos, DNI y notas, y resalta las coincidencias. Los teléfonos y documentos se encuentran aunque se escriban sin espacios ni guiones.
- **Montos y saldo a favor**: los montos se pueden escribir como se usa en Argentina (1.500.000 o 1500,50). Si un inquilino paga de más, lo que queda a su favor se aplica solo a sus próximas liquidaciones del mismo concepto.
- **Contratos**: aviso de contratos que vencen en los próximos 60 días o ya vencidos, accesos directos a la propiedad y al inquilino, y llamada, WhatsApp o email desde la ficha del inquilino.
- **Cotización del dólar**: se descarga de [DolarAPI](https://dolarapi.com) (blue, oficial o MEP, promedio entre compra y venta) o se carga a mano. Los montos en dólares muestran su estimado en pesos.

- **Cuenta e inicio de sesión**: se ingresa con mail y contraseña. Hay una sola cuenta administradora (sin roles); cualquier otra cuenta ve el aviso «Esta cuenta no tiene acceso».
- **Modo demo**: desde la pantalla de ingreso, «Probar con datos de ejemplo» abre la app con una cartera de prueba guardada solo en el dispositivo, sin tocar la cuenta.

## Datos y Supabase

Con la cuenta administradora, los datos se guardan en [Supabase](https://supabase.com) (Postgres) y se ven desde cualquier dispositivo. Cada cambio se envía al momento; si falla (sin conexión), aparece un aviso rojo con «Reintentar» y los cambios quedan pendientes hasta que se guardan. El modo demo usa `AsyncStorage` en el dispositivo.

- **Tablas**: `properties`, `tenants`, `contracts`, `charges` (liquidaciones), `payments` (pagos con su reparto en `allocations`), `settings` y `exchange_rates`.
- **Seguridad**: Row Level Security en todas las tablas. Solo el mail que figura en `app_admins` puede leer o escribir (función `private.is_admin()`); las demás cuentas y los usuarios sin sesión no ven nada.
- **Migraciones**: en `supabase/migrations/`. Para agregar otra cuenta administradora: `insert into public.app_admins (email) values ('mail@ejemplo.com');` (en minúsculas).
- **Configuración**: la URL del proyecto y la clave publicable están en `src/lib/supabase.ts`. La clave publicable puede ir en la app; la clave `service_role` nunca.

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
supabase/migrations/  Esquema de la base y reglas de seguridad
src/
  components/   Componentes de UI reutilizables (Card, Button, FormField, etc.)
  constants.ts  Catálogos y etiquetas (tipos de propiedad, estados, métodos de pago)
  context/      Estado global: sesión (AuthContext), datos (DataContext), tema y cotización
  lib/          Cliente de Supabase y sincronización con la base (remoteStore)
  navigation/   Navegación por pestañas y stacks de cada sección
  screens/      Pantallas de cada módulo (ingreso, propiedades, inquilinos, contratos, pagos)
  theme.ts      Paleta de colores, espaciados y tipografía
  types.ts      Modelos de datos (Property, Tenant, Contract, Payment)
  utils/        Formateo de fechas/moneda y utilidades de pagos
```
