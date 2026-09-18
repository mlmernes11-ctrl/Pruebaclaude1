# Gestión de Alquileres

Aplicación móvil (Expo + React Native + TypeScript) para la gestión de una cartera de propiedades en alquiler: propiedades, inquilinos, contratos y pagos.

## Funcionalidades

- **Inicio**: resumen con cantidad de propiedades, contratos activos, ingreso mensual esperado, pagos pendientes/vencidos y próximos cobros.
- **Propiedades**: alta, edición, eliminación y ficha con tipo, dirección, ambientes, superficie y alquiler mensual. El estado (disponible / alquilada / mantenimiento) se actualiza automáticamente según los contratos activos.
- **Inquilinos**: alta, edición, eliminación y ficha con datos de contacto y sus contratos asociados.
- **Contratos**: vinculan una propiedad con un inquilino, con fechas de inicio/fin, alquiler, depósito, día de pago y estado.
- **Pagos**: registro de pagos por período con vencimiento, monto y método; se calculan automáticamente como pendientes, vencidos o pagados.

Los datos se guardan localmente en el dispositivo con `AsyncStorage`, por lo que la app funciona sin conexión ni backend.

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
