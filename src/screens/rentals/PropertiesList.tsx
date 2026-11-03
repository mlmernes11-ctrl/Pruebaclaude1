import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import EmptyState from '../../components/EmptyState';
import ListRow, { ValueTone } from '../../components/ListRow';
import ListSection from '../../components/ListSection';
import SearchLauncher from '../../components/SearchSheet';
import StatusDot, { DotTone } from '../../components/StatusDot';
import { useData } from '../../context/DataContext';
import { makeStyles, useTheme } from '../../context/ThemeContext';
import { useRefresh } from '../../hooks/useRefresh';
import { fontSize, spacing } from '../../theme';
import { formatMoney, formatTotals } from '../../utils/format';
import { PropertySummary, summarizeProperty } from '../../utils/propertySummary';
import { compareTitles } from '../../utils/text';
import { COLLECTION_DOT } from '../../utils/status';

const LEGEND: { tone: DotTone; label: string }[] = [
  { tone: 'danger', label: 'Con deuda' },
  { tone: 'warning', label: 'Por vencer' },
  { tone: 'success', label: 'Al día' },
  { tone: 'empty', label: 'Sin inquilino' },
];

// Strong red = money owed; grey = reference (the monthly rent or the property's situation).
function rightValue(summary: PropertySummary): { value: string; tone: ValueTone } {
  const { property, activeContract, collection, overdue } = summary;
  if (collection === 'deuda') return { value: `Debe ${formatTotals(overdue.totals)}`, tone: 'danger' };
  if (collection === 'sin-contrato') return { value: 'Disponible', tone: 'primary' };
  if (collection === 'mantenimiento') return { value: 'En mantenimiento', tone: 'muted' };
  const amount = activeContract?.rentAmount ?? property.rentAmount;
  const currency = activeContract?.currency ?? property.rentCurrency;
  return { value: `${formatMoney(amount, currency)}/mes`, tone: 'muted' };
}

export default function PropertiesList() {
  const styles = useStyles();
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const { properties, contracts, chargeViews, tenants } = useData();
  const { refreshing, onRefresh } = useRefresh();
  const summaries = [...properties]
    .sort((a, b) => compareTitles(a.title, b.title))
    .map((p) => summarizeProperty(p, contracts, chargeViews, tenants));

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textMuted} />}
    >
      {properties.length ? <SearchLauncher scope="propiedades" /> : null}
      {summaries.length ? (
        <View style={styles.body}>
          <ListSection
            footer={
              <View style={styles.legend}>
                {LEGEND.map((item) => (
                  <View key={item.label} style={styles.legendItem}>
                    <StatusDot tone={item.tone} size={8} />
                    <Text style={styles.legendText}>{item.label}</Text>
                  </View>
                ))}
              </View>
            }
          >
            {summaries.map((summary) => {
              const { value, tone } = rightValue(summary);
              const { property } = summary;
              return (
                <ListRow
                  key={property.id}
                  dot={COLLECTION_DOT[summary.collection]}
                  title={property.title}
                  subtitle={[property.address, property.neighborhood].filter(Boolean).join(' · ')}
                  value={value}
                  valueTone={tone}
                  onPress={() => navigation.navigate('PropertyDetail', { propertyId: property.id })}
                />
              );
            })}
          </ListSection>
        </View>
      ) : (
        <EmptyState
          icon="business-outline"
          title="Sin propiedades"
          message="Tocá + para agregar tu primera propiedad."
        />
      )}
    </ScrollView>
  );
}

const useStyles = makeStyles((colors) => ({
  content: {
    paddingBottom: spacing.xxl,
  },
  body: {
    paddingHorizontal: spacing.lg,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    rowGap: 6,
    marginTop: spacing.sm,
    marginHorizontal: spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
}));
