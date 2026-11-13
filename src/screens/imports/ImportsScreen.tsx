// =====================================================================
// Pantalla: Actualización masiva (los importes del mes: expensas, servicios y alquiler)
// ---------------------------------------------------------------------
// Las expensas, los servicios y el alquiler de un mes, una fila por contrato vigente. Se toca una
// fila para cargar el importe nuevo (o dejar el del mes anterior); "Mantener el importe anterior"
// confirma de un toque las que no cambiaron. En Alquiler se puede aumentar un % a varias juntas;
// los contratos con ajuste automático (IPC, ICL o %) se ven pero no se editan.
// Nada se guarda hasta tocar "Guardar" y confirmar. Las reglas están en importsLogic.ts.
// =====================================================================

import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import { useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Button from '../../components/Button';
import { showConfirm } from '../../components/DialogHost';
import EmptyState from '../../components/EmptyState';
import Screen from '../../components/Screen';
import SegmentedControl from '../../components/SegmentedControl';
import { CONCEPT_LABEL } from '../../constants';
import { useData } from '../../context/DataContext';
import { makeStyles, useTheme } from '../../context/ThemeContext';
import { fontSize, radius, spacing } from '../../theme';
import { ChargeConcept } from '../../types';
import { describeAdjustment, nextAdjustmentPeriod } from '../../utils/adjustments';
import { addMonthsToPeriod, currentPeriod, formatMoney, formatPeriod, parseAmount } from '../../utils/format';
import { roundMoney } from '../../utils/ledger';
import { plural } from '../../utils/text';
import { ImportRow, importRows, isPendingImport, percentChange, planImportChange } from './importsLogic';
import { useFormGuard } from '../../navigation/formScreen';

// ── Constantes ────────────────────────────────────────────────────────

const CONCEPTS: ChargeConcept[] = ['expensas', 'servicios', 'alquiler'];

// Lo decidido para un cargo antes de guardar: un importe nuevo o mantener el anterior.
type Draft = { kind: 'nuevo'; amount: number } | { kind: 'mantener' };

const monthName = (period: string) => formatPeriod(period).split(' ')[0].toLowerCase();

// ── Pantalla ──────────────────────────────────────────────────────────

export default function ImportsScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const route = useRoute<any>();
  const { chargeViews, contracts, properties, tenants, updateCharge, addCharge, updateProperty, updateContract } =
    useData();

  const [period, setPeriod] = useState<string>(route.params?.period ?? currentPeriod());
  const [concept, setConcept] = useState<ChargeConcept>(route.params?.concept ?? 'expensas');
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const { markDirty, markSaved } = useFormGuard();
  const [editing, setEditing] = useState<string>();
  const [editText, setEditText] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [percentText, setPercentText] = useState('');
  const [savedMessage, setSavedMessage] = useState<string>();

  // — Filas del mes —
  const rowsFor = (c: ChargeConcept) => importRows(c, period, chargeViews, contracts, properties, tenants);
  const rows = rowsFor(concept);
  const previousMonth = monthName(addMonthsToPeriod(period, -1));
  const isCurrent = period === currentPeriod();

  // Avance del mes: expensas y servicios revisados (el alquiler no queda pendiente).
  const progressOf = (c: ChargeConcept) => {
    const list = rowsFor(c);
    return { done: list.filter((r) => r.view.charge.confirmed).length, total: list.length };
  };
  const monthProgress = ['expensas', 'servicios'].map((c) => progressOf(c as ChargeConcept));
  const monthDone = monthProgress.reduce((s, p) => s + p.done, 0);
  const monthTotal = monthProgress.reduce((s, p) => s + p.total, 0);

  const tabs = CONCEPTS.map((c) => {
    if (c === 'alquiler') return { value: c, label: CONCEPT_LABEL[c] };
    const { done, total } = progressOf(c);
    return { value: c, label: total ? `${CONCEPT_LABEL[c]} · ${done}/${total}` : CONCEPT_LABEL[c] };
  });

  const pendingWithoutDraft = rows.filter((r) => isPendingImport(r) && !drafts[r.view.charge.id]);
  const draftCount = rows.filter((r) => drafts[r.view.charge.id]).length;

  // — Cambiar de mes o de pestaña (lo no guardado se descarta) —
  const reset = () => {
    markSaved();
    setDrafts({});
    setEditing(undefined);
    setSelected([]);
    setPercentText('');
  };
  const goMonth = (delta: number) => {
    setPeriod((p) => addMonthsToPeriod(p, delta));
    setSavedMessage(undefined);
    reset();
  };
  const changeConcept = (c: ChargeConcept) => {
    setConcept(c);
    setSavedMessage(undefined);
    reset();
  };

  // — Editar una fila —
  const startEditing = (row: ImportRow) => {
    const draft = drafts[row.view.charge.id];
    setEditing(row.view.charge.id);
    setEditText(String(draft?.kind === 'nuevo' ? draft.amount : row.total));
  };

  const setDraft = (id: string, draft: Draft) => {
    markDirty();
    setDrafts((prev) => ({ ...prev, [id]: draft }));
  };

  // "Listo · siguiente": guarda lo escrito en la fila y abre la próxima pendiente.
  const finishEditing = (row: ImportRow, amount: number | undefined) => {
    const id = row.view.charge.id;
    if (amount && amount > 0) {
      setDraft(id, amount === row.total ? { kind: 'mantener' } : { kind: 'nuevo', amount });
    }
    const next = rows.find((r) => r.view.charge.id !== id && !r.automatic && isPendingImport(r) && !drafts[r.view.charge.id]);
    if (next) startEditing(next);
    else setEditing(undefined);
  };

  const keepAllPending = () => {
    markDirty();
    setEditing(undefined);
    setDrafts((prev) => {
      const next = { ...prev };
      pendingWithoutDraft.forEach((r) => {
        next[r.view.charge.id] = { kind: 'mantener' };
      });
      return next;
    });
  };

  // Alquiler: aumentar un % a las filas elegidas.
  const applyPercent = () => {
    const pct = parseAmount(percentText);
    if (!pct) return;
    markDirty();
    setDrafts((prev) => {
      const next = { ...prev };
      rows
        .filter((r) => selected.includes(r.view.charge.id))
        .forEach((r) => {
          next[r.view.charge.id] = { kind: 'nuevo', amount: roundMoney(r.total * (1 + pct / 100)) };
        });
      return next;
    });
  };

  // — Guardar —
  const save = () => {
    const decided = rows.filter((r) => drafts[r.view.charge.id]);
    if (!decided.length) return;
    const changed = decided.filter((r) => drafts[r.view.charge.id].kind === 'nuevo');
    const kept = decided.length - changed.length;
    const withPayments = changed.filter((r) => {
      const draft = drafts[r.view.charge.id];
      return r.view.paid > 0 && draft.kind === 'nuevo' && draft.amount > r.total;
    }).length;
    const label = CONCEPT_LABEL[concept].toLowerCase();

    showConfirm({
      title: `¿Guardar ${concept === 'alquiler' ? 'los alquileres' : `las ${label}`} de ${monthName(period)}?`,
      message: [
        [
          changed.length ? plural(changed.length, 'con importe nuevo', 'con importe nuevo') : '',
          kept ? plural(kept, 'con el importe anterior', 'con el importe anterior') : '',
        ]
          .filter(Boolean)
          .join(' · ') + '.',
        withPayments
          ? `${plural(withPayments, 'cargo ya tiene', 'cargos ya tienen')} cobros: no se tocan y la diferencia va en un cargo aparte.`
          : '',
        isCurrent && changed.length ? 'Los importes nuevos quedan como base para los meses siguientes.' : '',
      ]
        .filter(Boolean)
        .join('\n\n'),
      confirmLabel: 'Guardar',
      onConfirm: () => {
        markSaved();
        decided.forEach((row) => {
          const draft = drafts[row.view.charge.id];
          const amount = draft.kind === 'nuevo' ? draft.amount : row.total;
          const change = planImportChange(row, amount);
          updateCharge(row.view.charge.id, change.charge);
          if (change.extra) addCharge(change.extra);
          // Mes en curso: el importe nuevo pasa a ser la base de los meses que vienen.
          if (isCurrent && draft.kind === 'nuevo') {
            if (concept === 'alquiler') updateContract(row.contract.id, { rentAmount: amount });
            else if (row.property) {
              updateProperty(row.property.id, concept === 'expensas' ? { expensasAmount: amount } : { serviciosAmount: amount });
            }
          }
        });
        setSavedMessage(
          `${CONCEPT_LABEL[concept]} de ${monthName(period)} guardadas: ${[
            changed.length ? `${changed.length} con importe nuevo` : '',
            kept ? `${kept} con el importe anterior` : '',
          ]
            .filter(Boolean)
            .join(' y ')}.`,
        );
        reset();
      },
    });
  };

  const nextConcept = CONCEPTS.find((c) => c !== concept && c !== 'alquiler' && progressOf(c).done < progressOf(c).total);

  // — Dibujo —
  return (
    <Screen narrow>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.monthRow}>
          <TouchableOpacity style={styles.monthButton} onPress={() => goMonth(-1)} accessibilityLabel="Mes anterior">
            <Ionicons name="chevron-back" size={20} color={colors.primary} />
          </TouchableOpacity>
          <View style={styles.monthCenter}>
            <Text style={styles.monthTitle}>{formatPeriod(period)}</Text>
            <Text style={styles.monthCaption}>
              {monthTotal ? `${monthDone} de ${monthTotal} expensas y servicios actualizados` : 'Sin expensas ni servicios'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.monthButton, isCurrent && styles.monthButtonOff]}
            onPress={() => !isCurrent && goMonth(1)}
            disabled={isCurrent}
            accessibilityLabel="Mes siguiente"
          >
            <Ionicons name="chevron-forward" size={20} color={isCurrent ? colors.textMuted : colors.primary} />
          </TouchableOpacity>
        </View>
        {monthTotal ? (
          <View style={styles.bar}>
            <View style={{ flex: monthDone, backgroundColor: colors.success }} />
            <View style={{ flex: monthTotal - monthDone }} />
          </View>
        ) : null}

        <SegmentedControl options={tabs} value={concept} onChange={changeConcept} style={styles.tabs} />

        {savedMessage ? (
          <View style={styles.saved}>
            <Ionicons name="checkmark-circle" size={22} color={colors.success} />
            <Text style={styles.savedText}>{savedMessage}</Text>
            {nextConcept ? (
              <TouchableOpacity onPress={() => changeConcept(nextConcept)} accessibilityRole="button">
                <Text style={styles.link}>Seguir con {CONCEPT_LABEL[nextConcept].toLowerCase()}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {rows.length ? (
          <View style={styles.list}>
            {rows.map((row, index) => {
              const id = row.view.charge.id;
              const draft = drafts[id];
              const charge = row.view.charge;
              const shown = draft?.kind === 'nuevo' ? draft.amount : row.total;
              const isEditing = editing === id;
              const editValue = parseAmount(editText);

              // Estado de la fila, en palabras.
              let status: string;
              let tone: 'done' | 'pending' | 'draft' | 'auto' = 'pending';
              if (row.automatic) {
                const next = nextAdjustmentPeriod(row.contract);
                status = `${describeAdjustment(row.contract)}${next ? ` · próximo: ${monthName(next)}` : ''}`;
                tone = 'auto';
              } else if (draft?.kind === 'nuevo') {
                status = ['Importe nuevo', percentChange(row.total, draft.amount)].filter(Boolean).join(' · ');
                tone = 'draft';
              } else if (draft?.kind === 'mantener') {
                status = 'Se mantiene el importe anterior';
                tone = 'draft';
              } else if (charge.confirmed) {
                status = [
                  'Actualizado',
                  row.previous !== undefined && row.previous !== row.total
                    ? `antes ${formatMoney(row.previous, charge.currency)}`
                    : '',
                  row.extra ? `incluye ajuste de ${formatMoney(row.extra, charge.currency)}` : '',
                ]
                  .filter(Boolean)
                  .join(' · ');
                tone = 'done';
              } else if (concept === 'alquiler') {
                status = 'Sin ajuste automático';
              } else {
                status = row.previous === row.total ? `Pendiente · igual que ${previousMonth}` : 'Pendiente';
              }

              return (
                <View key={id} style={[styles.row, index > 0 && styles.rowBorder]}>
                  {isEditing ? (
                    <View style={styles.editBox}>
                      <View style={styles.editHeader}>
                        <Text style={styles.rowTitle}>{row.property?.title ?? 'Propiedad'}</Text>
                        <Text style={styles.rowSubtitle}>{row.tenant?.name}</Text>
                      </View>
                      <Text style={styles.editLabel}>
                        Importe de {monthName(period)} ({charge.currency === 'USD' ? 'US$' : '$'})
                      </Text>
                      <TextInput
                        value={editText}
                        onChangeText={setEditText}
                        keyboardType="numeric"
                        autoFocus
                        style={styles.editInput}
                        accessibilityLabel={`Importe de ${row.property?.title ?? 'la propiedad'}`}
                      />
                      <View style={styles.editInfo}>
                        <Text style={styles.editHint}>
                          {row.previous !== undefined
                            ? `${monthName(addMonthsToPeriod(period, -1)).replace(/^./, (c) => c.toUpperCase())}: ${formatMoney(row.previous, charge.currency)}`
                            : `Actual: ${formatMoney(row.total, charge.currency)}`}
                        </Text>
                        {editValue ? (
                          <Text style={styles.editPct}>{percentChange(row.previous ?? row.total, editValue) ?? ''}</Text>
                        ) : null}
                      </View>
                      <View style={styles.editButtons}>
                        {row.previous !== undefined ? (
                          <Button
                            label={`Igual que ${previousMonth}`}
                            variant="secondary"
                            onPress={() => finishEditing(row, row.previous)}
                            style={styles.editButton}
                          />
                        ) : null}
                        <Button label="Listo · siguiente" onPress={() => finishEditing(row, editValue)} style={styles.editButton} />
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.rowInner}
                      onPress={() => (row.automatic ? undefined : startEditing(row))}
                      disabled={row.automatic}
                      accessibilityRole="button"
                    >
                      {concept === 'alquiler' && !row.automatic ? (
                        <TouchableOpacity
                          onPress={() =>
                            setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
                          }
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: selected.includes(id) }}
                          accessibilityLabel={`Elegir ${row.property?.title ?? 'propiedad'}`}
                          hitSlop={8}
                        >
                          <Ionicons
                            name={selected.includes(id) ? 'checkbox' : 'square-outline'}
                            size={22}
                            color={selected.includes(id) ? colors.primary : colors.textMuted}
                          />
                        </TouchableOpacity>
                      ) : (
                        <Ionicons
                          name={
                            tone === 'auto'
                              ? 'refresh-outline'
                              : tone === 'done' || tone === 'draft'
                                ? 'checkmark-circle'
                                : 'ellipse-outline'
                          }
                          size={22}
                          color={tone === 'done' ? colors.success : tone === 'draft' ? colors.primary : colors.textMuted}
                        />
                      )}
                      <View style={styles.rowText}>
                        <Text style={styles.rowTitle}>{row.property?.title ?? 'Propiedad'}</Text>
                        <Text
                          style={[
                            styles.rowSubtitle,
                            tone === 'done' && { color: colors.success },
                            tone === 'draft' && { color: colors.primary },
                          ]}
                        >
                          {status}
                        </Text>
                      </View>
                      <Text style={[styles.rowValue, tone === 'pending' && styles.rowValueMuted]}>
                        {formatMoney(shown, charge.currency)}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        ) : (
          <EmptyState
            icon="document-text-outline"
            title={`Sin ${concept === 'alquiler' ? 'alquileres' : CONCEPT_LABEL[concept].toLowerCase()}`}
            message={`No hay cargos de ${CONCEPT_LABEL[concept].toLowerCase()} en ${monthName(period)}.`}
          />
        )}

        {concept === 'alquiler' && rows.some((r) => !r.automatic) ? (
          <View style={styles.percentRow}>
            <Text style={styles.percentLabel}>
              {selected.length === 1 ? 'Aumentar la elegida un' : selected.length ? `Aumentar las ${selected.length} elegidas un` : 'Aumentar las elegidas un'}
            </Text>
            <TextInput
              value={percentText}
              onChangeText={setPercentText}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              style={styles.percentInput}
              accessibilityLabel="Porcentaje de aumento"
            />
            <Text style={styles.percentSign}>%</Text>
            <Button label="Aplicar" variant="secondary" onPress={applyPercent} style={styles.percentButton} />
          </View>
        ) : null}

        <Text style={styles.hint}>
          {concept === 'alquiler'
            ? 'Los contratos con ajuste automático los actualiza la app sola. Tocá una fila para cambiar un importe, o elegí varias y aumentalas un %.'
            : 'Tocá una fila para cargar el importe nuevo. Las que no cambiaron se confirman con un solo botón.'}
        </Text>

        {pendingWithoutDraft.length && concept !== 'alquiler' ? (
          <Button
            label={
              pendingWithoutDraft.length === 1
                ? 'Mantener el importe anterior en la pendiente'
                : `Mantener el importe anterior en las ${pendingWithoutDraft.length} pendientes`
            }
            variant="secondary"
            onPress={keepAllPending}
          />
        ) : null}
        <Button
          label={draftCount ? `Guardar ${plural(draftCount, 'importe', 'importes')}` : 'Guardar'}
          onPress={save}
          disabled={!draftCount}
        />
      </ScrollView>
    </Screen>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────

const useStyles = makeStyles((colors) => ({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
    gap: spacing.md,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  monthButton: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthButtonOff: {
    opacity: 0.5,
  },
  monthCenter: {
    flex: 1,
    alignItems: 'center',
  },
  monthTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  monthCaption: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
  bar: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: colors.neutralMuted,
  },
  tabs: {
    marginHorizontal: 0,
    marginBottom: 0,
  },
  saved: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.successMuted,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  savedText: {
    flex: 1,
    minWidth: 180,
    fontSize: fontSize.md,
    color: colors.text,
  },
  list: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  row: {
    paddingHorizontal: spacing.md,
  },
  rowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 60,
    paddingVertical: spacing.sm,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  rowSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  rowValue: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  rowValueMuted: {
    fontWeight: '600',
    color: colors.textMuted,
  },
  editBox: {
    gap: spacing.sm,
    marginVertical: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  editHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  editLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textMuted,
  },
  editInput: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  editInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  editHint: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  editPct: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.warning,
  },
  editButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  editButton: {
    flex: 1,
  },
  percentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  percentLabel: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  percentInput: {
    width: 64,
    fontSize: fontSize.lg,
    fontWeight: '700',
    textAlign: 'right',
    color: colors.text,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  percentSign: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  percentButton: {
    paddingHorizontal: spacing.md,
  },
  hint: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    paddingHorizontal: spacing.xs,
  },
  link: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.primary,
  },
}));
