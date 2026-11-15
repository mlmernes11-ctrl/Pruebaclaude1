// =====================================================================
// Modo admin: Menú
// ---------------------------------------------------------------------
// Pasar a la app de siempre («Ver Locatia como usuario»), la cuenta y cerrar sesión.
// =====================================================================

import ListRow from '../../components/ListRow';
import ListSection from '../../components/ListSection';
import { useAdmin } from '../../context/AdminContext';
import { useAuth } from '../../context/AuthContext';
import { AdminScreen } from './AdminParts';

export default function AdminMenuScreen() {
  const { email, signOut } = useAuth();
  const { setAdminView } = useAdmin();
  return (
    <AdminScreen title="Menú" showPeriod={false}>
      <ListSection footer="Abre Locatia como la ve cualquier cuenta, con tus datos. Para volver: Menú › Volver al modo admin.">
        <ListRow title="Ver Locatia como usuario" icon="swap-horizontal-outline" onPress={() => setAdminView(false)} />
      </ListSection>
      <ListSection footer="Solo esta cuenta ve el modo admin. Lo que hace no cuenta en los números.">
        <ListRow title="Cuenta" value={email} icon="person-circle-outline" />
        <ListRow title="Cerrar sesión" icon="log-out-outline" destructive onPress={() => signOut()} />
      </ListSection>
    </AdminScreen>
  );
}
