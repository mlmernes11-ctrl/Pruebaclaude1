// =====================================================================
// Contrato ya empezado
// ---------------------------------------------------------------------
// Al guardar un contrato nuevo que empezó antes de este mes, pregunta cómo está hoy, para que
// la deuda quede bien desde el primer día: si ya pagó el mes en curso, qué meses anteriores
// debe (con su monto, porque el alquiler pudo cambiar con los ajustes) y si tiene saldo a favor.
// Sin tocar nada, queda al día. Locatia lleva las cuentas desde el mes en curso: los meses
// pagados de antes no se recrean (no se sabe cuánto se pagó cada uno).
// =====================================================================

import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { makeStyles, useTheme } from '../context/ThemeContext';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { fontSize, radius, spacing } from '../theme';
import { Currency } from '../types';
import { addMonthsToPeriod, amountDisplay, CURRENCY_SYMBOL, currentPeriod, formatAmountInput, formatPeriod, parseAmount } from '../utils/format';
import Button from './Button';

// Como mucho se ofrecen los últimos 24 meses (una deuda más vieja se carga con «Agregar cargo»).
const MAX_MONTHS = 24;

export interface StartedChoices {
  paidCurrent: boolean;
  debts: { period: string; amount: number }[];
  credit?: number;
}

// Los meses entre el inicio del contrato y el mes pasado, del más reciente al más viejo.
export function pastPeriods(startDate: string): string[] {
  const last = addMonthsToPeriod(currentPeriod(), -1);
  const oldest = addMonthsToPeriod(currentPeriod(), -MAX_MONTHS);
  const first = startDate.slice(0, 7) > oldest ? startDate.slice(0, 7) : oldest;
  const periods: string[] = [];
  for (let p = last; p >= first; p = addMonthsToPeriod(p, -1)) periods.push(p);
  return periods;
}

const amountText = (n: number) => amountDisplay(String(Math.round(n * 100) / 100));

