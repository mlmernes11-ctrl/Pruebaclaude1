// =====================================================================
// Título grande de pestaña
// ---------------------------------------------------------------------
// Franja azul de arriba de cada pestaña: una línea chica opcional (la fecha, el dólar) y el
// título grande con un botón "+" a la derecha.
// =====================================================================

import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { makeStyles } from '../context/ThemeContext';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { fontSize, radius, spacing } from '../theme';

// ── Componente ────────────────────────────────────────────────────────

// Cuánto se monta el primer bloque de cada pestaña sobre la franja (los accesos de Inicio, el
// buscador de Alquileres, la primera tarjeta de Menú): así en las tres el azul termina a la misma
// altura y lo de abajo arranca a la misma altura.
export const BAND_OVERLAP = 36;

export default function LargeTitleHeader({
  title,
  eyebrow,
  right,
  caption,
  onCaptionPress,
  onAdd,
  addLabel = 'Agregar',
  middle,
  overlap = 0,
  admin,
  tail,
}: {
  title: string;
  // Texto chico arriba a la izquierda (por ejemplo, la fecha del día).
  eyebrow?: string;
  // Algo chico arriba a la derecha (por ejemplo, el dólar).
  right?: React.ReactNode;
  caption?: string;
  onCaptionPress?: () => void;
  onAdd?: () => void;
  addLabel?: string;
  // Algo entre el título y el botón (en pantalla grande, el selector de vistas).
  middle?: React.ReactNode;
  // Alto extra abajo para que lo que sigue se monte sobre la franja (los accesos del Inicio).
  overlap?: number;
  // Modo admin: franja azul noche con la etiqueta ADMIN al lado del título.
  admin?: boolean;
  // El azul de más lo pone la lista de abajo (Alquileres, porque la franja queda fija arriba).
  tail?: boolean;
}) {
  const styles = useStyles();
  // En pantalla grande el "+" pasa a ser un botón con texto ("+ Registrar cobro").
  const desktop = useIsDesktop();
  return (
    <View
      style={[
        styles.band,
        admin && styles.bandAdmin,
        desktop && styles.bandDesktop,
        overlap ? { paddingBottom: spacing.lg + overlap, marginBottom: 0 } : null,
        tail ? { marginBottom: 0 } : null,
      ]}
    >
      {/* Con lo de abajo montado, el renglón de arriba va siempre: así el título queda a la misma altura. */}
      {eyebrow || right || overlap || tail ? (
        <View style={styles.topRow}>
          <Text style={styles.eyebrow} numberOfLines={1}>
            {eyebrow}
          </Text>
          {right}
        </View>
      ) : null}
      <View style={styles.row}>
        <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>
        {admin ? <Text style={styles.adminBadge}>ADMIN</Text> : null}
        {admin ? <View style={styles.spacer} /> : null}
        {middle}
        {caption ? (
          <TouchableOpacity onPress={onCaptionPress} disabled={!onCaptionPress} hitSlop={8}>
            <Text style={styles.caption}>{caption}</Text>
          </TouchableOpacity>
        ) : null}
        {onAdd && desktop ? (
          <TouchableOpacity onPress={onAdd} style={styles.addButton} accessibilityRole="button">
            <Text style={styles.addButtonText}>+ {addLabel}</Text>
          </TouchableOpacity>
        ) : onAdd ? (
          <TouchableOpacity
            onPress={onAdd}
            style={styles.addTarget}
            accessibilityRole="button"
            accessibilityLabel={addLabel}
          >
            <View style={styles.addCircle}>
              <Text style={styles.addText}>+</Text>
            </View>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

// Botoncito redondeado para poner arriba a la derecha de la franja (por ejemplo, "Blue $ 1.550").
export function HeaderChip({ label, onPress, accessibilityLabel }: { label: string; onPress?: () => void; accessibilityLabel?: string }) {
  const styles = useStyles();
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      style={styles.chip}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
    >
      <Text style={styles.chipText}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────

const useStyles = makeStyles((colors) => ({
  band: {
    backgroundColor: colors.header,
    paddingLeft: spacing.xl - 4,
    paddingRight: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  bandAdmin: {
    backgroundColor: colors.adminHeader,
  },
  adminBadge: {
    fontSize: fontSize.sm,
    fontWeight: '800',
    letterSpacing: 1,
    color: colors.onAdminBadge,
    backgroundColor: colors.adminBadge,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  spacer: {
    flex: 1,
  },
  // En pantalla grande la franja va dentro de la columna, con las puntas redondeadas.
  bandDesktop: {
    borderRadius: radius.xl,
    paddingTop: spacing.lg,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingRight: spacing.sm,
    // Alto fijo (no mínimo): con la pastilla del dólar, en Android este renglón quedaba un poco más
    // alto en Inicio y al deslizar entre pestañas se veía un escalón en la franja.
    height: 30,
  },
  eyebrow: {
    flexShrink: 1,
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.onHeaderMuted,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    minHeight: 48,
  },
  title: {
    flexShrink: 1,
    fontSize: fontSize.largeTitle,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: colors.onHeader,
  },
  caption: {
    fontSize: fontSize.sm,
    color: colors.onHeaderMuted,
    paddingRight: spacing.sm,
  },
  addButton: {
    height: 38,
    paddingHorizontal: spacing.lg,
    borderRadius: 10,
    backgroundColor: colors.onHeader,
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.header,
  },
  addTarget: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.headerChip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: {
    fontSize: 26,
    lineHeight: 28,
    color: colors.onHeader,
    fontWeight: '400',
  },
  chip: {
    height: 28,
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: colors.headerChip,
  },
  chipText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.onHeader,
    fontVariant: ['tabular-nums'],
  },
}));
