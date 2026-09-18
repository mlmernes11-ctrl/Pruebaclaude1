import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';
import Button from '../../components/Button';
import FormField from '../../components/FormField';
import OptionChips from '../../components/OptionChips';
import Screen from '../../components/Screen';
import { PROPERTY_STATUS_OPTIONS, PROPERTY_TYPE_OPTIONS } from '../../constants';
import { useData } from '../../context/DataContext';
import { PropertyStatus, PropertyType } from '../../types';
import { spacing } from '../../theme';

export default function PropertyFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const propertyId = route.params?.propertyId as string | undefined;
  const { getPropertyById, addProperty, updateProperty } = useData();
  const existing = getPropertyById(propertyId);

  const [title, setTitle] = useState(existing?.title ?? '');
  const [address, setAddress] = useState(existing?.address ?? '');
  const [type, setType] = useState<PropertyType>(existing?.type ?? 'apartamento');
  const [status, setStatus] = useState<PropertyStatus>(existing?.status ?? 'disponible');
  const [rooms, setRooms] = useState(existing?.rooms ? String(existing.rooms) : '');
  const [bathrooms, setBathrooms] = useState(existing?.bathrooms ? String(existing.bathrooms) : '');
  const [area, setArea] = useState(existing?.area ? String(existing.area) : '');
  const [rentAmount, setRentAmount] = useState(existing?.rentAmount ? String(existing.rentAmount) : '');
  const [notes, setNotes] = useState(existing?.notes ?? '');

  const handleSave = () => {
    if (!title.trim() || !address.trim() || !rentAmount.trim()) {
      Alert.alert('Faltan datos', 'Completa el título, la dirección y el monto de alquiler.');
      return;
    }
    const parsedRent = Number(rentAmount);
    if (Number.isNaN(parsedRent) || parsedRent <= 0) {
      Alert.alert('Monto inválido', 'Ingresa un monto de alquiler válido.');
      return;
    }

    const payload = {
      title: title.trim(),
      address: address.trim(),
      type,
      status,
      rooms: rooms ? Number(rooms) : undefined,
      bathrooms: bathrooms ? Number(bathrooms) : undefined,
      area: area ? Number(area) : undefined,
      rentAmount: parsedRent,
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
      <ScrollView contentContainerStyle={styles.content}>
        <FormField label="Título" value={title} onChangeText={setTitle} placeholder="Ej: Depto Palermo 2B" required />
        <FormField label="Dirección" value={address} onChangeText={setAddress} placeholder="Calle, número, ciudad" required />
        <OptionChips label="Tipo de propiedad" options={PROPERTY_TYPE_OPTIONS} value={type} onChange={setType} />
        <OptionChips label="Estado" options={PROPERTY_STATUS_OPTIONS} value={status} onChange={setStatus} />
        <FormField
          label="Monto de alquiler mensual"
          value={rentAmount}
          onChangeText={setRentAmount}
          placeholder="0"
          keyboardType="numeric"
          required
        />
        <FormField label="Ambientes" value={rooms} onChangeText={setRooms} placeholder="Ej: 3" keyboardType="numeric" />
        <FormField label="Baños" value={bathrooms} onChangeText={setBathrooms} placeholder="Ej: 2" keyboardType="numeric" />
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
