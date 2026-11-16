// =====================================================================
// Cobros agrupados por propiedad (celular)
// ---------------------------------------------------------------------
// Lo vencido (o lo que está por vencer) de una misma propiedad va en una sola fila: a la
// izquierda, un ícono por concepto (casa = alquiler, edificio = expensas, rayo = servicios),
// en círculos encimados (cada uno tapa un 55 % del anterior); a la derecha, el total por moneda.
//
// Al tocarla, cada ícono baja a su línea del detalle, el nombre de la propiedad crece un poco y
// se corre a la izquierda (al lugar que dejan los íconos) y se despliega el recibo: una línea
// por concepto con sus meses y su monto, el total, y «Cobrar» y «WhatsApp». Al volver a tocarla,
// todo vuelve a su lugar. Si un concepto tiene varios meses, tocar su línea muestra cada mes.
// Abierta, la propiedad se separa un poco de las de arriba y abajo, como una tarjeta aparte.
// Con un solo cargo no hay nada que desplegar: la fila abre el cargo directo.
// =====================================================================

import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, Platform, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { CONCEPT_LABEL } from '../../constants';
import { makeStyles, useTheme } from '../../context/ThemeContext';
import { fontSize, radius, spacing } from '../../theme';
import { ChargeConcept } from '../../types';
import { addToTotals, emptyTotals, formatDayMonth, formatMoney, formatPeriod, formatTotals, parseLocalDate } from '../../utils/format';
import { ChargeView, sortOldestFirst } from '../../utils/ledger';
import { chargeShownAmount } from '../../utils/status';

// ── Constantes ────────────────────────────────────────────────────────

export const CONCEPT_ICON: Record<ChargeConcept, keyof typeof Ionicons.glyphMap> = {
  alquiler: 'home-outline',
  expensas: 'business-outline',
  servicios: 'flash-outline',
};
// Siempre en este orden, así se aprenden rápido.
const CONCEPT_ORDER: ChargeConcept[] = ['alquiler', 'expensas', 'servicios'];
const CONCEPT_COUNT = CONCEPT_ORDER.length;
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const TILE = 30;
// Círculos encimados: cada uno tapa un 55 % del anterior.
const STEP = TILE * 0.45;
// La pila ocupa siempre el lugar de tres íconos (los conceptos que hay como mucho), así el nombre
// de la propiedad empieza en el mismo lugar haya uno, dos o tres.
const STACK_WIDTH = TILE + (CONCEPT_COUNT - 1) * STEP;
const GAP = spacing.md;
// El nombre crece un poco al abrir.
const TITLE_GROW = 1.12;
const DURATION = 460;
// Separación de la tarjeta abierta con las filas de arriba y abajo.
const LIFT = 12;
const EASING = Easing.out(Easing.cubic);
const useNative = Platform.OS !== 'web';

// ── Datos ─────────────────────────────────────────────────────────────

export interface ChargeGroup {
  key: string;
  contractId: string;
  title: string;
  items: ChargeView[];
}

// Junta los cargos de cada contrato, en el orden en que aparece el primero de cada uno.
export function groupByContract(items: ChargeView[], block: string, titleOf: (contractId: string) => string): ChargeGroup[] {
  const groups = new Map<string, ChargeGroup>();
  items.forEach((item) => {
    const id = item.charge.contractId;
    if (!groups.has(id)) groups.set(id, { key: `${block}|${id}`, contractId: id, title: titleOf(id), items: [] });
    groups.get(id)!.items.push(item);
  });
  return [...groups.values()];
}

const totalsOf = (items: ChargeView[]) => {
  const totals = emptyTotals();
  items.forEach((item) => addToTotals(totals, chargeShownAmount(item), item.charge.currency));
  return totals;
};

const daysSince = (iso: string) => Math.max(0, Math.round((Date.now() - parseLocalDate(iso).getTime()) / 86400000));

