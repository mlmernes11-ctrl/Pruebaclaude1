import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { showAlert } from '../../components/DialogHost';
import Button from '../../components/Button';
import FormField from '../../components/FormField';
import OptionChips from '../../components/OptionChips';
import Screen from '../../components/Screen';
import SelectField from '../../components/SelectField';
import { CONTRACT_STATUS_OPTIONS } from '../../constants';
import { useData } from '../../context/DataContext';
import { colors, fontSize, spacing } from '../../theme';
import { ContractStatus } from '../../types';
import { smartGoBack } from '../../utils/navigation';

function isValidDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(value).getTime());
}

export default function ContractFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const contractId = route.params?.contractId as string | undefined;
  const presetPropertyId = route.params?.propertyId as string | undefined;
  const presetTenantId = route.params?.tenantId as string | undefined;

  const { getContractById, addContract, updateContract, properties, tenants, getPropertyById } =
    useData();
  const existing = getContractById(contractId);

  const [propertyId, setPropertyId] = useState(existing?.propertyId ?? presetPropertyId ?? '');
  const [tenantId, setTenantId] = useState(existing?.tenantId ?? presetTenantId ?? '');
  const [startDate, setStartDate] = useState(existing?.startDate ?? '');
  const [endDate, setEndDate] = useState(existing?.endDate ?? '');
  const [rentAmount, setRentAmount] = useState(
    existing ? String(existing.rentAmount) : propertyId ? String(getPropertyById(propertyId)?.rentAmount ?? '') : '',
  );
  const [depositAmount, setDepositAmount] = useState(
    existing?.depositAmount ? String(existing.depositAmount) : '',
  );
  const [paymentDay, setPaymentDay] = useState(existing ? String(existing.paymentDay) : '1');
  const [status, setStatus] = useState<ContractStatus>(existing?.status ?? 'activo');
  const [notes, setNotes] = useState(existing?.notes ?? '');

  const handleSelectProperty = (id: string) => {
    setPropertyId(id);
    if (!existing && !rentAmount) {
      const property = getPropertyById(id);
      if (property) setRentAmount(String(property.rentAmount));
    }
  };

  const handleSave = () => {
    if (!propertyId || !tenantId) {
      showAlert('Faltan datos', 'Selecciona la propiedad y el inquilino.');
      return;
    }
    if (!isValidDate(startDate) || !isValidDate(endDate)) {
      showAlert('Fechas inválidas', 'Ingresa las fechas en formato AAAA-MM-DD.');
      return;
    }
    if (endDate < startDate) {
      showAlert('Fechas inválidas', 'La fecha de fin debe ser posterior a la de inicio.');
      return;
    }
    const parsedRent = Number(rentAmount);
    if (Number.isNaN(parsedRent) || parsedRent <= 0) {
      showAlert('Monto inválido', 'Ingresa un monto de alquiler válido.');
      return;
    }
    const parsedDay = Number(paymentDay);
    if (Number.isNaN(parsedDay) || parsedDay < 1 || parsedDay > 28) {
      showAlert('Día inválido', 'El día de pago debe estar entre 1 y 28.');
      return;
    }

    const payload = {
      propertyId,
      tenantId,
      startDate,
      endDate,
      rentAmount: parsedRent,
      depositAmount: depositAmount ? Number(depositAmount) : undefined,
      paymentDay: parsedDay,
      status,
      notes: notes.trim() || undefined,
    };

    if (existing) {
      updateContract(existing.id, payload);
    } else {
      addContract(payload);
    }
    smartGoBack(navigation, 'ContractsList');
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <SelectField
          label="Propiedad"
          placeholder="Selecciona una propiedad"
          required
          selectedId={propertyId}
          onSelect={handleSelectProperty}
          emptyMessage="No hay propiedades. Crea una primero."
          options={properties.map((p) => ({ id: p.id, label: p.title, subtitle: p.address }))}
        />
        <SelectField
          label="Inquilino"
          placeholder="Selecciona un inquilino"
          required
          selectedId={tenantId}
          onSelect={setTenantId}
          emptyMessage="No hay inquilinos. Crea uno primero."
          options={tenants.map((t) => ({ id: t.id, label: t.name, subtitle: t.phone }))}
        />
        <Text style={styles.hint}>Formato de fechas: AAAA-MM-DD</Text>
        <FormField label="Fecha de inicio" value={startDate} onChangeText={setStartDate} placeholder="2024-01-01" required />
        <FormField label="Fecha de fin" value={endDate} onChangeText={setEndDate} placeholder="2024-12-31" required />
        <FormField
          label="Monto de alquiler mensual"
          value={rentAmount}
          onChangeText={setRentAmount}
          placeholder="0"
          keyboardType="numeric"
          required
        />
        <FormField
          label="Depósito de garantía"
          value={depositAmount}
          onChangeText={setDepositAmount}
          placeholder="0"
          keyboardType="numeric"
        />
        <FormField
          label="Día de pago mensual"
          value={paymentDay}
          onChangeText={setPaymentDay}
          placeholder="1-28"
          keyboardType="numeric"
          required
        />
        <OptionChips label="Estado" options={CONTRACT_STATUS_OPTIONS} value={status} onChange={setStatus} />
        <FormField label="Notas" value={notes} onChangeText={setNotes} placeholder="Cláusulas o información adicional" multiline />
        <Button label={existing ? 'Guardar cambios' : 'Crear contrato'} onPress={handleSave} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  hint: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    marginTop: -spacing.sm,
  },
});
