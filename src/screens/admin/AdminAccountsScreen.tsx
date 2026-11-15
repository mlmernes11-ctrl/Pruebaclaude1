// =====================================================================
// Modo admin: Cuentas
// ---------------------------------------------------------------------
// Todas las cuentas, con su etiqueta (Activa, Probando, Sin uso), la última vez que entraron,
// cuántas propiedades tienen y cuántas acciones hicieron en el período. Tocar una abre su ficha.
// =====================================================================

import { useState } from 'react';
import Badge, { BadgeTone } from '../../components/Badge';
import ListRow from '../../components/ListRow';
import ListSection from '../../components/ListSection';
import SegmentedControl from '../../components/SegmentedControl';
import { accountState, AccountsList, AccountState, timeAgo, useAdminData, usePeriod } from './adminApi';
import { AdminScreen } from './AdminParts';

type Order = 'recientes' | 'acciones' | 'alta';
const ORDER_OPTIONS: { value: Order; label: string }[] = [
  { value: 'recientes', label: 'Última vez' },
  { value: 'acciones', label: 'Acciones' },
  { value: 'alta', label: 'Alta' },
];
const STATE_TONE: Record<AccountState, BadgeTone> = { Activa: 'success', Probando: 'info', 'Sin uso': 'warning' };

const time = (iso: string | null) => (iso ? new Date(iso).getTime() : 0);

export default function AdminAccountsScreen({ navigation }: { navigation: any }) {
  const { period } = usePeriod();
  const [order, setOrder] = useState<Order>('recientes');
  const { data, error, refreshing, refresh } = useAdminData<AccountsList>('admin_accounts', { p_days: period });

  const rows = [...(data?.accounts ?? [])].sort((a, b) => {
    if (order === 'acciones') return b.actions - a.actions;
    if (order === 'alta') return time(b.createdAt) - time(a.createdAt);
    return time(b.lastSeen) - time(a.lastSeen);
  });
  const eyebrow = data
    ? `${data.accounts.length} ${data.accounts.length === 1 ? 'cuenta' : 'cuentas'} · ${data.demoDevices} en el modo de ejemplo`
    : undefined;

  return (
    <AdminScreen title="Cuentas" eyebrow={eyebrow} refreshing={refreshing} onRefresh={refresh} error={error}>
      <SegmentedControl options={ORDER_OPTIONS} value={order} onChange={setOrder} />
      {data ? (
        <ListSection footer="Acciones: las del período elegido. Sin uso: más de 14 días sin entrar.">
          {rows.map((row) => {
            const state = accountState(row);
            return (
              <ListRow
                key={row.id}
                title={row.name || row.email || 'Sin correo'}
                subtitle={`${timeAgo(row.lastSeen)} · ${row.properties} ${row.properties === 1 ? 'propiedad' : 'propiedades'} · ${row.actions} ${row.actions === 1 ? 'acción' : 'acciones'}`}
                value={<Badge label={state} tone={STATE_TONE[state]} />}
                onPress={() => navigation.navigate('AdminAccount', { id: row.id, title: row.name || row.email })}
              />
            );
          })}
        </ListSection>
      ) : null}
    </AdminScreen>
  );
}
