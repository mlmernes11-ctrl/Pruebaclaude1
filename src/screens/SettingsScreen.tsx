// =====================================================================
// Pantalla: Ajustes
// ---------------------------------------------------------------------
// Apariencia, cotización del dólar y la cuenta (o las opciones del modo demo).
// =====================================================================

import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { ScrollView, View } from 'react-native';
import { showConfirm } from '../components/DialogHost';
import LargeTitleHeader from '../components/LargeTitleHeader';
import ListRow from '../components/ListRow';
import ListSection from '../components/ListSection';
import Screen from '../components/Screen';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { RATE_SOURCE_LABEL, useExchangeRate } from '../context/ExchangeRateContext';
import { makeStyles, THEME_PREFERENCE_LABEL, ThemePreference, useTheme } from '../context/ThemeContext';
import { spacing } from '../theme';
import { formatMoney } from '../utils/format';

// ── Constantes y funciones auxiliares ─────────────────────────────────

const APPEARANCE: ThemePreference[] = ['system', 'light', 'dark'];

// ── Pantalla ──────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const styles = useStyles();
  const { colors, preference, setPreference } = useTheme();
  const navigation = useNavigation<any>();
  const { mode, properties, tenants, contracts, payments, loadSampleData, clearAllData } = useData();
  const { email, signOut } = useAuth();
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
      title: 'Borrar todos los datos',
      message: 'Se eliminan todas las propiedades, inquilinos, contratos y pagos. No se puede deshacer.',
      confirmLabel: 'Borrar todo',
      destructive: true,
      onConfirm: clearAllData,
    });
  };

  const handleSignOut = () => {
    showConfirm({
      title: 'Cerrar sesión',
      message: 'Tus datos quedan guardados en la nube. Para volver a verlos, ingresá con tu mail y contraseña.',
      confirmLabel: 'Cerrar sesión',
      destructive: true,
      onConfirm: signOut,
    });
  };

  return (
    <Screen narrow topSafe>
      <ScrollView contentContainerStyle={styles.content}>
        <LargeTitleHeader title="Ajustes" />
        <View style={styles.body}>
          <ListSection header="Apariencia" footer="«Sistema» sigue el modo claro u oscuro del celular.">
            {APPEARANCE.map((option) => (
              <ListRow
                key={option}
                title={THEME_PREFERENCE_LABEL[option]}
                value={
                  option === preference ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : undefined
                }
                onPress={() => setPreference(option)}
                chevron={false}
              />
            ))}
          </ListSection>

          <ListSection header="Cotización del dólar">
            <ListRow
              title="Dólar"
              value={rate ? `${RATE_SOURCE_LABEL[source]} · ${formatMoney(rate, 'ARS')}` : 'Sin cotización'}
              valueTone="muted"
              onPress={() => navigation.navigate('ExchangeRate')}
            />
          </ListSection>

          {mode === 'remote' ? (
            <ListSection header="Cuenta" footer="Los datos se guardan en la nube y se ven desde cualquier dispositivo con esta cuenta.">
              <ListRow title="Mail" value={email ?? ''} valueTone="muted" chevron={false} />
              <ListRow title="Cerrar sesión" icon="log-out-outline" destructive onPress={handleSignOut} chevron={false} />
            </ListSection>
          ) : (
            <ListSection header="Modo demo" footer="Los datos de ejemplo se guardan solo en este dispositivo y no tocan tu cuenta.">
              <ListRow title="Cargar datos de ejemplo" icon="sparkles-outline" onPress={handleLoadSamples} chevron={false} />
              {isEmpty ? null : (
                <ListRow title="Borrar todos los datos" icon="trash-outline" destructive onPress={handleClearAll} />
              )}
              <ListRow title="Salir del modo demo" icon="log-out-outline" onPress={signOut} chevron={false} />
            </ListSection>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────

const useStyles = makeStyles(() => ({
  content: {
    paddingBottom: spacing.xxl,
  },
  body: {
    paddingHorizontal: spacing.lg,
  },
}));
