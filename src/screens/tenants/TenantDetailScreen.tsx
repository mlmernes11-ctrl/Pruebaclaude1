// =====================================================================
// Pantalla: Ficha del inquilino
// ---------------------------------------------------------------------
// Contacto (llamar, WhatsApp, mail) y sus contratos.
// =====================================================================

import { useNavigation, useRoute } from '@react-navigation/native';
import { useLayoutEffect } from 'react';
import { Linking, ScrollView, Text, View } from 'react-native';
import HeaderTextButton from '../../components/HeaderTextButton';
import ListRow from '../../components/ListRow';
import ListSection from '../../components/ListSection';
import Screen from '../../components/Screen';
import { CONTRACT_STATUS_LABEL } from '../../constants';
import { useData } from '../../context/DataContext';
import { makeStyles } from '../../context/ThemeContext';
import { fontSize, spacing } from '../../theme';
import { formatDate } from '../../utils/format';
import { contractEndBadge } from '../../utils/propertySummary';
import { whatsappUrl } from '../../utils/whatsapp';
import { contractDot } from '../../utils/status';

// ── Constantes y funciones auxiliares ─────────────────────────────────


const openUrl = (url: string) => Linking.openURL(url).catch(() => undefined);

// ── Pantalla ──────────────────────────────────────────────────────────

export default function TenantDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { tenantId } = route.params;
  const { getTenantById } = useData();
  const exists = Boolean(getTenantById(tenantId));

  useLayoutEffect(() => {
    navigation.setOptions({
      title: '',
      headerRight: exists
        ? () => <HeaderTextButton label="Editar" onPress={() => navigation.navigate('TenantForm', { tenantId })} />
        : undefined,
    });
  }, [navigation, exists, tenantId]);

  return (
    <Screen>
      <TenantDetail tenantId={tenantId} />
    </Screen>
  );
}

// Contenido de la ficha. En pantalla grande también se muestra como panel al costado de la
// lista ("embedded"); ahí no hay barra de arriba, así que el botón Editar va dentro.
export function TenantDetail({ tenantId, embedded }: { tenantId: string; embedded?: boolean }) {
  const styles = useStyles();
  const navigation = useNavigation<any>();
  const { getTenantById, contractsForTenant, getPropertyById } = useData();
  const tenant = getTenantById(tenantId);

  if (!tenant) return <Text style={styles.notFound}>Inquilino no encontrado.</Text>;

  const contracts = contractsForTenant(tenant.id);
  const hasContact = tenant.phone || tenant.email || tenant.document;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {embedded ? (
        <View style={styles.embeddedBar}>
          <HeaderTextButton inline label="Editar" onPress={() => navigation.navigate('TenantForm', { tenantId })} />
        </View>
      ) : null}
      <View style={styles.titleBlock}>
        <Text style={styles.title} accessibilityRole="header">
          {tenant.name}
        </Text>
      </View>

      <ListSection header="Contacto" footer={tenant.notes ? `Notas: ${tenant.notes}` : undefined}>
        {tenant.phone ? (
          <ListRow
            title="Llamar"
            icon="call-outline"
            value={tenant.phone}
            valueTone="muted"
            onPress={() => openUrl(`tel:${tenant.phone!.replace(/[^\d+]/g, '')}`)}
            chevron={false}
          />
        ) : null}
        {tenant.phone ? (
          <ListRow
            title="WhatsApp"
            icon="logo-whatsapp"
            onPress={() => openUrl(whatsappUrl(tenant.phone!))}
            chevron={false}
          />
        ) : null}
        {tenant.email ? (
          <ListRow
            title="Email"
            icon="mail-outline"
            value={tenant.email}
            valueTone="muted"
            onPress={() => openUrl(`mailto:${tenant.email}`)}
            chevron={false}
          />
        ) : null}
        {tenant.document ? <ListRow title="Documento" value={tenant.document} valueTone="muted" /> : null}
        {hasContact ? null : <ListRow title="Sin datos de contacto" />}
      </ListSection>

      <ListSection header="Contratos">
        {contracts.map((contract) => {
          const end = contractEndBadge(contract);
          return (
            <ListRow
              key={contract.id}
              dot={contractDot(contract)}
              title={getPropertyById(contract.propertyId)?.title ?? 'Propiedad'}
              subtitle={
                contract.status !== 'activo'
                  ? `${formatDate(contract.startDate)} al ${formatDate(contract.endDate)}`
                  : end
                    ? end.label
                    : `Hasta ${formatDate(contract.endDate)}`
              }
              value={CONTRACT_STATUS_LABEL[contract.status]}
              valueTone="muted"
              onPress={() => navigation.navigate('ContractDetail', { contractId: contract.id })}
            />
          );
        })}
        <ListRow
          title="Nuevo contrato"
          icon="add-circle-outline"
          onPress={() => navigation.navigate('ContractForm', { tenantId: tenant.id })}
        />
      </ListSection>
    </ScrollView>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────

const useStyles = makeStyles((colors) => ({
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  embeddedBar: {
    alignItems: 'flex-end',
    marginBottom: -spacing.sm,
  },
  notFound: {
    padding: spacing.lg,
    color: colors.textMuted,
  },
  titleBlock: {
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.largeTitle,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: colors.text,
  },
}));
