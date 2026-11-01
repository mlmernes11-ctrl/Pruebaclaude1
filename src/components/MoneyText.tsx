import React from 'react';
import { StyleProp, Text, TextStyle, View } from 'react-native';
import { useExchangeRate } from '../context/ExchangeRateContext';
import { fontSize } from '../theme';
import { Currency } from '../types';
import { formatMoney } from '../utils/format';
import { makeStyles } from '../context/ThemeContext';

export default function MoneyText({
  amount,
  currency,
  suffix,
  settledRate,
  style,
  align = 'right',
}: {
  amount: number;
  currency: Currency;
  suffix?: string;
  // Rate actually used to pay; when present the peso amount is exact instead of an estimate.
  settledRate?: number;
  style?: StyleProp<TextStyle>;
  align?: 'left' | 'right';
}) {
  const styles = useStyles();
  const { rate } = useExchangeRate();
  const pesoRate = settledRate ?? rate;
  const showPesos = currency === 'USD' && pesoRate !== undefined;

  return (
    <View style={{ alignItems: align === 'right' ? 'flex-end' : 'flex-start' }}>
      <Text style={style}>
        {formatMoney(amount, currency)}
        {suffix ?? ''}
      </Text>
      {showPesos ? (
        <Text style={styles.estimate}>
          {settledRate ? '= ' : '≈ '}
          {formatMoney(amount * pesoRate, 'ARS')}
          {settledRate ? ` (a ${formatMoney(settledRate, 'ARS')})` : ''}
        </Text>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  estimate: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 1,
  },
}));
