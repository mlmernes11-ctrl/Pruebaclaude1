// =====================================================================
// Pantalla: Alta y edición de contrato
// =====================================================================

import { useNavigation, useRoute } from '@react-navigation/native';
import { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import DateField from '../../components/DateField';
import { showAlert, showConfirm } from '../../components/DialogHost';
import Button from '../../components/Button';
import FormField from '../../components/FormField';
import OptionChips from '../../components/OptionChips';
import Screen from '../../components/Screen';
import SelectField from '../../components/SelectField';
import { CONTRACT_STATUS_OPTIONS, CURRENCY_OPTIONS, DEFAULT_RENT_CURRENCY } from '../../constants';
import { useData } from '../../context/DataContext';
import { fontSize, spacing } from '../../theme';
import { AdjustmentIndex, ContractStatus, Currency } from '../../types';
import { ADJUSTMENT_MONTH_OPTIONS, lastPassedAdjustmentPeriod } from '../../utils/adjustments';
import { CURRENCY_SYMBOL, parseAmount, todayISO } from '../../utils/format';
import { compareTitles } from '../../utils/text';
import { smartGoBack } from '../../utils/navigation';
import { makeStyles } from '../../context/ThemeContext';

// ── Constantes y funciones auxiliares ─────────────────────────────────

type AdjustmentChoice = AdjustmentIndex | 'ninguno';

const ADJUSTMENT_OPTIONS: { value: AdjustmentChoice; label: string }[] = [
  { value: 'ninguno', label: 'Sin ajuste' },
  { value: 'ipc', label: 'IPC' },
  { value: 'icl', label: 'ICL' },
  { value: 'fijo', label: '% fijo' },
];

function isValidDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(value).getTime());
}

// ── Pantalla ──────────────────────────────────────────────────────────

