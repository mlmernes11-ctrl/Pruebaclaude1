import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { showAlert } from '../../components/DialogHost';
import Button from '../../components/Button';
import FormField from '../../components/FormField';
import OptionChips from '../../components/OptionChips';
import Screen from '../../components/Screen';
import {
  CURRENCY_OPTIONS,
  DEFAULT_RENT_CURRENCY,
  PROPERTY_STATUS_OPTIONS,
  PROPERTY_TYPE_OPTIONS,
} from '../../constants';
import { useData } from '../../context/DataContext';
import { Currency, PropertyStatus, PropertyType } from '../../types';
import { spacing } from '../../theme';
import { CURRENCY_SYMBOL, parseAmount } from '../../utils/format';

export default function PropertyFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const propertyId = route.params?.propertyId as string | undefined;
  const { getPropertyById, addProperty, updateProperty } = useData();
  const existing = getPropertyById(propertyId);

  const [title, setTitle] = useState(existing?.title ?? '');
  const [address, setAddress] = useState(existing?.address ?? '');
  const [neighborhood, setNeighborhood] = useState(existing?.neighborhood ?? '');
  const [type, setType] = useState<PropertyType>(existing?.type ?? 'apartamento');
  const [status, setStatus] = useState<PropertyStatus>(existing?.status ?? 'disponible');
  const [rooms, setRooms] = useState(existing?.rooms ? String(existing.rooms) : '');
  const [bathrooms, setBathrooms] = useState(existing?.bathrooms ? String(existing.bathrooms) : '');
  const [area, setArea] = useState(existing?.area ? String(existing.area) : '');
  const [rentAmount, setRentAmount] = useState(existing?.rentAmount ? String(existing.rentAmount) : '');
  const [rentCurrency, setRentCurrency] = useState<Currency>(
    existing?.rentCurrency ?? DEFAULT_RENT_CURRENCY,
  );
  const [expensasAmount, setExpensasAmount] = useState(
    existing?.expensasAmount ? String(existing.expensasAmount) : '',
  );
  const [serviciosAmount, setServiciosAmount] = useState(
    existing?.serviciosAmount ? String(existing.serviciosAmount) : '',
  );
  const [notes, setNotes] = useState(existing?.notes ?? '');

  const handleSave = () => {
    if (!title.trim() || !address.trim() || !rentAmount.trim()) {
      showAlert('Faltan datos', 'Completá el nombre, la dirección y el monto de alquiler.');
      return;
    }
    const parsedRent = parseAmount(rentAmount);
    if (!parsedRent) {
      showAlert('Monto inválido', 'Ingresá un monto de alquiler válido, por ejemplo 1.500.000.');
      return;
    }
    const parsedExpensas = expensasAmount.trim() ? parseAmount(expensasAmount) : undefined;
    if (expensasAmount.trim() && parsedExpensas === undefined) {
      showAlert('Monto inválido', 'Ingresá un monto de expensas válido.');
      return;
    }
    const parsedServicios = serviciosAmount.trim() ? parseAmount(serviciosAmount) : undefined;
    if (serviciosAmount.trim() && parsedServicios === undefined) {
      showAlert('Monto inválido', 'Ingresá un monto de servicios válido.');
      return;
    }
    const parsedArea = area.trim() ? parseAmount(area) : undefined;

    const payload = {
      title: title.trim(),
      address: address.trim(),
      neighborhood: neighborhood.trim() || undefined,
      type,
      status,
      rooms: Number.parseInt(rooms, 10) || undefined,
      bathrooms: Number.parseInt(bathrooms, 10) || undefined,
      area: parsedArea || undefined,
      rentAmount: parsedRent,
      rentCurrency,
      expensasAmount: parsedExpensas || undefined,
      serviciosAmount: parsedServicios || undefined,
      notes: notes.trim() || undefined,
    };

    if (existing) {
      updateProperty(existing.id, payload);
    } else {
      addProperty(payload);
    }
    navigation.goBack();
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <FormField label="Nombre" value={title} onChangeText={setTitle} placeholder="Ej: Carpeta 102" required />
        <FormField label="Dirección" value={address} onChangeText={setAddress} placeholder="Calle, número y piso" required />
        <FormField label="Barrio" value={neighborhood} onChangeText={setNeighborhood} placeholder="Ej: Belgrano" />
        <OptionChips label="Tipo de propiedad" options={PROPERTY_TYPE_OPTIONS} value={type} onChange={setType} />
        <OptionChips label="Estado" options={PROPERTY_STATUS_OPTIONS} value={status} onChange={setStatus} />
        <OptionChips
          label="Moneda del alquiler"
          options={CURRENCY_OPTIONS}
          value={rentCurrency}
          onChange={setRentCurrency}
        />
        <FormField
          label={`Monto de alquiler mensual (${CURRENCY_SYMBOL[rentCurrency]})`}
          value={rentAmount}
          onChangeText={setRentAmount}
          placeholder="0"
          keyboardType="numeric"
          required
        />
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
        <FormField label="Ambientes" value={rooms} onChangeText={setRooms} placeholder="Ej: 3" keyboardType="number-pad" />
        <FormField label="Baños" value={bathrooms} onChangeText={setBathrooms} placeholder="Ej: 2" keyboardType="number-pad" />
        <FormField label="Superficie (m²)" value={area} onChangeText={setArea} placeholder="Ej: 65" keyboardType="numeric" />
        <FormField label="Notas" value={notes} onChangeText={setNotes} placeholder="Información adicional" multiline />
        <Button label={existing ? 'Guardar cambios' : 'Crear propiedad'} onPress={handleSave} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
});
