// =====================================================================
// Pantalla: Historial por mes
// ---------------------------------------------------------------------
// El año mes a mes (lo cargado, lo cobrado y lo que quedó en mora). Con una propiedad, solo la
// de esa propiedad; sin propiedad (desde la pestaña Cobros), la de todas.
// =====================================================================

import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import Screen from '../../components/Screen';
import YearHistory from '../../components/YearHistory';
import { useData } from '../../context/DataContext';
import { makeStyles } from '../../context/ThemeContext';
import { fontSize, spacing } from '../../theme';

// ── Pantalla ──────────────────────────────────────────────────────────

// Al tocar un mes se ven sus cargos.
export default function PropertyPaymentsScreen() {
  const styles = useStyles();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const propertyId = route.params?.propertyId as string | undefined;
  const { getPropertyById, chargeViewsForProperty, chargeViews } = useData();
  const [year, setYear] = useState(() => new Date().getFullYear());
  const property = getPropertyById(propertyId);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>{property?.title ?? 'Todas las propiedades'}</Text>
          <Text style={styles.subtitle}>
            {property ? 'Cargos y cobros de todos sus contratos' : 'Cargos y cobros de todos los contratos'}
          </Text>
        </View>
        <YearHistory
          views={propertyId ? chargeViewsForProperty(propertyId) : chargeViews}
          year={year}
          onChangeYear={setYear}
          onPressMonth={(period) => navigation.navigate('MonthDetail', { period, propertyId })}
        />
      </ScrollView>
    </Screen>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────

const useStyles = makeStyles((colors) => ({
  content: {
    padding: spacing.lg,
    paddingTop: 0,
    paddingBottom: spacing.xxl,
  },
  titleBlock: {
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize.largeTitle,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    marginTop: 2,
  },
}));
