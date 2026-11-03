import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useLayoutEffect } from 'react';
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
import { contractDot } from '../../utils/status';

// Argentine mobile numbers for WhatsApp links: country code 54 plus the 9 for mobiles.
function whatsappUrl(phone: string): string {
  let digits = phone.replace(/\D/g, '').replace(/^0/, '');
  if (!digits.startsWith('54')) digits = `549${digits}`;
  return `https://wa.me/${digits}`;
}

const openUrl = (url: string) => Linking.openURL(url).catch(() => undefined);

export default function TenantDetailScreen() {
  const styles = useStyles();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { tenantId } = route.params;
  const { getTenantById, contractsForTenant, getPropertyById } = useData();
  const tenant = getTenantById(tenantId);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: '',
      headerRight: tenant
        ? () => <HeaderTextButton label="Editar" onPress={() => navigation.navigate('TenantForm', { tenantId })} />
        : undefined,
    });
  }, [navigation, tenant, tenantId]);

  if (!tenant) {
    return (
      <Screen>
        <Text style={styles.notFound}>Inquilino no encontrado.</Text>
      </Screen>
    );
  }

  const contracts = contractsForTenant(tenant.id);
  const hasContact = tenant.phone || tenant.email || tenant.document;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
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
            <ListRow title="WhatsApp" icon="logo-whatsapp" onPress={() => openUrl(whatsappUrl(tenant.phone!))} chevron={false} />
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
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
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
