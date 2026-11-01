import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import Screen from '../../components/Screen';
import YearHistory from '../../components/YearHistory';
import { useData } from '../../context/DataContext';
import { makeStyles } from '../../context/ThemeContext';
import { fontSize, spacing } from '../../theme';

// A property's year, month by month; tapping a month lists its liquidaciones.
export default function PropertyPaymentsScreen() {
  const styles = useStyles();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { propertyId } = route.params;
  const { getPropertyById, chargeViewsForProperty } = useData();
  const [year, setYear] = useState(() => new Date().getFullYear());
  const property = getPropertyById(propertyId);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>{property?.title ?? 'Propiedad'}</Text>
          <Text style={styles.subtitle}>Liquidaciones y pagos de todos sus contratos</Text>
        </View>
        <YearHistory
          views={chargeViewsForProperty(propertyId)}
          year={year}
          onChangeYear={setYear}
          onPressMonth={(period) => navigation.navigate('MonthDetail', { period, propertyId })}
        />
      </ScrollView>
    </Screen>
  );
}

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
