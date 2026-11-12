// =====================================================================
// Pantalla: Menú
// ---------------------------------------------------------------------
// Pestaña "Menú" de la barra de abajo: la cuenta arriba y después una lista, una opción abajo de
// la otra (dólar, apariencia, ayuda, privacidad, cerrar sesión y eliminar cuenta). En modo demo, las
// opciones de los datos de ejemplo.
// =====================================================================

import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { Linking, Platform, ScrollView, Text, View } from 'react-native';
import { showAlert, showConfirm } from '../components/DialogHost';
import LargeTitleHeader from '../components/LargeTitleHeader';
import ListRow from '../components/ListRow';
import ListSection from '../components/ListSection';
import Screen from '../components/Screen';
import SegmentedControl from '../components/SegmentedControl';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { RATE_SOURCE_LABEL, useExchangeRate } from '../context/ExchangeRateContext';
import { makeStyles, THEME_PREFERENCE_LABEL, ThemePreference, useTheme } from '../context/ThemeContext';
import { fontSize, radius, spacing } from '../theme';
import { pendingImportsCount } from './imports/importsLogic';

// ── Constantes y funciones auxiliares ─────────────────────────────────

const APPEARANCE: ThemePreference[] = ['system', 'light', 'dark'];

// El manual y la política de privacidad están publicados junto con la versión web.
const SITE = Platform.OS === 'web' ? '' : 'https://gestion-alquileres-sero0.vercel.app';
const MANUAL_URL = `${SITE}/manual.html`;
const PRIVACY_URL = `${SITE}/privacidad.html`;

// ── Pantalla ──────────────────────────────────────────────────────────

export default function MenuScreen() {
  const styles = useStyles();
  const { preference, setPreference } = useTheme();
  const navigation = useNavigation<any>();
  const { mode, properties, tenants, contracts, payments, loadSampleData, clearAllData, chargeViews } = useData();
  const pendingImports = pendingImportsCount(chargeViews);
  const { email, signOut, deleteAccount } = useAuth();
  const { rate, source } = useExchangeRate();
  const [deleting, setDeleting] = useState(false);
  const isEmpty =
    properties.length === 0 && tenants.length === 0 && contracts.length === 0 && payments.length === 0;

  // — Acciones —
  const handleLoadSamples = () => {
    if (isEmpty) {
      loadSampleData();
      return;
    }
    showConfirm({
      title: '¿Cargar datos de ejemplo?',
      message: 'Reemplaza todo lo que tenés cargado en el modo demo.',
      confirmLabel: 'Reemplazar',
      destructive: true,
      onConfirm: loadSampleData,
    });
  };

  const handleClearAll = () => {
    showConfirm({
      title: '¿Borrar todos los datos?',
      message: 'Es una acción permanente e irreversible.',
      confirmLabel: 'Borrar todo',
      destructive: true,
      onConfirm: clearAllData,
    });
  };

  const handleSignOut = () => {
    showConfirm({
      title: '¿Cerrar sesión?',
      message: 'Tus datos quedan guardados en la nube.',
      confirmLabel: 'Cerrar sesión',
      onConfirm: signOut,
    });
  };

  const handleDeleteAccount = () => {
    showConfirm({
      title: '¿Eliminar tu cuenta?',
      message:
        'Se eliminan la cuenta y todos sus datos: propiedades, inquilinos, contratos, cargos y cobros. ' +
        'Es una acción permanente e irreversible.',
      confirmLabel: 'Eliminar cuenta',
      destructive: true,
      onConfirm: async () => {
        setDeleting(true);
        const error = await deleteAccount();
        setDeleting(false);
        if (error) showAlert('No se pudo eliminar la cuenta', error);
      },
    });
  };

  // — Dibujo de la pantalla —
  return (
    <Screen narrow topSafe>
      <ScrollView contentContainerStyle={styles.content}>
        <LargeTitleHeader title="Menú" />
        <View style={styles.body}>
          {mode === 'remote' ? (
            <View style={styles.account}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{(email ?? '?').charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.accountText}>
                <Text style={styles.accountName} numberOfLines={1}>
                  {email}
                </Text>
                <Text style={styles.accountHint}>Tus datos se guardan en la nube</Text>
              </View>
            </View>
          ) : null}

          <ListSection>
            <ListRow
              title="Actualizar importes"
              icon="document-text-outline"
              value={pendingImports ? `Faltan ${pendingImports}` : undefined}
              valueTone={pendingImports ? 'warning' : 'muted'}
              onPress={() => navigation.navigate('Imports')}
            />
            <ListRow
              title="Cotización del dólar"
              icon="cash-outline"
              value={rate ? RATE_SOURCE_LABEL[source] : 'Sin cotización'}
              valueTone="muted"
              onPress={() => navigation.navigate('ExchangeRate')}
            />
          </ListSection>

          <ListSection header="Apariencia">
            <View style={styles.segmentRow}>
              <SegmentedControl
                options={APPEARANCE.map((option) => ({ value: option, label: THEME_PREFERENCE_LABEL[option] }))}
                value={preference}
                onChange={setPreference}
              />
            </View>
          </ListSection>

          <ListSection>
            <ListRow
              title="Ayuda"
              subtitle="Manual de uso, paso a paso"
              icon="help-circle-outline"
              onPress={() => Linking.openURL(MANUAL_URL).catch(() => undefined)}
            />
            <ListRow
              title="Política de privacidad"
              icon="shield-checkmark-outline"
              onPress={() => Linking.openURL(PRIVACY_URL).catch(() => undefined)}
            />
          </ListSection>

          {mode === 'remote' ? (
            <ListSection>
              <ListRow title="Cerrar sesión" icon="log-out-outline" onPress={handleSignOut} chevron={false} />
              <ListRow
                title={deleting ? 'Eliminando cuenta…' : 'Eliminar cuenta'}
                icon="trash-outline"
                destructive
                onPress={deleting ? undefined : handleDeleteAccount}
                chevron={false}
              />
            </ListSection>
          ) : (
            <ListSection header="Modo demo" footer="Los datos de ejemplo se guardan solo en este dispositivo.">
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

const useStyles = makeStyles((colors) => ({
  content: {
    paddingBottom: spacing.xxl,
  },
  body: {
    paddingHorizontal: spacing.lg,
  },
  account: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySolid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  accountText: {
    flex: 1,
    minWidth: 0,
  },
  accountName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  accountHint: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  segmentRow: {
    padding: spacing.md,
  },
}));
