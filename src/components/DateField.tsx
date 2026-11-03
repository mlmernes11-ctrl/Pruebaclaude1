// =====================================================================
// Campos de fecha y de mes
// ---------------------------------------------------------------------
// DateField abre un calendario para elegir un día; MonthField pasa de mes con flechas.
// =====================================================================

import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { fontSize, radius, spacing } from '../theme';
import {
  addMonthsToPeriod,
  formatDate,
  formatPeriod,
  parseLocalDate,
  todayISO,
  toISODate,
} from '../utils/format';
import { makeStyles, useTheme } from '../context/ThemeContext';

// ── Constantes y funciones auxiliares ─────────────────────────────────

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function periodOf(iso: string) {
  return iso.slice(0, 7);
}

function buildMonthCells(period: string): (string | null)[] {
  const [year, month] = period.split('-').map(Number);
  const first = new Date(year, month - 1, 1);
  const mondayOffset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (string | null)[] = Array(mondayOffset).fill(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(toISODate(new Date(year, month - 1, day)));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

// ── Componente ────────────────────────────────────────────────────────

export default function DateField({
  label,
  value,
  onChange,
  required,
  placeholder = 'Elegí una fecha',
}: {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  required?: boolean;
  placeholder?: string;
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  const [visible, setVisible] = useState(false);
  const [visiblePeriod, setVisiblePeriod] = useState(periodOf(value || todayISO()));
  const today = todayISO();

  const open = () => {
    setVisiblePeriod(periodOf(value || today));
    setVisible(true);
  };

  const pick = (iso: string) => {
    onChange(iso);
    setVisible(false);
  };

  const cells = buildMonthCells(visiblePeriod);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <TouchableOpacity style={styles.field} onPress={open} activeOpacity={0.7}>
        <Text style={value ? styles.value : styles.placeholder}>
          {value ? formatDate(value) : placeholder}
        </Text>
        <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.backdrop} onPress={() => setVisible(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.header}>
              <TouchableOpacity
                onPress={() => setVisiblePeriod((p) => addMonthsToPeriod(p, -1))}
                style={styles.navButton}
                accessibilityLabel="Mes anterior"
              >
                <Ionicons name="chevron-back" size={20} color={colors.text} />
              </TouchableOpacity>
              <Text style={styles.monthTitle}>{formatPeriod(visiblePeriod)}</Text>
              <TouchableOpacity
                onPress={() => setVisiblePeriod((p) => addMonthsToPeriod(p, 1))}
                style={styles.navButton}
                accessibilityLabel="Mes siguiente"
              >
                <Ionicons name="chevron-forward" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.row}>
              {WEEKDAYS.map((day, index) => (
                <Text key={index} style={[styles.cell, styles.weekday]}>
                  {day}
                </Text>
              ))}
            </View>
            {Array.from({ length: cells.length / 7 }, (_, rowIndex) => (
              <View key={rowIndex} style={styles.row}>
                {cells.slice(rowIndex * 7, rowIndex * 7 + 7).map((iso, index) => {
                  if (!iso) return <View key={index} style={styles.cell} />;
                  const selected = iso === value;
                  const isToday = iso === today;
                  return (
                    <TouchableOpacity
                      key={iso}
                      style={styles.cell}
                      onPress={() => pick(iso)}
                      accessibilityLabel={formatDate(iso)}
                    >
                      <View
                        style={[
                          styles.dayCircle,
                          isToday && styles.dayToday,
                          selected && styles.daySelected,
                        ]}
                      >
                        <Text style={[styles.dayText, selected && styles.dayTextSelected]}>
                          {parseLocalDate(iso).getDate()}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}

            <View style={styles.footer}>
              <TouchableOpacity onPress={() => pick(today)} style={styles.footerButton}>
                <Text style={styles.footerPrimary}>Hoy</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setVisible(false)} style={styles.footerButton}>
                <Text style={styles.footerSecondary}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ── Partes de la pieza ────────────────────────────────────────────────

export function MonthField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (period: string) => void;
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.field, styles.monthField]}>
        <TouchableOpacity
          onPress={() => onChange(addMonthsToPeriod(value, -1))}
          style={styles.navButton}
          accessibilityLabel="Mes anterior"
        >
          <Ionicons name="chevron-back" size={20} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.value}>{formatPeriod(value)}</Text>
        <TouchableOpacity
          onPress={() => onChange(addMonthsToPeriod(value, 1))}
          style={styles.navButton}
          accessibilityLabel="Mes siguiente"
        >
          <Ionicons name="chevron-forward" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────

const useStyles = makeStyles((colors) => ({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.textMuted,
    marginLeft: spacing.xs,
    marginBottom: 6,
  },
  required: {
    color: colors.danger,
  },
  field: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthField: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  value: {
    fontSize: fontSize.lg,
    color: colors.text,
  },
  placeholder: {
    fontSize: fontSize.lg,
    color: colors.textMuted,
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.backdrop,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  navButton: {
    padding: spacing.sm,
  },
  monthTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekday: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textMuted,
    textAlign: 'center',
    aspectRatio: undefined,
    paddingVertical: spacing.xs,
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayToday: {
    borderWidth: 1,
    borderColor: colors.primary,
  },
  daySelected: {
    backgroundColor: colors.primarySolid,
  },
  dayText: {
    fontSize: fontSize.md,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  dayTextSelected: {
    color: colors.white,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  footerButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  footerPrimary: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.primary,
  },
  footerSecondary: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
}));
