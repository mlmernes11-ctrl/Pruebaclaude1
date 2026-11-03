// =====================================================================
// Punto de estado
// =====================================================================

import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

// ── Constantes y funciones auxiliares ─────────────────────────────────

// Punto del semáforo: rojo = en mora, ámbar = por vencer, verde = al día, círculo vacío = sin inquilino.
export type DotTone = 'danger' | 'warning' | 'success' | 'empty';

// ── Componente ────────────────────────────────────────────────────────

export default function StatusDot({ tone, size = 10, halo }: { tone: DotTone; size?: number; halo?: boolean }) {
  const { colors } = useTheme();
  const color = { danger: colors.dotDanger, warning: colors.dotWarning, success: colors.dotSuccess, empty: colors.dotEmpty }[
    tone
  ];
  const dot =
    tone === 'empty' ? (
      <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: color }} />
    ) : (
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
    );
  if (!halo) return dot;
  const ring = size + 8;
  return (
    <View style={{ width: ring, height: ring, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{ position: 'absolute', width: ring, height: ring, borderRadius: ring / 2, backgroundColor: color, opacity: 0.16 }}
      />
      {dot}
    </View>
  );
}
