// =====================================================================
// Detalle de la deuda en la ficha de la propiedad
// ---------------------------------------------------------------------
// Lo que se ve al tocar el bloque "Vencido" (o "A vencer") de la ficha: una línea por concepto (alquiler,
// expensas, servicios) con sus meses y su monto, igual que las tarjetas de Inicio. Si un concepto
// tiene varios meses, cada mes aparece debajo, de una; tocar un mes (o un concepto de un solo mes)
// abre ese cargo.
// =====================================================================

import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';
import { CONCEPT_LABEL } from '../../constants';
import { makeStyles, useTheme } from '../../context/ThemeContext';
import { fontSize, spacing } from '../../theme';
import { formatDayMonth, formatMoney, monthLabel } from '../../utils/format';
import { ChargeView } from '../../utils/ledger';
import { chargeShownAmount } from '../../utils/status';
import { CONCEPT_ICON, conceptLines } from '../payments/ChargeGroupRow';

const TILE = 30;

export default function DebtBreakdown({
  items,
  tone = 'danger',
  onOpenCharge,
}: {
  items: ChargeView[];
  // Rojo para lo vencido; naranja para lo que está por vencer.
  tone?: 'danger' | 'warning';
  onOpenCharge: (chargeId: string) => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const color = tone === 'danger' ? colors.danger : colors.warning;
  const tint = tone === 'danger' ? colors.dangerTile : colors.warningMuted;
  const lines = conceptLines(items);

  return (
    <View style={styles.box}>
      {lines.map((line) => {
        const many = line.items.length > 1;
        const months = new Set(line.items.map((x) => x.charge.period)).size;
        return (
          <View key={line.concept}>
            <TouchableOpacity
              style={styles.line}
              disabled={many}
              onPress={() => onOpenCharge(line.items[0].charge.id)}
              accessibilityRole={many ? 'text' : 'button'}
              accessibilityLabel={`${CONCEPT_LABEL[line.concept]}, ${line.months}, ${line.amount}`}
            >
              <View style={[styles.tile, { backgroundColor: tint }]}>
                <Ionicons name={CONCEPT_ICON[line.concept]} size={17} color={color} />
              </View>
              <View style={styles.lineText}>
                <Text style={styles.lineTitle} numberOfLines={1}>
                  {CONCEPT_LABEL[line.concept]}
                  {months > 1 ? ` · ${months} meses` : ''}
                </Text>
                {many ? null : (
                  <Text style={styles.subtitle} numberOfLines={1}>
                    {line.months} · {line.when}
                  </Text>
                )}
              </View>
              <Text style={[styles.amount, { color }]}>{line.amount}</Text>
              {many ? null : <Ionicons name="chevron-forward" size={16} color={colors.chevron} />}
            </TouchableOpacity>
            {many
              ? line.items.map((item) => (
                  <TouchableOpacity key={item.charge.id} style={styles.month} onPress={() => onOpenCharge(item.charge.id)} accessibilityRole="button">
                    <Text style={styles.monthText}>
                      {monthLabel(item.charge.period, item.charge.notes, line.items.filter((x) => x.charge.period === item.charge.period).length > 1)} · {item.status === 'vencido' ? 'venció' : 'vence'} el {formatDayMonth(item.charge.dueDate)}
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
    </View>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────

const useStyles = makeStyles((colors) => ({
  box: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.xs,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
  },
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: TILE / 2,
    alignItems: 'center',
    justifyContent: 'center',
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
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  amount: {
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
}));
