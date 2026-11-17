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
import React, { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { Animated, Easing, LayoutAnimation, LayoutChangeEvent, Platform, Pressable, Text, TouchableOpacity, View } from 'react-native';
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
// Abrir dura un poco más que cerrar: lo que se abre se mira, lo que se cierra ya se vio.
const OPEN_MS = 280;
const CLOSE_MS = 220;
// Separación de la tarjeta abierta con las filas de arriba y abajo.
const LIFT = 12;
const EASING = Easing.out(Easing.cubic);
const useNative = Platform.OS !== 'web';

// En el celular, lo que cambia de tamaño (el alto del recibo, la separación entre tarjetas) lo
// anima el propio sistema en el próximo dibujo: no depende de que la app esté libre cuadro por
// cuadro, que en Android hacía que la animación se trabara o saltara al final.
export function animateLayout(duration: number) {
  LayoutAnimation.configureNext({
    duration,
    update: { type: LayoutAnimation.Types.easeOut },
    create: { type: LayoutAnimation.Types.easeOut, property: LayoutAnimation.Properties.opacity },
    delete: { type: LayoutAnimation.Types.easeOut, property: LayoutAnimation.Properties.opacity },
  });
}

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
// "Octubre" (y el año solo si no es el actual: "Diciembre 2025"), para que el renglón entre en una línea.
function monthName(period: string): string {
  const text = formatPeriod(period);
  return period.slice(0, 4) === String(new Date().getFullYear()) ? text.split(' ')[0] : text;
}

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

// Una línea del recibo por concepto (también la usa el detalle de la deuda en la ficha).
export interface ConceptLine {
  concept: ChargeConcept;
  items: ChargeView[];
  months: string;
  when: string;
  amount: string;
}

export function conceptLines(items: ChargeView[]): ConceptLine[] {
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

// ── Cuál está abierta ─────────────────────────────────────────────────
// Una sola por vez. Se guarda acá y no en la pantalla, así al tocar una fila solo se vuelven a
// dibujar las filas que cambian y no toda la pantalla (en Android eso demoraba la animación).

export function createOpenGroup() {
  let current: string | undefined;
  const listeners = new Set<() => void>();
  return {
    get: () => current,
    toggle: (key: string) => {
      current = current === key ? undefined : key;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
export type OpenGroup = ReturnType<typeof createOpenGroup>;

function useIsOpen(openGroup: OpenGroup, key: string | undefined) {
  return useSyncExternalStore(openGroup.subscribe, () => key !== undefined && openGroup.get() === key);
}

// El verde de WhatsApp, un poco más oscuro que el de la marca para que la letra blanca se lea bien.
const WHATSAPP_GREEN = '#178A43';

// ── Componente ────────────────────────────────────────────────────────

export default function ChargeGroupRow({
  group,
  tone,
  openGroup,
  isFirst,
  isLast,
  prevKey,
  nextKey,
  onOpenCharge,
  onCollect,
  onRemind,
  tenant,
  onOpenProperty,
}: {
  group: ChargeGroup;
  tone: 'danger' | 'warning';
  openGroup: OpenGroup;
  // Primera y última fila del bloque, y las filas de arriba y de abajo: si están abiertas, definen
  // qué esquinas van redondeadas (las que quedan contra un hueco o contra el borde del bloque).
  isFirst?: boolean;
  isLast?: boolean;
  prevKey?: string;
  nextKey?: string;
  onOpenCharge: (chargeId: string) => void;
  onCollect: () => void;
  onRemind: () => void;
  // El inquilino: va al lado del estado y, con la tarjeta abierta, completo debajo del nombre.
  tenant?: string;
  // Con la tarjeta abierta, «Ver la ficha de …» abajo de los botones.
  onOpenProperty?: () => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const color = tone === 'danger' ? colors.danger : colors.warning;
  const tint = tone === 'danger' ? colors.dangerMuted : colors.warningMuted;

  const lines = useMemo(() => conceptLines(group.items), [group.items]);
  const totals = useMemo(() => formatTotals(totalsOf(group.items)), [group.items]);
  const single = group.items.length === 1 ? group.items[0] : undefined;
  const stackWidth = STACK_WIDTH;
  const open = useIsOpen(openGroup, group.key);
  const prevOpen = useIsOpen(openGroup, prevKey);
  const nextOpen = useIsOpen(openGroup, nextKey);

  // t: 0 cerrada → 1 abierta (íconos, nombre, textos). height, lift y las esquinas: solo en la
  // web (en el celular los anima el sistema, ver animateLayout).
  const t = useRef(new Animated.Value(0)).current;
  const height = useRef(new Animated.Value(0)).current;
  // Cuánto tiene que viajar cada ícono para llegar a su línea.
  const moves = useRef(CONCEPT_ORDER.map(() => ({ x: new Animated.Value(0), y: new Animated.Value(0) }))).current;
  const stackRef = useRef<View>(null);
  const slotRefs = useRef<(View | null)[]>([]);
  const contentHeight = useRef(0);
  // La tarjeta: separación (lift) y esquinas de arriba y de abajo.
  const roundTop = Boolean(isFirst || prevOpen || open);
  const roundBottom = Boolean(isLast || nextOpen || open);
  const lift = useRef(new Animated.Value(0)).current;
  const topRadius = useRef(new Animated.Value(roundTop ? radius.lg : 0)).current;
  const bottomRadius = useRef(new Animated.Value(roundBottom ? radius.lg : 0)).current;
  // Cada valor se anima una sola vez hacia cada destino (el toque ya lo arranca; cuando llega el
  // aviso de la lista no se vuelve a empezar), y si algo lo corta, termina en su lugar.
  const targets = useRef(new Map<Animated.Value, number>());
  const ease = useCallback((value: Animated.Value, to: number, duration: number) => {
    if (targets.current.get(value) === to) return;
    targets.current.set(value, to);
    Animated.timing(value, { toValue: to, duration, easing: EASING, useNativeDriver: false }).start(({ finished }) => {
      if (!finished && targets.current.get(value) === to) value.setValue(to);
    });
  }, []);
  useEffect(() => {
    if (useNative) return;
    const duration = open ? OPEN_MS : CLOSE_MS;
    ease(lift, open ? 1 : 0, duration);
    ease(topRadius, roundTop ? radius.lg : 0, duration);
    ease(bottomRadius, roundBottom ? radius.lg : 0, duration);
  }, [open, roundTop, roundBottom, lift, topRadius, bottomRadius, ease]);

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
  // Hacia dónde va (o fue) la última animación.
  const target = useRef<0 | 1>(0);
  const run = useCallback(
    (to: 0 | 1) => {
      const id = ++runId.current;
      target.current = to;
      const duration = to ? OPEN_MS : CLOSE_MS;
      const settle = (value: Animated.Value, end: () => number) => ({ finished }: { finished: boolean }) => {
        if (!finished && id === runId.current) value.setValue(end());
      };
      Animated.timing(t, { toValue: to, duration, easing: EASING, useNativeDriver: useNative }).start(settle(t, () => to));
      if (useNative) return;
      Animated.timing(height, { toValue: to ? contentHeight.current : 0, duration, easing: EASING, useNativeDriver: false }).start(
        settle(height, () => (to ? contentHeight.current : 0)),
      );
    },
    [t, height],
  );

  // Al tocar, la animación arranca en el acto. Adónde va cada ícono ya está medido. Al abrir, el
  // detalle de los meses arranca cerrado (si quedó abierto, se cierra en el mismo movimiento).
  const toggle = () => {
    const to = target.current ? 0 : 1;
    const duration = to ? OPEN_MS : CLOSE_MS;
    run(to);
    if (to) measure(true);
    if (useNative) {
      animateLayout(duration);
      openGroup.toggle(group.key);
      return;
    }
    ease(lift, to, duration);
    if (to) {
      ease(topRadius, radius.lg, duration);
      ease(bottomRadius, radius.lg, duration);
    }
    requestAnimationFrame(() => openGroup.toggle(group.key));
  };

  // Cuando la abre o la cierra otra cosa (por ejemplo, se abrió otra propiedad). Si ya va hacia
  // ahí porque se tocó, no se vuelve a empezar.
  const latest = useRef({ measure, run });
  latest.current = { measure, run };
  useEffect(() => {
    if (single) return;
    const to = open ? 1 : 0;
    if (target.current !== to) {
      if (to) latest.current.measure(false).then(() => latest.current.run(1));
      else latest.current.run(0);
    }
  }, [open, single]);

  // El recibo cambió de alto (se abrió el detalle de un concepto): acompaña sin saltos. Android
  // avisa a veces sin que haya cambiado nada: entonces no se toca.
  const onContentLayout = (e: LayoutChangeEvent) => {
    const next = e.nativeEvent.layout.height;
    if (Math.abs(next - contentHeight.current) < 1) return;
    const first = contentHeight.current === 0;
    contentHeight.current = next;
    // Cerrada: se mide ya adónde va cada ícono, así al tocarla arranca sin esperar (la primera vez
    // de una; después, acompañando, por si los íconos todavía vuelven a la pila).
    if (!target.current) {
      measure(!first);
      return;
    }
    if (!useNative) Animated.timing(height, { toValue: next, duration: 240, easing: EASING, useNativeDriver: false }).start();
    measure(true);
  };

  // — Partes — (armadas una sola vez: rearmarlas en cada dibujo frena la animación en Android)
  const { fadeOut, fadeIn, titleShift, titleScale, chevronTurn, iconSteps } = useMemo(
    () => ({
      fadeOut: t.interpolate({ inputRange: [0, 0.3], outputRange: [1, 0], extrapolate: 'clamp' }),
      fadeIn: t.interpolate({ inputRange: [0.3, 1], outputRange: [0, 1], extrapolate: 'clamp' }),
      titleShift: t.interpolate({ inputRange: [0, 1], outputRange: [0, -(stackWidth + GAP)] }),
      titleScale: t.interpolate({ inputRange: [0, 1], outputRange: [1, TITLE_GROW] }),
      chevronTurn: t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }),
      // Escalonados: cada ícono sale un poquito después del anterior.
      iconSteps: CONCEPT_ORDER.map((_, i) => {
        const mine = t.interpolate({ inputRange: [i * 0.06, 0.88 + i * 0.06], outputRange: [0, 1], extrapolate: 'clamp' });
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
  const space = useNative ? (open ? LIFT : 0) : lift.interpolate({ inputRange: [0, 1], outputRange: [0, LIFT] });
  const top = useNative ? (roundTop ? radius.lg : 0) : topRadius;
  const bottom = useNative ? (roundBottom ? radius.lg : 0) : bottomRadius;
  const card = (children: React.ReactNode) => (
    <Animated.View
      style={[
        styles.card,
        {
          marginTop: isFirst ? 0 : space,
          marginBottom: isLast ? 0 : space,
          borderTopLeftRadius: top,
          borderTopRightRadius: top,
          borderBottomLeftRadius: bottom,
          borderBottomRightRadius: bottom,
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
          <View style={styles.subRow}>
            <Text style={[styles.status, { color }]} numberOfLines={1}>
              {groupSubtitle(group.items)}
            </Text>
            <Text style={[styles.subtitle, styles.shrink]} numberOfLines={1}>
              {`· ${[CONCEPT_LABEL[single.charge.concept], tenant].filter(Boolean).join(' · ')}`}
            </Text>
          </View>
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
        onPress={toggle}
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
          {/* Cerrada: el estado en su color y el inquilino. */}
          <Animated.View style={[styles.subRow, { opacity: fadeOut }]}>
            <Text style={[styles.status, { color }]} numberOfLines={1}>
              {groupSubtitle(group.items)}
            </Text>
            {tenant ? (
              <Text style={[styles.subtitle, styles.shrink]} numberOfLines={1}>
                {`· ${tenant}`}
              </Text>
            ) : null}
          </Animated.View>
          {/* Abierta: el inquilino completo, donde estaba el estado (que ya se ve en el recibo). */}
          {tenant ? (
            <Animated.Text
              pointerEvents="none"
              style={[styles.subtitle, styles.openLead, { opacity: fadeIn, transform: [{ translateX: titleShift }] }]}
              numberOfLines={1}
            >
              {tenant}
            </Animated.Text>
          ) : null}
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

      {/* El recibo: siempre armado (para saber adónde va cada ícono), alto 0 mientras está cerrada.
          En el celular, abierta va con alto 'auto' (con "sin alto" Android dejaba el 0 y no se abría). */}
      <Animated.View style={[styles.receiptBox, { height: useNative ? (open ? 'auto' : 0) : height }]} importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}>
        <View style={styles.receiptContent} onLayout={onContentLayout}>
          <View style={[styles.receipt, { borderColor: colors.border }]}>
            {/* Todo lo que debe, de una: cada concepto y, si son varios meses, cada mes debajo. */}
            {lines.map((line, i) => {
              const many = line.items.length > 1;
              return (
                <View key={line.concept}>
                  <TouchableOpacity
                    style={styles.line}
                    disabled={many}
                    onPress={() => onOpenCharge(line.items[0].charge.id)}
                    accessibilityRole={many ? undefined : 'button'}
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
                      {many ? null : (
                        <Text style={styles.subtitle} numberOfLines={1}>
                          {line.months} · {line.when}
                        </Text>
                      )}
                    </Animated.View>
                    <Animated.Text style={[styles.lineAmount, { color, opacity: fadeIn }]}>{line.amount}</Animated.Text>
                  </TouchableOpacity>
                  {many
                    ? line.items.map((item) => (
                        <TouchableOpacity
                          key={item.charge.id}
                          style={styles.month}
                          onPress={() => onOpenCharge(item.charge.id)}
                          accessibilityRole="button"
                        >
                          <Animated.Text style={[styles.monthText, { opacity: fadeIn }]}>
                            {monthName(item.charge.period)} · {item.status === 'vencido' ? 'venció' : 'vence'} el{' '}
                            {formatDayMonth(item.charge.dueDate)}
                          </Animated.Text>
                          <Animated.Text style={[styles.monthAmount, { color, opacity: fadeIn }]}>
                            {formatMoney(chargeShownAmount(item), item.charge.currency)}
                          </Animated.Text>
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
              <TouchableOpacity style={[styles.button, { backgroundColor: WHATSAPP_GREEN }]} onPress={onRemind} accessibilityRole="button">
                <Ionicons name="logo-whatsapp" size={17} color="#FFFFFF" />
                <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>WhatsApp</Text>
              </TouchableOpacity>
            </Animated.View>
            {onOpenProperty ? (
              <Animated.View style={{ opacity: fadeIn }}>
                <TouchableOpacity style={[styles.fichaLink, { borderTopColor: colors.border }]} onPress={onOpenProperty} accessibilityRole="link">
                  <Ionicons name="home-outline" size={16} color={colors.primary} />
                  <Text style={styles.fichaLinkText}>{`Ver la ficha de ${group.title}`}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                </TouchableOpacity>
              </Animated.View>
            ) : null}
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
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  // El estado escrito en su color.
  status: {
    flexShrink: 0,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  openLead: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  shrink: {
    flexShrink: 1,
    marginTop: 0,
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
  fichaLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 40,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
  },
  fichaLinkText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.primary,
  },
}));