// "Oct y nov", "Oct, nov y dic".
function monthsText(periods: string[]): string {
  const names = periods.map((p) => MONTHS[Number(p.slice(5, 7)) - 1] ?? p);
  const text = names.length > 1 ? `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}` : names[0];
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Lo que dice debajo del nombre: cuántos meses, hace cuánto venció o cuándo vence.
function groupSubtitle(items: ChargeView[]): string {
  const oldest = sortOldestFirst(items)[0];
  if (oldest.status !== 'vencido') return `Vence el ${formatDayMonth(oldest.charge.dueDate)}`;
  const months = new Set(items.map((i) => i.charge.period)).size;
  if (months > 1) return `${months} meses vencidos`;
  const days = daysSince(oldest.charge.dueDate);
  return days === 0 ? 'Venció hoy' : days === 1 ? 'Hace 1 día' : `Hace ${days} días`;
}

// Una línea del recibo por concepto.
interface ConceptLine {
  concept: ChargeConcept;
  items: ChargeView[];
  months: string;
  when: string;
  amount: string;
}

function conceptLines(items: ChargeView[]): ConceptLine[] {
  return CONCEPT_ORDER.flatMap((concept) => {
    const mine = sortOldestFirst(items.filter((i) => i.charge.concept === concept));
    if (!mine.length) return [];
    const first = mine[0];
    const periods = [...new Set(mine.map((i) => i.charge.period))];
    const due = formatDayMonth(first.charge.dueDate);
    const when = first.status !== 'vencido' ? `vence el ${due}` : mine.length > 1 ? `desde el ${due}` : `venció el ${due}`;
    return [{ concept, items: mine, months: monthsText(periods), when, amount: formatTotals(totalsOf(mine)) }];
  });
}

// ── Componente ────────────────────────────────────────────────────────

export default function ChargeGroupRow({
  group,
  tone,
  open,
  isFirst,
  isLast,
  prevOpen,
  nextOpen,
  onToggle,
  onOpenCharge,
  onCollect,
  onRemind,
}: {
  group: ChargeGroup;
  tone: 'danger' | 'warning';
  open: boolean;
  // Primera y última fila del bloque, y si la de arriba o la de abajo está abierta: definen qué
  // esquinas van redondeadas (las que quedan contra un hueco o contra el borde del bloque).
  isFirst?: boolean;
  isLast?: boolean;
  prevOpen?: boolean;
  nextOpen?: boolean;
  onToggle: () => void;
  onOpenCharge: (chargeId: string) => void;
  onCollect: () => void;
  onRemind: () => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const color = tone === 'danger' ? colors.danger : colors.warning;
  const tint = tone === 'danger' ? colors.dangerMuted : colors.warningMuted;

  const lines = useMemo(() => conceptLines(group.items), [group.items]);
  const totals = useMemo(() => formatTotals(totalsOf(group.items)), [group.items]);
  const single = group.items.length === 1 ? group.items[0] : undefined;
  const stackWidth = STACK_WIDTH;

  // t: 0 cerrada → 1 abierta (íconos, nombre, textos). height: alto del recibo (no puede ir por el
  // motor nativo, por eso va aparte, con la misma duración).
  const t = useRef(new Animated.Value(0)).current;
  const height = useRef(new Animated.Value(0)).current;
  // Cuánto tiene que viajar cada ícono para llegar a su línea.
  const moves = useRef(CONCEPT_ORDER.map(() => ({ x: new Animated.Value(0), y: new Animated.Value(0) }))).current;
  const stackRef = useRef<View>(null);
  const slotRefs = useRef<(View | null)[]>([]);
  const contentHeight = useRef(0);
  const [expanded, setExpanded] = useState<ChargeConcept>();
  // La tarjeta: separación (lift) y esquinas de arriba y de abajo.
  const roundTop = Boolean(isFirst || prevOpen || open);
  const roundBottom = Boolean(isLast || nextOpen || open);
  const lift = useRef(new Animated.Value(0)).current;
  const topRadius = useRef(new Animated.Value(roundTop ? radius.lg : 0)).current;
  const bottomRadius = useRef(new Animated.Value(roundBottom ? radius.lg : 0)).current;
  useEffect(() => {
    const go = (value: Animated.Value, to: number) =>
      Animated.timing(value, { toValue: to, duration: DURATION, easing: EASING, useNativeDriver: false });
    Animated.parallel([
      go(lift, open ? 1 : 0),
      go(topRadius, roundTop ? radius.lg : 0),
      go(bottomRadius, roundBottom ? radius.lg : 0),
    ]).start();
  }, [open, roundTop, roundBottom, lift, topRadius, bottomRadius]);

  // Mide dónde está cada lugar de destino respecto de su ícono en la pila.
  const measure = useCallback(
    (animate: boolean) =>
      new Promise<void>((resolve) => {
        const stack = stackRef.current;
        if (!stack) return resolve();
        stack.measureInWindow((sx, sy) => {
          let pending = lines.length;
          if (!pending) return resolve();
          lines.forEach((_, i) => {
            const slot = slotRefs.current[i];
            if (!slot) {
              if (--pending === 0) resolve();
              return;
            }
            slot.measureInWindow((x, y) => {
              const dx = x - (sx + i * STEP);
              const dy = y - sy;
              if (animate) {
                Animated.parallel([
                  Animated.timing(moves[i].x, { toValue: dx, duration: 240, easing: EASING, useNativeDriver: useNative }),
                  Animated.timing(moves[i].y, { toValue: dy, duration: 240, easing: EASING, useNativeDriver: useNative }),
                ]).start();
              } else {
                moves[i].x.setValue(dx);
                moves[i].y.setValue(dy);
              }
              if (--pending === 0) resolve();
            });
          });
        });
      }),
    [lines, moves],
  );

  // Abre o cierra. Las dos animaciones van por separado (si algo corta la del alto, la de los
  // íconos sigue), y si igual las corta algo que no es otro abrir/cerrar, terminan en su lugar:
  // nunca queda a mitad de camino (pasaba en Android).
  const runId = useRef(0);
  const run = useCallback(
    (to: 0 | 1) => {
      const id = ++runId.current;
      const settle = (value: Animated.Value, end: () => number) => ({ finished }: { finished: boolean }) => {
        if (!finished && id === runId.current) value.setValue(end());
      };
      Animated.timing(t, { toValue: to, duration: DURATION, easing: EASING, useNativeDriver: useNative }).start(settle(t, () => to));
      Animated.timing(height, { toValue: to ? contentHeight.current : 0, duration: DURATION, easing: EASING, useNativeDriver: false }).start(
        settle(height, () => (to ? contentHeight.current : 0)),
      );
    },
    [t, height],
  );

  // Solo cuando se abre o se cierra (no en cada dibujo de la lista, que reiniciaba la animación).
  const latest = useRef({ measure, run });
  latest.current = { measure, run };
  useEffect(() => {
    if (single) return;
    if (open) latest.current.measure(false).then(() => latest.current.run(1));
    else {
      latest.current.run(0);
      setExpanded(undefined);
    }
  }, [open, single]);

  // El recibo cambió de alto (se abrió el detalle de un concepto): acompaña sin saltos. Android
  // avisa a veces sin que haya cambiado nada: entonces no se toca.
  const onContentLayout = (e: LayoutChangeEvent) => {
    const next = e.nativeEvent.layout.height;
    if (Math.abs(next - contentHeight.current) < 1) return;
    contentHeight.current = next;
    if (!open) return;
    Animated.timing(height, { toValue: next, duration: 240, easing: EASING, useNativeDriver: false }).start();
    measure(true);
  };

  // — Partes — (armadas una sola vez: rearmarlas en cada dibujo frena la animación en Android)
  const { fadeOut, fadeIn, titleShift, titleScale, chevronTurn, iconSteps } = useMemo(
    () => ({
      fadeOut: t.interpolate({ inputRange: [0, 0.35], outputRange: [1, 0], extrapolate: 'clamp' }),
      fadeIn: t.interpolate({ inputRange: [0.35, 1], outputRange: [0, 1], extrapolate: 'clamp' }),
      titleShift: t.interpolate({ inputRange: [0, 1], outputRange: [0, -(stackWidth + GAP)] }),
      titleScale: t.interpolate({ inputRange: [0, 1], outputRange: [1, TITLE_GROW] }),
      chevronTurn: t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }),
      // Escalonados: cada ícono sale un poquito después del anterior.
      iconSteps: CONCEPT_ORDER.map((_, i) => {
        const mine = t.interpolate({ inputRange: [i * 0.1, 0.8 + i * 0.1], outputRange: [0, 1], extrapolate: 'clamp' });
        return [{ translateX: Animated.multiply(mine, moves[i].x) }, { translateY: Animated.multiply(mine, moves[i].y) }];
      }),
    }),
    [t, moves, stackWidth],
  );

  const stack = (
    <View ref={stackRef} style={[styles.stack, { width: stackWidth }]} collapsable={false}>
      {lines.map((line, i) => {
        const transform = single ? [] : iconSteps[i];
        return (
          <Animated.View
            key={line.concept}
            style={[styles.tile, styles.stacked, { left: i * STEP, backgroundColor: tint, borderColor: colors.surface, transform }]}
          >
            <Ionicons name={CONCEPT_ICON[line.concept]} size={17} color={color} />
          </Animated.View>
        );
      })}
    </View>
  );

  // Sin línea arriba si es la primera o si hay un hueco arriba.
  const separator = !roundTop ? <View style={styles.separator} /> : null;
  const space = lift.interpolate({ inputRange: [0, 1], outputRange: [0, LIFT] });
  const card = (children: React.ReactNode) => (
    <Animated.View
      style={[
        styles.card,
        {
          marginTop: isFirst ? 0 : space,
          marginBottom: isLast ? 0 : space,
          borderTopLeftRadius: topRadius,
          borderTopRightRadius: topRadius,
          borderBottomLeftRadius: bottomRadius,
          borderBottomRightRadius: bottomRadius,
        },
      ]}
    >
      {children}
    </Animated.View>
  );
  const label = `${group.title}: ${lines.map((l) => CONCEPT_LABEL[l.concept].toLowerCase()).join(', ')}, ${totals}`;

  // Un solo cargo: la fila abre el cargo directo.
  if (single) {
    return card(
      <TouchableOpacity style={styles.row} onPress={() => onOpenCharge(single.charge.id)} activeOpacity={0.6} accessibilityRole="button" accessibilityLabel={label}>
        {separator}
        {stack}
        <View style={styles.main}>
          <Text style={styles.title} numberOfLines={1}>
            {group.title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {`${CONCEPT_LABEL[single.charge.concept]} ${monthsText([single.charge.period]).toLowerCase()} · ${groupSubtitle(group.items).toLowerCase()}`}
          </Text>
        </View>
        <Text style={[styles.amount, { color }]}>{totals}</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.chevron} />
      </TouchableOpacity>,
    );
  }

  return card(
    <>
      <Pressable
        style={[styles.row, styles.raised]}
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={label}
      >
        {separator}
        {stack}
        <View style={styles.main}>
          <Animated.Text
            style={[styles.title, { transformOrigin: 'left center', transform: [{ translateX: titleShift }, { scale: titleScale }] }]}
            numberOfLines={1}
          >
            {group.title}
          </Animated.Text>
          <Animated.Text style={[styles.subtitle, { opacity: fadeOut }]} numberOfLines={1}>
            {groupSubtitle(group.items)}
          </Animated.Text>
        </View>
        <Animated.View style={[styles.end, { opacity: fadeOut }]}>
          {totals.split(' + ').map((part) => (
            <Text key={part} style={[styles.amount, { color }]}>
              {part}
            </Text>
          ))}
        </Animated.View>
        <Animated.View style={{ transform: [{ rotate: chevronTurn }] }}>
          <Ionicons name="chevron-down" size={18} color={colors.chevron} />
        </Animated.View>
      </Pressable>

      {/* El recibo: siempre armado (para saber adónde va cada ícono), alto 0 mientras está cerrada. */}
      <Animated.View style={[styles.receiptBox, { height }]} importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}>
        <View style={styles.receiptContent} onLayout={onContentLayout}>
          <View style={[styles.receipt, { borderColor: colors.border }]}>
            {lines.map((line, i) => {
              const many = line.items.length > 1;
              const showMonths = expanded === line.concept;
              return (
                <View key={line.concept}>
                  <TouchableOpacity
                    style={styles.line}
                    onPress={() => (many ? setExpanded(showMonths ? undefined : line.concept) : onOpenCharge(line.items[0].charge.id))}
                    accessibilityRole="button"
                    accessibilityLabel={`${CONCEPT_LABEL[line.concept]}, ${line.months}, ${line.amount}`}
                  >
                    {/* Lugar al que baja el ícono de la pila. */}
                    <View ref={(r) => {
                        slotRefs.current[i] = r;
                      }} style={styles.tile} collapsable={false} />
                    <Animated.View style={[styles.lineText, { opacity: fadeIn }]}>
                      <Text style={styles.lineTitle} numberOfLines={1}>
                        {CONCEPT_LABEL[line.concept]}
                        {many ? ` · ${new Set(line.items.map((x) => x.charge.period)).size} meses` : ''}
                      </Text>
                      <Text style={styles.subtitle} numberOfLines={1}>
                        {line.months} · {line.when}
                      </Text>
                    </Animated.View>
                    <Animated.Text style={[styles.lineAmount, { color, opacity: fadeIn }]}>{line.amount}</Animated.Text>
                    {many ? (
                      <Ionicons name={showMonths ? 'chevron-up' : 'chevron-down'} size={16} color={colors.chevron} />
                    ) : null}
                  </TouchableOpacity>
                  {showMonths
                    ? line.items.map((item) => (
                        <TouchableOpacity
                          key={item.charge.id}
                          style={styles.month}
                          onPress={() => onOpenCharge(item.charge.id)}
                          accessibilityRole="button"
                        >
                          <Text style={styles.monthText}>
                            {formatPeriod(item.charge.period)} · {item.status === 'vencido' ? 'venció' : 'vence'} el{' '}
                            {formatDayMonth(item.charge.dueDate)}
                          </Text>
                          <Text style={[styles.monthAmount, { color }]}>
                            {formatMoney(chargeShownAmount(item), item.charge.currency)}
                          </Text>
                        </TouchableOpacity>
                      ))
                    : null}
                </View>
              );
            })}
            <Animated.View style={[styles.total, { borderColor: colors.border, opacity: fadeIn }]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={[styles.totalValue, { color }]}>{totals}</Text>
            </Animated.View>
            <Animated.View style={[styles.buttons, { opacity: fadeIn }]}>
              <TouchableOpacity style={[styles.button, { backgroundColor: colors.primarySolid }]} onPress={onCollect} accessibilityRole="button">
                <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>Cobrar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, { backgroundColor: colors.primaryMuted }]} onPress={onRemind} accessibilityRole="button">
                <Ionicons name="logo-whatsapp" size={16} color={colors.primary} />
                <Text style={[styles.buttonText, { color: colors.primary }]}>WhatsApp</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>
      </Animated.View>
    </>,
  );
}

