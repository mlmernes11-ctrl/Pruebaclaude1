// =====================================================================
// Modo admin: ficha de una cuenta
// ---------------------------------------------------------------------
// Con qué correo y cómo ingresa, cuándo se dio de alta y cuándo entró, cuánto cargó (solo
// cantidades) y cómo usa la app. Nunca los datos de sus inquilinos ni montos.
// =====================================================================

import { Linking, Text } from 'react-native';
import Button from '../../components/Button';
import { makeStyles } from '../../context/ThemeContext';
import { fontSize } from '../../theme';
import {
  AccountDetail,
  actionLabel,
  dateTime,
  platformLabel,
  shortDate,
  timeAgo,
  useAdminData,
  usePeriod,
} from './adminApi';
import { AdminCard, AdminScreen, BarList, InfoRow, StatGrid } from './AdminParts';

const PROVIDER_LABELS: Record<string, string> = { google: 'Google', email: 'Correo y contraseña' };

export default function AdminAccountScreen({ route }: { route: { params: { id: string } } }) {
  const styles = useStyles();
  const { period } = usePeriod();
  const { data, error, refreshing, refresh } = useAdminData<AccountDetail>('admin_account', { p_user: route.params.id, p_days: period });

  return (
    <AdminScreen plain title="Cuenta" refreshing={refreshing} onRefresh={refresh} error={error}>
      {data ? (
        <>
          <AdminCard title="Datos de ingreso">
            <InfoRow label="Correo" value={data.email ?? 'Sin correo'} />
            {data.name ? <InfoRow label="Nombre" value={data.name} /> : null}
            {data.phone ? <InfoRow label="Teléfono" value={data.phone} /> : null}
            <InfoRow label="Ingresa con" value={data.providers.map((p) => PROVIDER_LABELS[p] ?? p).join(' y ') || 'Sin datos'} />
            <InfoRow label="Correo confirmado" value={data.confirmedAt ? 'Sí' : 'Todavía no'} />
            <InfoRow label="Alta" value={shortDate(data.createdAt)} />
            <InfoRow label="Último ingreso" value={timeAgo(data.lastSignInAt)} />
            <InfoRow label="Última actividad" value={timeAgo(data.lastSeen)} />
            <InfoRow label="Probó el modo de ejemplo antes" value={data.triedDemoFirst ? 'Sí' : 'No'} />
          </AdminCard>
          {data.email ? (
            <Button label="Escribirle un correo" variant="secondary" onPress={() => Linking.openURL(`mailto:${data.email}`).catch(() => undefined)} />
          ) : null}

          <StatGrid
            items={[
              { value: String(data.counts.properties), label: 'propiedades' },
              { value: String(data.counts.contracts), label: 'contratos' },
              { value: String(data.counts.tenants), label: 'inquilinos' },
              { value: String(data.counts.payments), label: 'cobros' },
            ]}
          />

          <AdminCard title="Uso en el período">
            <InfoRow label="Días que entró" value={String(data.daysActive)} />
            <InfoRow label="Minutos por día" value={String(data.minutesPerDay)} />
            <BarList
              rows={Object.entries(data.platforms).map(([name, count]) => ({ label: platformLabel(name), value: count, display: `${count} ${count === 1 ? 'vez' : 'veces'}` }))}
              empty="No entró en este período."
            />
          </AdminCard>

          <AdminCard title="Lo que más hace">
            <BarList rows={data.topActions.map((a) => ({ label: actionLabel(a.name), value: a.count }))} />
          </AdminCard>

          <AdminCard title="Lo último">
            {data.latest.length ? (
              data.latest.map((event, index) => (
                <Text key={`${event.at}-${index}`} style={styles.event}>
                  {dateTime(event.at)} · {actionLabel(event.name)}
                  {event.platform ? ` · ${platformLabel(event.platform)}` : ''}
                </Text>
              ))
            ) : (
              <Text style={styles.event}>Todavía no hay actividad anotada.</Text>
            )}
          </AdminCard>
        </>
      ) : null}
    </AdminScreen>
  );
}

const useStyles = makeStyles((colors) => ({
  event: {
    fontSize: fontSize.md,
    color: colors.text,
  },
}));
