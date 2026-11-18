// =====================================================================
// Inicio: «Tus alquileres» y «Últimos cobros»
// ---------------------------------------------------------------------
// «Tus alquileres»: una sola lista con lo que se debe (primero) y lo que vence pronto. Cada
// tarjeta dice el estado en su color («2 meses vencidos», «Vence el 05/12») y el inquilino; al
// tocarla se abre con todo lo adeudado mes por mes, «Cobrar», «WhatsApp» y el enlace a la ficha.
// Se ven las primeras cinco y «Ver más» despliega el resto ahí mismo.
// «Últimos cobros»: los tres más recientes y «Ver todo el historial», que abre la lista completa
// de cobros y cargos (con buscador y filtros) a pantalla completa.
// =====================================================================

import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { LayoutAnimation, Platform, Text, TouchableOpacity, View } from 'react-native';
import SectionHeader from '../components/SectionHeader';
import { useData } from '../context/DataContext';
import { makeStyles, useTheme } from '../context/ThemeContext';
import { trackAction } from '../lib/usage';
import { fontSize, radius, spacing } from '../theme';
import { formatDayMonth, formatMoney } from '../utils/format';
import { debtReminderText, openWhatsapp } from '../utils/whatsapp';
import ChargeGroupRow, { ChargeGroup, createOpenGroup, groupByContract } from './payments/ChargeGroupRow';

// Cuántas tarjetas se ven antes de «Ver más».
const FIRST = 5;
// Cuántos cobros muestra «Últimos cobros».
const RECENT = 3;

// ── Tus alquileres ────────────────────────────────────────────────────

export default function HomeCollections() {
  const styles = useStyles();
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const { chargeViews, getContractById, getPropertyById, getTenantById } = useData();
  const [openGroup] = useState(createOpenGroup);
  const [showAll, setShowAll] = useState(false);

  const titleOf = (contractId: string) => getPropertyById(getContractById(contractId)?.propertyId)?.title ?? 'Propiedad';
  const tenantOf = (group: ChargeGroup) => getTenantById(getContractById(group.contractId)?.tenantId)?.name;
  const overdue = groupByContract(chargeViews.filter((v) => v.status === 'vencido'), 'vencido', titleOf);
  const upcoming = groupByContract(chargeViews.filter((v) => v.status === 'pendiente'), 'a-vencer', titleOf);
  const all = [
    ...overdue.map((group) => ({ group, tone: 'danger' as const })),
    ...upcoming.map((group) => ({ group, tone: 'warning' as const })),
  ];
  const list = showAll ? all : all.slice(0, FIRST);
  const rest = all.length - FIRST;

  const remind = (group: ChargeGroup) => {
    const contract = getContractById(group.contractId);
    const tenant = getTenantById(contract?.tenantId);
    trackAction('recordar_deuda');
    openWhatsapp(tenant?.phone?.trim(), debtReminderText(tenant, getPropertyById(contract?.propertyId), group.items));
  };
  const toggleAll = () => {
    if (Platform.OS !== 'web') LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowAll((current) => !current);
  };

  return (
    <View style={styles.block}>
      <Text style={styles.blockTitle}>Tus alquileres</Text>
      {all.length === 0 ? (
        <View style={styles.calm}>
          <Ionicons name="checkmark-circle" size={22} color={colors.success} />
          <Text style={styles.calmText}>Nadie debe y no hay vencimientos cerca.</Text>
        </View>
      ) : (
        <View>
          {list.map(({ group, tone }, index) => (
            <ChargeGroupRow
              key={group.key}
              group={group}
              tone={tone}
              tenant={tenantOf(group)}
              openGroup={openGroup}
              isFirst={index === 0}
              isLast={index === list.length - 1}
              prevKey={list[index - 1]?.group.key}
              nextKey={list[index + 1]?.group.key}
              onOpenCharge={(chargeId) => navigation.navigate('ChargeForm', { chargeId })}
              onCollect={() => navigation.navigate('PaymentForm', { contractId: group.contractId })}
              onRemind={() => remind(group)}
              onOpenProperty={() =>
                navigation.navigate('PropertyDetail', { propertyId: getContractById(group.contractId)?.propertyId })
              }
            />
          ))}
        </View>
      )}
      {rest > 0 ? (
        <TouchableOpacity style={styles.more} onPress={toggleAll} accessibilityRole="button">
          <Text style={styles.moreText}>{showAll ? 'Ver menos' : 'Ver más'}</Text>
          <Ionicons name={showAll ? 'chevron-up' : 'chevron-down'} size={16} color={colors.primary} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// ── Últimos cobros ────────────────────────────────────────────────────

export function RecentPayments() {
  const styles = useStyles();
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const { payments, getContractById, getPropertyById, getTenantById } = useData();
  const recent = [...payments].sort((a, b) => b.date.localeCompare(a.date)).slice(0, RECENT);
  const openHistory = () =>
    navigation.navigate('TodosCobros', { mode: 'cobros' });

  return (
    <>
      <SectionHeader title="Últimos cobros" />
      <View style={styles.card}>
        {recent.length ? (
          recent.map((payment, index) => {
            const contract = getContractById(payment.contractId);
            return (
              <TouchableOpacity
                key={payment.id}
                activeOpacity={0.6}
                style={[styles.paidRow, index > 0 && styles.separator]}
                onPress={() => navigation.navigate('PaymentDetail', { paymentId: payment.id })}
                accessibilityRole="button"
              >
                <View style={[styles.paidIcon, { backgroundColor: colors.successMuted }]}>
                  <Ionicons name="receipt-outline" size={18} color={colors.success} />
                </View>
                <View style={styles.texts}>
                  <Text style={styles.paidTitle} numberOfLines={1}>
                    {getPropertyById(contract?.propertyId)?.title ?? 'Propiedad'}
                  </Text>
                  <Text style={styles.paidSub} numberOfLines={1}>
                    {[getTenantById(contract?.tenantId)?.name, formatDayMonth(payment.date)].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <Text style={styles.paidAmount}>{formatMoney(payment.amount, payment.currency)}</Text>
              </TouchableOpacity>
            );
          })
        ) : (
          <Text style={[styles.paidSub, styles.empty]}>Todavía no hay cobros registrados.</Text>
        )}
        <TouchableOpacity style={[styles.historyLink, styles.separator]} onPress={openHistory} accessibilityRole="button">
          <Text style={styles.moreText}>Ver todo el historial</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────

const useStyles = makeStyles((colors) => ({
  block: {
    marginBottom: spacing.lg,
  },
  blockTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.sm,
  },
  calm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  calmText: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
  },
  more: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.md,
  },
  moreText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.primary,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  paidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  paidIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    flex: 1,
    minWidth: 0,
  },
  paidTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  paidSub: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  paidAmount: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.success,
    fontVariant: ['tabular-nums'],
  },
  empty: {
    paddingVertical: spacing.md,
  },
  historyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.md,
  },
  separator: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
}));
