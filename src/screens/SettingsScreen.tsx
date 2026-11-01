import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Button from '../components/Button';
import Card from '../components/Card';
import { showConfirm } from '../components/DialogHost';
import Screen from '../components/Screen';
import SectionHeader from '../components/SectionHeader';
import { useData } from '../context/DataContext';
import { RATE_SOURCE_LABEL, useExchangeRate } from '../context/ExchangeRateContext';
import { makeStyles, THEME_PREFERENCE_LABEL, ThemePreference, useTheme } from '../context/ThemeContext';
import { fontSize, radius, spacing } from '../theme';
import { formatMoney } from '../utils/format';

const APPEARANCE_OPTIONS: { value: ThemePreference; icon: keyof typeof Ionicons.glyphMap; hint: string }[] = [
  { value: 'system', icon: 'phone-portrait-outline', hint: 'Igual que el celular' },
  { value: 'light', icon: 'sunny-outline', hint: 'Fondo claro' },
  { value: 'dark', icon: 'moon-outline', hint: 'Fondo oscuro' },
];

export default function SettingsScreen() {
  const styles = useStyles();
  const { colors, preference, setPreference } = useTheme();
  const navigation = useNavigation<any>();
  const { properties, tenants, contracts, payments, loadSampleData, clearAllData } = useData();
  const { rate, source } = useExchangeRate();
  const isEmpty =
    properties.length === 0 && tenants.length === 0 && contracts.length === 0 && payments.length === 0;

  const handleLoadSamples = () => {
    if (isEmpty) {
      loadSampleData();
      return;
    }
    showConfirm({
      title: 'Cargar datos de ejemplo',
      message: 'Esto reemplaza todo lo que tenés cargado por datos de ejemplo. ¿Continuar?',
      confirmLabel: 'Reemplazar',
      destructive: true,
      onConfirm: loadSampleData,
    });
  };

  const handleClearAll = () => {
    showConfirm({
      title: 'Borrar todo',
      message: 'Se eliminan todas las propiedades, inquilinos, contratos y pagos. No se puede deshacer.',
      confirmLabel: 'Borrar todo',
      destructive: true,
      onConfirm: clearAllData,
    });
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Ajustes</Text>
        <SectionHeader title="Apariencia" />
        <View style={styles.appearance} accessibilityRole="radiogroup">
          {APPEARANCE_OPTIONS.map((option) => {
            const active = option.value === preference;
            return (
              <TouchableOpacity
                key={option.value}
                style={[styles.appearanceOption, active && styles.appearanceOptionActive]}
                onPress={() => setPreference(option.value)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
              >
                <Ionicons name={option.icon} size={22} color={active ? colors.primary : colors.textMuted} />
                <Text style={[styles.appearanceLabel, active && styles.appearanceLabelActive]}>
                  {THEME_PREFERENCE_LABEL[option.value]}
                </Text>
                <Text style={styles.appearanceHint}>{option.hint}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <SectionHeader title="Cotización del dólar" style={styles.section} />
        <Card style={styles.linkCard} onPress={() => navigation.navigate('ExchangeRate')}>
          <Ionicons name="cash-outline" size={20} color={colors.primary} />
          <View style={styles.linkInfo}>
            <Text style={styles.linkTitle}>
              {rate ? `Dólar ${RATE_SOURCE_LABEL[source]}: ${formatMoney(rate, 'ARS')}` : 'Sin cotización'}
            </Text>
            <Text style={styles.linkMeta}>Elegir blue, oficial, MEP o cargarla a mano</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Card>

        <SectionHeader title="Datos" style={styles.section} />
        <Card>
          <Text style={styles.text}>
            Los datos se guardan solo en este dispositivo. Podés cargar ejemplos para probar o empezar de cero.
          </Text>
          <View style={styles.actions}>
            <Button label="Cargar ejemplos" variant="secondary" onPress={handleLoadSamples} style={styles.action} />
            <Button
              label="Borrar todo"
              variant="dangerOutline"
              onPress={handleClearAll}
              disabled={isEmpty}
              style={styles.action}
            />
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  content: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl * 2,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.lg,
  },
  section: {
    marginTop: spacing.xl,
  },
  appearance: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  appearanceOption: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  appearanceOptionActive: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.primaryMuted,
  },
  appearanceLabel: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  appearanceLabelActive: {
    color: colors.primary,
  },
  appearanceHint: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  linkInfo: {
    flex: 1,
    minWidth: 0,
  },
  linkTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  linkMeta: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  text: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 19,
    marginBottom: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  action: {
    flex: 1,
  },
}));