// ── Estilos ───────────────────────────────────────────────────────────

const useStyles = makeStyles((colors) => ({
  card: {
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: GAP,
    minHeight: 62,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    backgroundColor: colors.surface,
  },
  // Los íconos que bajan pasan por encima del recibo.
  raised: {
    zIndex: 2,
  },
  separator: {
    position: 'absolute',
    top: 0,
    left: spacing.lg,
    right: 0,
    height: 1,
    backgroundColor: colors.border,
  },
  stack: {
    height: TILE,
  },
  // Cada concepto es un círculo, en la fila y en su línea del recibo (la forma no cambia al bajar).
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: TILE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // El borde del color de la tarjeta separa cada círculo del de abajo.
  stacked: {
    position: 'absolute',
    top: 0,
    borderWidth: 2,
  },
  main: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  end: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: fontSize.md,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  receiptBox: {
    overflow: 'hidden',
    backgroundColor: colors.surface,
    zIndex: 1,
  },
  receiptContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  receipt: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    backgroundColor: colors.background,
    gap: spacing.xs,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
  },
  lineText: {
    flex: 1,
    minWidth: 0,
  },
  lineTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  lineAmount: {
    fontSize: fontSize.md,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  month: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    minHeight: 36,
    marginLeft: TILE + spacing.sm,
  },
  monthText: {
    flexShrink: 1,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  monthAmount: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  total: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    borderTopWidth: 1.5,
    borderStyle: 'dashed',
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  totalLabel: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  totalValue: {
    flexShrink: 1,
    textAlign: 'right',
    fontSize: fontSize.md,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 40,
    borderRadius: radius.md,
  },
  buttonText: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
}));