export default function StartedContractSheet({
  visible,
  startDate,
  rentAmount,
  currency,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  startDate: string;
  rentAmount: number;
  currency: Currency;
  onCancel: () => void;
  onConfirm: (choices: StartedChoices) => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const desktop = useIsDesktop();
  const periods = useMemo(() => pastPeriods(startDate), [startDate]);
  const [paidCurrent, setPaidCurrent] = useState(false);
  // Mes que debe → monto escrito.
  const [owed, setOwed] = useState<Record<string, string>>({});
  const [credit, setCredit] = useState('');
  const [error, setError] = useState<string>();

  // Cada vez que se abre, arranca «al día».
  useEffect(() => {
    if (!visible) return;
    setPaidCurrent(false);
    setOwed({});
    setCredit('');
    setError(undefined);
  }, [visible]);

  const toggle = (period: string) =>
    setOwed((prev) => {
      const next = { ...prev };
      if (period in next) delete next[period];
      else next[period] = amountText(rentAmount);
      return next;
    });

  const confirm = () => {
    const debts: StartedChoices['debts'] = [];
    for (const [period, text] of Object.entries(owed)) {
      const amount = parseAmount(text);
      if (!amount) {
        setError(`Revisá el monto de ${formatPeriod(period).toLowerCase()}.`);
        return;
      }
      debts.push({ period, amount });
    }
    const creditAmount = credit.trim() ? parseAmount(credit) : undefined;
    if (credit.trim() && !creditAmount) {
      setError('Revisá el monto del saldo a favor o dejalo vacío.');
      return;
    }
    onConfirm({ paidCurrent, debts: debts.sort((a, b) => a.period.localeCompare(b.period)), credit: creditAmount });
  };

  const symbol = CURRENCY_SYMBOL[currency];
  const owedCount = Object.keys(owed).length;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={[styles.backdrop, desktop && styles.backdropCentered]} onPress={onCancel}>
        <Pressable style={[styles.sheet, desktop && styles.sheetCentered, { paddingBottom: (desktop ? 0 : insets.bottom) + spacing.lg }]} onPress={() => {}}>
          <View style={styles.header}>
            <Text style={styles.title} accessibilityRole="header">
              ¡Este contrato ya está empezado!
            </Text>
            <TouchableOpacity onPress={onCancel} accessibilityRole="button" accessibilityLabel="Volver al formulario" hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <Text style={styles.lead}>
              Empezó en {formatPeriod(startDate.slice(0, 7)).toLowerCase()}. Locatia lleva las cuentas desde{' '}
              {formatPeriod(currentPeriod()).toLowerCase()}. Contanos cómo está hoy y dejamos la deuda bien desde el
              primer día. Si no tocás nada, queda al día.
            </Text>

            <View style={styles.card}>
              <View style={styles.switchRow}>
                <Text style={styles.question}>¿Ya pagó {formatPeriod(currentPeriod()).toLowerCase()}?</Text>
                <Switch value={paidCurrent} onValueChange={setPaidCurrent} accessibilityLabel={`Ya pagó ${formatPeriod(currentPeriod())}`} />
              </View>
              <Text style={styles.help}>Se registra el cobro del mes (alquiler, y expensas y servicios si la propiedad los tiene).</Text>
            </View>

            {periods.length ? (
              <View style={styles.card}>
                <Text style={styles.question}>¿Debe meses anteriores?</Text>
                <Text style={styles.help}>Tildá los que debe. El monto es el de hoy: corregilo si ese mes era otro.</Text>
                {periods.map((period) => {
                  const checked = period in owed;
                  return (
                    <View key={period} style={styles.monthRow}>
                      <TouchableOpacity
                        style={styles.check}
                        onPress={() => toggle(period)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked }}
                        accessibilityLabel={`Debe ${formatPeriod(period)}`}
                      >
                        <Ionicons name={checked ? 'checkbox' : 'square-outline'} size={24} color={checked ? colors.primary : colors.textMuted} />
                        <Text style={[styles.month, checked && styles.monthOwed]}>{formatPeriod(period)}</Text>
                      </TouchableOpacity>
                      {checked ? (
                        <View style={styles.amountBox}>
                          <Text style={styles.symbol}>{symbol}</Text>
                          <TextInput
                            style={styles.amount}
                            value={owed[period]}
                            onChangeText={(text) => setOwed((prev) => ({ ...prev, [period]: formatAmountInput(text) }))}
                            keyboardType="numeric"
                            accessibilityLabel={`Monto que debe de ${formatPeriod(period)}`}
                          />
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            ) : null}

            <View style={styles.card}>
              <Text style={styles.question}>¿Tiene saldo a favor?</Text>
              <Text style={styles.help}>Se descuenta solo de las próximas cuotas.</Text>
              <View style={styles.amountBox}>
                <Text style={styles.symbol}>{symbol}</Text>
                <TextInput
                  style={styles.amount}
                  value={credit}
                  onChangeText={(text) => setCredit(formatAmountInput(text))}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  accessibilityLabel="Saldo a favor"
                />
              </View>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button
              label={owedCount ? `Guardar con ${owedCount} ${owedCount === 1 ? 'mes adeudado' : 'meses adeudados'}` : 'Guardar contrato'}
              onPress={confirm}
            />
            <Button label="Volver al formulario" variant="secondary" onPress={onCancel} />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const useStyles = makeStyles((colors) => ({
  backdrop: {
    flex: 1,
    backgroundColor: colors.backdrop,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  backdropCentered: {
    justifyContent: 'center',
    padding: spacing.xl,
  },
  sheet: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '90%',
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  sheetCentered: {
    borderRadius: radius.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    padding: spacing.lg,
  },
  title: {
    flexShrink: 1,
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.text,
  },
  body: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  lead: {
    fontSize: fontSize.md,
    lineHeight: 21,
    color: colors.textMuted,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  question: {
    flexShrink: 1,
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  help: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    minHeight: 44,
  },
  check: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  month: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  monthOwed: {
    fontWeight: '700',
  },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    width: 160,
  },
  symbol: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  amount: {
    flex: 1,
    minWidth: 0,
    width: '100%',
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.text,
    textAlign: 'right',
  },
  error: {
    fontSize: fontSize.md,
    color: colors.danger,
  },
}));
