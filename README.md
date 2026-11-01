# Gestión de Alquileres

Aplicación móvil (Expo + React Native + TypeScript) para la gestión de una cartera de propiedades en alquiler: propiedades, inquilinos, contratos y pagos.

## Funcionalidades

- **Inicio**: resumen con propiedades, contratos activos, ingreso mensual esperado, liquidaciones por vencer y vencidas, estado de cada propiedad (deudas, contratos por vencer) y liquidaciones pendientes. Incluye un botón para cargar datos de ejemplo y otro para borrar todo.
- **Propiedades**: alta, edición, eliminación y ficha con tipo, dirección, ambientes, superficie, alquiler (en dólares o pesos), expensas y servicios (en pesos). El estado (disponible / alquilada / mantenimiento) se actualiza automáticamente según los contratos activos. Cada ficha tiene su historial de pagos.
- **Inquilinos**: alta, edición, eliminación y ficha con datos de contacto y sus contratos asociados.
- **Contratos**: vinculan una propiedad con un inquilino, con fechas de inicio/fin, moneda, alquiler, depósito, día de pago y estado.
- **Liquidaciones**: cada mes se generan solas las liquidaciones de cada contrato activo (alquiler, y expensas y servicios si la propiedad los tiene). Se pueden editar, anular o crear a mano, y figuran como por vencer, vencidas o pagadas según lo pagado.
- **Pagos recibidos**: al registrar un pago se elige el concepto y cuánto paga (lo del mes, el total adeudado u otro monto); el sistema muestra a qué liquidaciones se aplica, acepta pagos parciales y deja el excedente a favor del inquilino. En los pagos en dólares se puede anotar la cotización usada. Las fechas se eligen con un calendario.
- **Historial y filtro por propiedad**: en Pagos, la vista Historial muestra el año calendario mes a mes (liquidado, pagado y sin pagar) con su total anual, y tocando un mes se ven sus liquidaciones. Las tres vistas de Pagos se pueden filtrar por propiedad con un buscador por carpeta, dirección, barrio o inquilino.
- **Cotización del dólar**: se descarga de [DolarAPI](https://dolarapi.com) (blue, oficial o MEP, promedio entre compra y venta) o se carga a mano. Los montos en dólares muestran su estimado en pesos.

Los datos se guardan localmente en el dispositivo con `AsyncStorage`, por lo que la app funciona sin backend. Solo la descarga de la cotización necesita conexión.

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
src/
  components/   Componentes de UI reutilizables (Card, Button, FormField, etc.)
  constants.ts  Catálogos y etiquetas (tipos de propiedad, estados, métodos de pago)
  context/      Estado global de la app y persistencia (DataContext)
  navigation/   Navegación por pestañas y stacks de cada sección
  screens/      Pantallas de cada módulo (propiedades, inquilinos, contratos, pagos)
  theme.ts      Paleta de colores, espaciados y tipografía
  types.ts      Modelos de datos (Property, Tenant, Contract, Payment)
  utils/        Formateo de fechas/moneda y utilidades de pagos
```