export default function ContractFormScreen() {
  const styles = useStyles();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const contractId = route.params?.contractId as string | undefined;
  const presetPropertyId = route.params?.propertyId as string | undefined;
  const presetTenantId = route.params?.tenantId as string | undefined;

  const {
    getContractById, addContract, updateContract, properties, tenants, contracts, getPropertyById, mode,
    getTenantById, addTenant, updateTenant,
  } = useData();
  const existing = getContractById(contractId);

  const [propertyId, setPropertyId] = useState(existing?.propertyId ?? presetPropertyId ?? '');
  // El inquilino va dentro del contrato: sus datos se cargan acá. Si ya existe (una renovación,
  // o alguien que alquila dos propiedades), se elige de la lista y sus datos se pueden corregir.
  const initialTenant = getTenantById(existing?.tenantId ?? presetTenantId);
  const [tenantId, setTenantId] = useState(initialTenant?.id ?? '');
  const [tenantName, setTenantName] = useState(initialTenant?.name ?? '');
  const [tenantDocument, setTenantDocument] = useState(initialTenant?.document ?? '');
  const [tenantPhone, setTenantPhone] = useState(initialTenant?.phone ?? '');
  const [tenantEmail, setTenantEmail] = useState(initialTenant?.email ?? '');
  const [pickingTenant, setPickingTenant] = useState(false);
  const pickTenant = (id: string) => {
    const t = getTenantById(id);
    setTenantId(id);
    setTenantName(t?.name ?? '');
    setTenantDocument(t?.document ?? '');
    setTenantPhone(t?.phone ?? '');
    setTenantEmail(t?.email ?? '');
    setPickingTenant(false);
  };
  const newTenant = () => {
    setTenantId('');
    setTenantName('');
    setTenantDocument('');
    setTenantPhone('');
    setTenantEmail('');
  };
  const [startDate, setStartDate] = useState(existing?.startDate ?? todayISO());
  const [endDate, setEndDate] = useState(existing?.endDate ?? '');
  const presetProperty = getPropertyById(propertyId);
  const [rentAmount, setRentAmount] = useState(
    existing ? String(existing.rentAmount) : presetProperty?.rentAmount ? String(presetProperty.rentAmount) : '',
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
  // Ajuste del alquiler: tipo, cada cuántos meses y el porcentaje (si es fijo).
  const [adjustment, setAdjustment] = useState<AdjustmentChoice>(existing?.adjustmentIndex ?? 'ninguno');
  const [adjustmentMonths, setAdjustmentMonths] = useState(String(existing?.adjustmentMonths ?? 3));
  const [adjustmentPercent, setAdjustmentPercent] = useState(
    existing?.adjustmentPercent ? String(existing.adjustmentPercent) : '',
  );

  const handleSelectProperty = (id: string) => {
    setPropertyId(id);
    if (!existing && !rentAmount) {
      const property = getPropertyById(id);
      if (property?.rentAmount) {
        setRentAmount(String(property.rentAmount));
        setCurrency(property.rentCurrency);
      }
    }
  };

  const handleSave = () => {
    if (!propertyId || !tenantName.trim()) {
      showAlert('Faltan datos', 'Elegí la propiedad y completá el nombre del inquilino.');
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
      showAlert('Día inválido', 'El día de vencimiento debe estar entre 1 y 28.');
      return;
    }

    const index = adjustment === 'ninguno' ? undefined : adjustment;
    const months = Number(adjustmentMonths);
    const percent = index === 'fijo' ? parseAmount(adjustmentPercent) : undefined;
    if (index === 'fijo' && !percent) {
      showAlert('Falta el porcentaje', 'Ingresá el porcentaje de cada ajuste, por ejemplo 10.');
      return;
    }
    // El alquiler escrito es el de hoy: si el ajuste es nuevo o cambió, los ajustes que ya pasaron
    // se dan por aplicados y el servidor aplica solo los que vienen.
    const adjustmentChanged =
      !existing ||
      existing.adjustmentIndex !== index ||
      existing.adjustmentMonths !== months ||
      existing.startDate !== startDate;
    const lastAdjustedPeriod = !index
      ? undefined
      : adjustmentChanged
        ? lastPassedAdjustmentPeriod(startDate, months)
        : existing?.lastAdjustedPeriod;

    const tenantData = {
      name: tenantName.trim(),
      document: tenantDocument.trim() || undefined,
      phone: tenantPhone.trim() || undefined,
      email: tenantEmail.trim() || undefined,
    };

    const payload = {
      propertyId,
      startDate,
      endDate,
      rentAmount: parsedRent,
      currency,
      depositAmount: parsedDeposit || undefined,
      paymentDay: parsedDay,
      adjustmentIndex: index,
      adjustmentMonths: index ? months : undefined,
      adjustmentPercent: percent,
      lastAdjustedPeriod,
      status,
      notes: notes.trim() || undefined,
    };

    const save = () => {
      // Inquilino nuevo o corregido, y después el contrato.
      let savedTenantId = tenantId;
      if (savedTenantId) updateTenant(savedTenantId, tenantData);
      else savedTenantId = addTenant(tenantData).id;
      if (existing) {
        updateContract(existing.id, { ...payload, tenantId: savedTenantId });
      } else {
        addContract({ ...payload, tenantId: savedTenantId });
      }
      smartGoBack(navigation, 'Rentals');
    };

    // Dos contratos vigentes en una misma propiedad generarían dos cargos por mes.
    const otherActive = contracts.find(
      (c) => c.id !== existing?.id && c.propertyId === propertyId && c.status === 'activo',
    );
    if (status === 'activo' && otherActive) {
      showConfirm({
        title: 'La propiedad ya tiene un contrato vigente',
        message:
          'Si los dos quedan vigentes, se van a generar dos cargos por mes. Si el anterior terminó, finalizalo primero. ¿Guardar igual?',
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
    <Screen narrow>
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
        <View style={styles.tenantHeader}>
          <Text style={styles.tenantTitle}>Inquilino</Text>
          {tenantOptions.length ? (
            <TouchableOpacity
              onPress={() => (tenantId ? newTenant() : setPickingTenant((v) => !v))}
              accessibilityRole="button"
            >
              <Text style={styles.link}>{tenantId ? 'Es otro inquilino' : 'Elegir uno existente'}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        {pickingTenant ? (
          <SelectField
            label="Inquilino existente"
            placeholder="Elegí un inquilino"
            selectedId={tenantId}
            onSelect={pickTenant}
            emptyMessage="Todavía no hay inquilinos."
            options={tenantOptions}
          />
        ) : null}
        <FormField label="Nombre y apellido (o razón social)" value={tenantName} onChangeText={setTenantName} required />
        <FormField label="DNI o CUIT" value={tenantDocument} onChangeText={setTenantDocument} keyboardType="number-pad" />
        <FormField label="Teléfono" value={tenantPhone} onChangeText={setTenantPhone} keyboardType="phone-pad" />
        <FormField
          label="Mail"
          value={tenantEmail}
          onChangeText={setTenantEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Text style={styles.sectionTitle}>Condiciones</Text>
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
        <OptionChips label="Ajuste del alquiler" options={ADJUSTMENT_OPTIONS} value={adjustment} onChange={setAdjustment} />
        {adjustment !== 'ninguno' ? (
          <>
            <OptionChips
              label="Cada"
              options={ADJUSTMENT_MONTH_OPTIONS.map((m) => ({ value: String(m), label: `${m} meses` }))}
              value={adjustmentMonths}
              onChange={setAdjustmentMonths}
            />
            {adjustment === 'fijo' ? (
              <FormField
                label="Porcentaje de cada ajuste (%)"
                value={adjustmentPercent}
                onChangeText={setAdjustmentPercent}
                placeholder="Ej: 10"
                keyboardType="numeric"
                required
              />
            ) : null}
            <Text style={styles.hint}>
              {mode === 'demo'
                ? 'En el modo demo el ajuste no se aplica solo; con una cuenta, la app lo calcula y actualiza el alquiler cuando toca.'
                : adjustment === 'fijo'
                  ? 'Cuando toca, el alquiler sube solo ese porcentaje y la cuota del mes lo indica.'
                  : `Cuando toca, la app toma el ${adjustment === 'ipc' ? 'IPC del INDEC (últimos meses publicados)' : 'ICL del BCRA'}, actualiza el alquiler y la cuota del mes lo indica. El monto de arriba es el alquiler de hoy.`}
            </Text>
          </>
        ) : null}
        <FormField
          label={`Depósito de garantía (${CURRENCY_SYMBOL[currency]})`}
          value={depositAmount}
          onChangeText={setDepositAmount}
          placeholder="0"
          keyboardType="numeric"
        />
        <FormField
          label="Día de vencimiento"
          value={paymentDay}
          onChangeText={setPaymentDay}
          placeholder="1-28"
          keyboardType="number-pad"
          required
        />
        <OptionChips label="Estado" options={CONTRACT_STATUS_OPTIONS} value={status} onChange={setStatus} />
        <FormField label="Notas" value={notes} onChangeText={setNotes} placeholder="Cláusulas o información adicional" multiline />
        <Button label={existing ? 'Guardar cambios' : 'Crear contrato'} onPress={handleSave} />
      </ScrollView>
    </Screen>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────

const useStyles = makeStyles((colors) => ({
  tenantHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  tenantTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  link: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.primary,
  },
  hint: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 18,
    marginTop: -spacing.sm,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.xs,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
}));
