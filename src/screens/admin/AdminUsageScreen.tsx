// =====================================================================
// Modo admin: Uso
// ---------------------------------------------------------------------
// El camino de la prueba al primer cobro, qué acciones se hacen, desde dónde, a qué hora y
// qué pantallas se abren (y cuáles nadie abre).
// =====================================================================

import { Text } from 'react-native';
import { makeStyles } from '../../context/ThemeContext';
import { fontSize } from '../../theme';
import { actionLabel, platformLabel, SCREEN_LABELS, screenLabel, Usage, useAdminData, usePeriod } from './adminApi';
import { AdminCard, AdminScreen, BarList, StatGrid } from './AdminParts';

// Franjas horarias (hora de Argentina).
const HOUR_BLOCKS: { label: string; from: number; to: number }[] = [
  { label: '0 a 6 h', from: 0, to: 6 },
  { label: '6 a 9 h', from: 6, to: 9 },
  { label: '9 a 12 h', from: 9, to: 12 },
  { label: '12 a 15 h', from: 12, to: 15 },
  { label: '15 a 18 h', from: 15, to: 18 },
  { label: '18 a 21 h', from: 18, to: 21 },
  { label: '21 a 24 h', from: 21, to: 24 },
];

const percent = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 100)}%` : '0%');

export default function AdminUsageScreen() {
  const styles = useStyles();
  const { period } = usePeriod();
  const { data, error, refreshing, refresh } = useAdminData<Usage>('admin_usage', { p_days: period });

  const funnel = data
    ? [
        { label: 'Abrieron la app', value: data.funnel.opened },
        { label: 'Probaron el modo de ejemplo', value: data.funnel.triedDemo },
        { label: 'Crearon su cuenta', value: data.funnel.signedUp },
        { label: 'Cargaron una propiedad', value: data.funnel.loaded },
        { label: 'Registraron su primer cobro', value: data.funnel.firstPayment },
      ]
    : [];
  const platformTotal = data ? Object.values(data.platforms).reduce((a, b) => a + b, 0) : 0;
  const hours = HOUR_BLOCKS.map((block) => ({
    label: block.label,
    value: Object.entries(data?.hours ?? {}).reduce((sum, [h, c]) => (Number(h) >= block.from && Number(h) < block.to ? sum + c : sum), 0),
  }));
  const visited = new Set((data?.screens ?? []).map((s) => s.name));
  const neverOpened = Object.keys(SCREEN_LABELS).filter((name) => !visited.has(name));

  return (
    <AdminScreen title="Uso" refreshing={refreshing} onRefresh={refresh} error={error}>
      {data ? (
        <>
          <StatGrid
            items={[
              { value: String(data.sessions), label: 'veces que se abrió' },
              { value: String(Math.round(data.minutes)), label: 'minutos de uso en total' },
            ]}
          />
          <AdminCard title="De la prueba al primer cobro" footer="Cuentas creadas en el período y qué tan lejos llegaron. Abrieron y probaron se cuentan por celular o navegador.">
            <BarList rows={funnel.map((step) => ({ ...step, display: String(step.value) }))} />
          </AdminCard>
          <AdminCard title="Acciones">
            <BarList rows={data.actions.map((a) => ({ label: actionLabel(a.name), value: a.count }))} />
          </AdminCard>
          <AdminCard title="Desde dónde">
            <BarList
              rows={Object.entries(data.platforms)
                .sort((a, b) => b[1] - a[1])
                .map(([name, count]) => ({ label: platformLabel(name), value: count, display: percent(count, platformTotal) }))}
            />
          </AdminCard>
          <AdminCard title="A qué hora" footer="Hora de Argentina.">
            <BarList rows={hours.some((h) => h.value) ? hours : []} />
          </AdminCard>
          <AdminCard title="Pantallas más abiertas">
            <BarList rows={data.screens.slice(0, 8).map((s) => ({ label: screenLabel(s.name), value: s.count }))} />
            {neverOpened.length ? (
              <Text style={styles.note}>Nadie abrió: {neverOpened.map(screenLabel).join(', ')}.</Text>
            ) : null}
          </AdminCard>
        </>
      ) : null}
    </AdminScreen>
  );
}

const useStyles = makeStyles((colors) => ({
  note: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
}));
