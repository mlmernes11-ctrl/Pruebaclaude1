// =====================================================================
// Pantalla: Alta y edición de propiedad
// ---------------------------------------------------------------------
// Arriba lo que se usa para cobrar (nombre, dirección, expensas y servicios); el resto va en
// "Más datos". El estado (alquilada o disponible) lo decide la app según los contratos: acá
// solo se marca si está en mantenimiento.
// =====================================================================

import { useNavigation, useRoute } from '@react-navigation/native';
import { useState } from 'react';
import { ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { showAlert, showConfirm } from '../../components/DialogHost';
import Button from '../../components/Button';
import FormField from '../../components/FormField';
import OptionChips from '../../components/OptionChips';
import Screen from '../../components/Screen';
import { CURRENCY_OPTIONS, DEFAULT_RENT_CURRENCY, PROPERTY_TYPE_OPTIONS } from '../../constants';
import { useData } from '../../context/DataContext';
import { makeStyles, useTheme } from '../../context/ThemeContext';
import { Currency, PropertyStatus, PropertyType } from '../../types';
import { fontSize, radius, spacing } from '../../theme';
import { CURRENCY_SYMBOL, parseAmount } from '../../utils/format';
import { useFormGuard } from '../../navigation/formScreen';

// ── Pantalla ──────────────────────────────────────────────────────────

export default function PropertyFormScreen() {
  const { markDirty } = useFormGuard();
  const styles = useStyles();
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const propertyId = route.params?.propertyId as string | undefined;
  const { getPropertyById, addProperty, updateProperty, deleteProperty, contracts } = useData();
  const existing = getPropertyById(propertyId);

  const [title, setTitle] = useState(existing?.title ?? '');
  const [address, setAddress] = useState(existing?.address ?? '');
  const [neighborhood, setNeighborhood] = useState(existing?.neighborhood ?? '');
  const [type, setType] = useState<PropertyType>(existing?.type ?? 'apartamento');
  const [maintenance, setMaintenance] = useState(existing?.status === 'mantenimiento');
  const [expensasAmount, setExpensasAmount] = useState(
    existing?.expensasAmount ? String(existing.expensasAmount) : '',
  );
  const [serviciosAmount, setServiciosAmount] = useState(
    existing?.serviciosAmount ? String(existing.serviciosAmount) : '',
  );
  // "Más datos": precio publicado, ambientes, baños y superficie.
  const [rentAmount, setRentAmount] = useState(existing?.rentAmount ? String(existing.rentAmount) : '');
  const [rentCurrency, setRentCurrency] = useState<Currency>(existing?.rentCurrency ?? DEFAULT_RENT_CURRENCY);
  const [rooms, setRooms] = useState(existing?.rooms ? String(existing.rooms) : '');
  const [bathrooms, setBathrooms] = useState(existing?.bathrooms ? String(existing.bathrooms) : '');
  const [area, setArea] = useState(existing?.area ? String(existing.area) : '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [showMore, setShowMore] = useState(false);

  // — Guardar —
  const handleSave = () => {
    if (!title.trim() || !address.trim()) {
      showAlert('Faltan datos', 'Completá el nombre y la dirección.');
      return;
    }
    const parsed = {
      rent: rentAmount.trim() ? parseAmount(rentAmount) : undefined,
      expensas: expensasAmount.trim() ? parseAmount(expensasAmount) : undefined,
      servicios: serviciosAmount.trim() ? parseAmount(serviciosAmount) : undefined,
    };
    if (expensasAmount.trim() && parsed.expensas === undefined) {
      showAlert('Monto inválido', 'Ingresá un monto de expensas válido.');
      return;
    }
    if (serviciosAmount.trim() && parsed.servicios === undefined) {
      showAlert('Monto inválido', 'Ingresá un monto de servicios válido.');
      return;
    }
    if (rentAmount.trim() && parsed.rent === undefined) {
      showAlert('Monto inválido', 'Ingresá un precio publicado válido o dejalo vacío.');
      return;
    }

    // Alquilada o disponible según tenga un contrato vigente; mantenimiento solo si se marcó.
    const rented = Boolean(existing && contracts.some((c) => c.propertyId === existing.id && c.status === 'activo'));
    const status: PropertyStatus = maintenance ? 'mantenimiento' : rented ? 'alquilada' : 'disponible';

    const payload = {
      title: title.trim(),
      address: address.trim(),
      neighborhood: neighborhood.trim() || undefined,
      type,
      status,
      rentAmount: parsed.rent || undefined,
      rentCurrency,
      expensasAmount: parsed.expensas || undefined,
      serviciosAmount: parsed.servicios || undefined,
      rooms: Number.parseInt(rooms, 10) || undefined,
      bathrooms: Number.parseInt(bathrooms, 10) || undefined,
      area: (area.trim() ? parseAmount(area) : undefined) || undefined,
      notes: notes.trim() || undefined,
    };

    if (existing) {
      updateProperty(existing.id, payload);
      navigation.goBack();
      return;
    }
    // Propiedad nueva: se ofrece cargar el contrato (con el inquilino) en el mismo recorrido.
    const created = addProperty(payload);
    navigation.goBack();
    showConfirm({
      title: 'Propiedad creada',
      message: '¿Querés cargar ahora el contrato con su inquilino?',
      confirmLabel: 'Cargar contrato',
      onConfirm: () => navigation.navigate('ContractForm', { propertyId: created.id }),
    });
  };

  // — Dibujo de la pantalla —
  return (
    <Screen narrow>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <FormField label="Nombre" value={title} onChangeText={setTitle} placeholder="Ej: Carpeta 102" required />
        <FormField label="Dirección" value={address} onChangeText={setAddress} placeholder="Calle, número y piso" required />
        <FormField label="Barrio" value={neighborhood} onChangeText={setNeighborhood} placeholder="Ej: Belgrano" />
        <OptionChips label="Tipo de propiedad" options={PROPERTY_TYPE_OPTIONS} value={type} onChange={setType} />
        <FormField
          label="Expensas mensuales en pesos (opcional)"
          value={expensasAmount}
          onChangeText={setExpensasAmount}
          placeholder="0"
          keyboardType="numeric"
        />
        <FormField
          label="Servicios mensuales en pesos (opcional)"
          value={serviciosAmount}
          onChangeText={setServiciosAmount}
          placeholder="0"
          keyboardType="numeric"
        />

        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text style={styles.switchLabel}>En mantenimiento</Text>
            <Text style={styles.switchHint}>No se alquila por ahora. Si no, la app la marca sola como alquilada o disponible.</Text>
          </View>
          <Switch
            value={maintenance}
            onValueChange={(value) => {
              markDirty();
              setMaintenance(value);
            }}
            trackColor={{ true: colors.primary, false: colors.border }}
            accessibilityLabel="En mantenimiento"
          />
        </View>

        <TouchableOpacity
          style={styles.moreToggle}
          onPress={() => setShowMore((v) => !v)}
          accessibilityRole="button"
          accessibilityState={{ expanded: showMore }}
        >
          <Text style={styles.moreLabel}>Más datos</Text>
          <Text style={styles.moreHint}>Precio publicado, ambientes, baños, superficie y notas</Text>
          <Ionicons name={showMore ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
        </TouchableOpacity>

        {showMore ? (
          <>
            <OptionChips label="Moneda del precio publicado" options={CURRENCY_OPTIONS} value={rentCurrency} onChange={setRentCurrency} />
            <FormField
              label={`Precio publicado (${CURRENCY_SYMBOL[rentCurrency]}, opcional)`}
              value={rentAmount}
              onChangeText={setRentAmount}
              placeholder="Lo que se pide al publicarla"
              keyboardType="numeric"
            />
            <FormField label="Ambientes" value={rooms} onChangeText={setRooms} placeholder="Ej: 3" keyboardType="number-pad" />
            <FormField label="Baños" value={bathrooms} onChangeText={setBathrooms} placeholder="Ej: 2" keyboardType="number-pad" />
            <FormField label="Superficie (m²)" value={area} onChangeText={setArea} placeholder="Ej: 65" keyboardType="numeric" />
            <FormField label="Notas" value={notes} onChangeText={setNotes} placeholder="Información adicional" multiline />
          </>
        ) : null}

        <Button label={existing ? 'Guardar cambios' : 'Crear propiedad'} onPress={handleSave} style={styles.saveButton} />
        {existing ? (
          <Button
            label="Eliminar propiedad"
            variant="dangerOutline"
            style={styles.deleteButton}
            onPress={() =>
              showConfirm({
                title: '¿Eliminar propiedad?',
                message: 'Es una acción permanente e irreversible.',
                confirmLabel: 'Eliminar',
                destructive: true,
                onConfirm: () => {
                  const result = deleteProperty(existing.id);
                  if (!result.ok) {
                    showAlert('No se puede eliminar', result.reason ?? 'Operación no permitida');
                    return;
                  }
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

// ── Estilos ───────────────────────────────────────────────────────────

const useStyles = makeStyles((colors) => ({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  switchText: {
    flex: 1,
  },
  switchLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  switchHint: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 18,
  },
  moreToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  moreLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.primary,
  },
  moreHint: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  saveButton: {
    marginTop: spacing.sm,
  },
  deleteButton: {
    marginTop: spacing.md,
  },
}));
