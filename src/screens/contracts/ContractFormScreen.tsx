import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import DateField from '../../components/DateField';
import { showAlert, showConfirm } from '../../components/DialogHost';
import Button from '../../components/Button';
import FormField from '../../components/FormField';
import OptionChips from '../../components/OptionChips';
import Screen from '../../components/Screen';
import SelectField from '../../components/SelectField';
import { CONTRACT_STATUS_OPTIONS, CURRENCY_OPTIONS, DEFAULT_RENT_CURRENCY } from '../../constants';
import { useData } from '../../context/DataContext';
import { spacing } from '../../theme';
import { ContractStatus, Currency } from '../../types';
import { CURRENCY_SYMBOL, parseAmount, todayISO } from '../../utils/format';
import { compareTitles } from '../../utils/text';
import { smartGoBack } from '../../utils/navigation';
import { makeStyles } from '../../context/ThemeContext';

function isValidDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(value).getTime());
}

export default function ContractFormScreen() {
  const styles = useStyles();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const contractId = route.params?.contractId as string | undefined;
  const presetPropertyId = route.params?.propertyId as string | undefined;
  const presetTenantId = route.params?.tenantId as string | undefined;

  const { getContractById, addContract, updateContract, deleteContract, properties, tenants, contracts, getPropertyById } =
    useData();
  const existing = getContractById(contractId);

  const [propertyId, setPropertyId] = useState(existing?.propertyId ?? presetPropertyId ?? '');
  const [tenantId, setTenantId] = useState(existing?.tenantId ?? presetTenantId ?? '');
  const [startDate, setStartDate] = useState(existing?.startDate ?? todayISO());
  const [endDate, setEndDate] = useState(existing?.endDate ?? '');
  const presetProperty = getPropertyById(propertyId);
  const [rentAmount, setRentAmount] = useState(
    existing ? String(existing.rentAmount) : presetProperty ? String(presetProperty.rentAmount) : '',
  );
  const [currency, setCurrency] = useState<Currency>(
    existing?.currency ?? presetProperty?.rentCurrency ?? DEFAULT_RENT_CURRENCY,
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
      if (property) {
        setRentAmount(String(property.rentAmount));
        setCurrency(property.rentCurrency);
      }
    }
  };

  const handleSave = () => {
    if (!propertyId || !tenantId) {
      showAlert('Faltan datos', 'Elegí la propiedad y el inquilino.');
      return;
    }
    if (!isValidDate(startDate) || !isValidDate(endDate)) {
      showAlert('Faltan fechas', 'Elegí la fecha de inicio y la de fin del contrato.');
      return;
    }
    if (endDate < startDate) {
      showAlert('Fechas inválidas', 'La fecha de fin debe ser posterior a la de inicio.');
      return;
    }
    const parsedRent = parseAmount(rentAmount);
    if (!parsedRent) {
      showAlert('Monto inválido', 'Ingresá un monto de alquiler válido, por ejemplo 1.500.000.');
      return;
    }
    const parsedDeposit = depositAmount.trim() ? parseAmount(depositAmount) : undefined;
    if (depositAmount.trim() && parsedDeposit === undefined) {
      showAlert('Monto inválido', 'Ingresá un depósito válido o dejalo vacío.');
      return;
    }
    const parsedDay = Number(paymentDay);
    if (!Number.isInteger(parsedDay) || parsedDay < 1 || parsedDay > 28) {
      showAlert('Día inválido', 'El día de pago debe estar entre 1 y 28.');
      return;
    }

    const payload = {
      propertyId,
      tenantId,
      startDate,
      endDate,
      rentAmount: parsedRent,
      currency,
      depositAmount: parsedDeposit || undefined,
      paymentDay: parsedDay,
      status,
      notes: notes.trim() || undefined,
    };

    const save = () => {
      if (existing) {
        updateContract(existing.id, payload);
      } else {
        addContract(payload);
      }
      smartGoBack(navigation, 'Rentals');
    };

    // Two active contracts on one property would bill it twice.
    const otherActive = contracts.find(
      (c) => c.id !== existing?.id && c.propertyId === propertyId && c.status === 'activo',
    );
    if (status === 'activo' && otherActive) {
      showConfirm({
        title: 'La propiedad ya tiene un contrato activo',
        message:
          'Si los dos quedan activos, se van a generar dos liquidaciones por mes. Si el anterior terminó, marcalo como finalizado. ¿Guardar igual?',
        confirmLabel: 'Guardar igual',
        onConfirm: save,
      });
      return;
    }
    save();
  };

  const propertyOptions = [...properties]
    .sort((a, b) => compareTitles(a.title, b.title))
    .map((p) => ({ id: p.id, label: p.title, subtitle: [p.address, p.neighborhood].filter(Boolean).join(' · ') }));
  const tenantOptions = [...tenants]
    .sort((a, b) => compareTitles(a.name, b.name))
    .map((t) => ({ id: t.id, label: t.name, subtitle: t.phone }));

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <SelectField
          label="Propiedad"
          placeholder="Elegí una propiedad"
          required
          selectedId={propertyId}
          onSelect={handleSelectProperty}
          emptyMessage="No hay propiedades. Creá una primero."
          options={propertyOptions}
        />
        <SelectField
          label="Inquilino"
          placeholder="Elegí un inquilino"
          required
          selectedId={tenantId}
          onSelect={setTenantId}
          emptyMessage="No hay inquilinos. Creá uno primero."
          options={tenantOptions}
        />
        <DateField label="Fecha de inicio" value={startDate} onChange={setStartDate} required />
        <DateField label="Fecha de fin" value={endDate} onChange={setEndDate} required />
        <OptionChips label="Moneda del contrato" options={CURRENCY_OPTIONS} value={currency} onChange={setCurrency} />
        <FormField
          label={`Monto de alquiler mensual (${CURRENCY_SYMBOL[currency]})`}
          value={rentAmount}
          onChangeText={setRentAmount}
          placeholder="0"
          keyboardType="numeric"
          required
        />
        <FormField
          label={`Depósito de garantía (${CURRENCY_SYMBOL[currency]})`}
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
          keyboardType="number-pad"
          required
        />
        <OptionChips label="Estado" options={CONTRACT_STATUS_OPTIONS} value={status} onChange={setStatus} />
        <FormField label="Notas" value={notes} onChangeText={setNotes} placeholder="Cláusulas o información adicional" multiline />
        <Button label={existing ? 'Guardar cambios' : 'Crear contrato'} onPress={handleSave} />
        {existing ? (
          <Button
            label="Eliminar contrato"
            variant="dangerOutline"
            style={styles.deleteButton}
            onPress={() =>
              showConfirm({
                title: 'Eliminar contrato',
                message: 'También se eliminan sus liquidaciones y pagos registrados. ¿Continuar?',
                confirmLabel: 'Eliminar',
                destructive: true,
                onConfirm: () => {
                  deleteContract(existing.id);
                  navigation.popToTop();
                },
              })
            }
          />
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const useStyles = makeStyles(() => ({
  deleteButton: {
    marginTop: spacing.md,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
}));
