import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Card from '../components/Card';
import Screen from '../components/Screen';
import { useData } from '../context/DataContext';
import { colors, fontSize, radius, spacing } from '../theme';
import { formatCurrency, formatPeriod } from '../utils/format';
import { getPaymentStatus } from '../utils/payments';

export default function DashboardScreen() {
  const { stats, payments, contracts, getPropertyById, getTenantById } = useData();
  const navigation = useNavigation<any>();

  const upcomingPayments = payments
    .filter((p) => getPaymentStatus(p) !== 'pagado')
    .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1))
    .slice(0, 5);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.header}>Resumen</Text>
        <Text style={styles.subheader}>Vista general de tu cartera de alquileres</Text>

        <View style={styles.grid}>
          <StatCard
            icon="business-outline"
            label="Propiedades"
            value={String(stats.totalProperties)}
            tone={colors.primary}
            onPress={() => navigation.navigate('PropertiesTab')}
          />
          <StatCard
            icon="document-text-outline"
            label="Contratos activos"
            value={String(stats.activeContracts)}
            tone={colors.success}
            onPress={() => navigation.navigate('ContractsTab')}
          />
        </View>

        <Card style={styles.incomeCard}>
          <Text style={styles.incomeLabel}>Ingreso mensual esperado</Text>
          <Text style={styles.incomeValue}>{formatCurrency(stats.monthlyExpectedIncome)}</Text>
          <View style={styles.incomeRow}>
            <View style={styles.incomeItem}>
              <View style={[styles.dot, { backgroundColor: colors.success }]} />
              <Text style={styles.incomeItemText}>
                {stats.rentedProperties} alquiladas
              </Text>
            </View>
            <View style={styles.incomeItem}>
              <View style={[styles.dot, { backgroundColor: colors.primary }]} />
              <Text style={styles.incomeItemText}>
                {stats.availableProperties} disponibles
              </Text>
            </View>
            <View style={styles.incomeItem}>
              <View style={[styles.dot, { backgroundColor: colors.warning }]} />
              <Text style={styles.incomeItemText}>
                {stats.maintenanceProperties} en mantenimiento
              </Text>
            </View>
          </View>
        </Card>

        <View style={styles.grid}>
          <StatCard
            icon="time-outline"
            label="Pagos pendientes"
            value={formatCurrency(stats.pendingAmount)}
            sublabel={`${stats.pendingCount} pagos`}
            tone={colors.warning}
            onPress={() => navigation.navigate('PaymentsTab')}
          />
          <StatCard
            icon="alert-circle-outline"
            label="Pagos vencidos"
            value={formatCurrency(stats.overdueAmount)}
            sublabel={`${stats.overdueCount} pagos`}
            tone={colors.danger}
            onPress={() => navigation.navigate('PaymentsTab')}
          />
        </View>

        <Text style={styles.sectionTitle}>Próximos cobros</Text>
        {upcomingPayments.length === 0 ? (
          <Card>
            <Text style={styles.emptyText}>No hay pagos pendientes registrados.</Text>
          </Card>
        ) : (
          upcomingPayments.map((payment) => {
            const contract = contracts.find((c) => c.id === payment.contractId);
            const property = getPropertyById(contract?.propertyId);
            const tenant = getTenantById(contract?.tenantId);
            const status = getPaymentStatus(payment);
            return (
              <Card key={payment.id} style={styles.paymentRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.paymentTitle}>{property?.title ?? 'Propiedad'}</Text>
                  <Text style={styles.paymentSubtitle}>
                    {tenant?.name ?? 'Inquilino'} · {formatPeriod(payment.period)}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.paymentAmount}>{formatCurrency(payment.amount)}</Text>
                  <Text
                    style={[
                      styles.paymentStatus,
                      { color: status === 'vencido' ? colors.danger : colors.warning },
                    ]}
                  >
                    {status === 'vencido' ? 'Vencido' : 'Pendiente'}
                  </Text>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}

function StatCard({
  icon,
  label,
  value,
  sublabel,
  tone,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  sublabel?: string;
  tone: string;
  onPress?: () => void;
}) {
  return (
    <Card onPress={onPress} style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${tone}1A` }]}>
        <Ionicons name={icon} size={20} color={tone} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sublabel ? <Text style={styles.statSublabel}>{sublabel}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  header: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.text,
  },
  subheader: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.text,
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  statSublabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  incomeCard: {
    marginBottom: spacing.md,
  },
  incomeLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  incomeValue: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.text,
    marginTop: 4,
    marginBottom: spacing.md,
  },
  incomeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  incomeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  incomeItemText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  paymentTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  paymentSubtitle: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  paymentAmount: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  paymentStatus: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    marginTop: 2,
  },
  emptyText: {
    color: colors.textMuted,
    textAlign: 'center',
  },
});
