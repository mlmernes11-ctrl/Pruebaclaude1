// =====================================================================
// Modo admin: Inicio
// ---------------------------------------------------------------------
// ¿La están usando? Cuatro números del período (con la diferencia frente al anterior), lo
// más usado y la última cuenta nueva.
// =====================================================================

import { Text } from 'react-native';
import { makeStyles } from '../../context/ThemeContext';
import { fontSize } from '../../theme';
import { actionLabel, delta, Overview, PERIOD_OPTIONS, timeAgo, useAdminData, usePeriod } from './adminApi';
import { AdminCard, AdminScreen, BarList, StatGrid } from './AdminParts';

export default function AdminHomeScreen() {
  const styles = useStyles();
  const { period } = usePeriod();
  const { data, error, refreshing, refresh } = useAdminData<Overview>('admin_overview', { p_days: period });
  const periodLabel = PERIOD_OPTIONS.find((o) => o.value === `${period}`)?.label ?? '';

  return (
    <AdminScreen title="Resumen" eyebrow={`Últimos ${periodLabel} · frente al período anterior`} refreshing={refreshing} onRefresh={refresh} error={error}>
      {data ? (
        <>
          <StatGrid
            items={[
              { value: String(data.activeAccounts), label: 'cuentas activas', note: delta(data.activeAccounts, data.activeAccountsPrev) },
              { value: String(data.demoDevices), label: 'probando el modo de ejemplo', note: delta(data.demoDevices, data.demoDevicesPrev) },
              { value: String(data.payments), label: 'cobros registrados', note: delta(data.payments, data.paymentsPrev) },
              { value: String(data.minutesPerDay), label: 'minutos de uso por día', note: delta(data.minutesPerDay, data.minutesPerDayPrev) },
            ]}
          />
          <AdminCard title="Lo más usado">
            <BarList rows={data.topActions.map((a) => ({ label: actionLabel(a.name), value: a.count }))} />
          </AdminCard>
          <AdminCard title="Cuentas" footer="Activas: entraron en el período. El modo de ejemplo se cuenta por celular o navegador.">
            <Text style={styles.line}>
              {data.accounts} {data.accounts === 1 ? 'cuenta creada' : 'cuentas creadas'} en total
            </Text>
            <Text style={styles.line}>Última cuenta nueva: {timeAgo(data.latestSignup).toLowerCase()}</Text>
          </AdminCard>
        </>
      ) : null}
    </AdminScreen>
  );
}

const useStyles = makeStyles((colors) => ({
  line: {
    fontSize: fontSize.md,
    color: colors.text,
  },
}));
