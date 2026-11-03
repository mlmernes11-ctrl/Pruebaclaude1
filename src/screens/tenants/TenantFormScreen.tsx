import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { showAlert, showConfirm } from '../../components/DialogHost';
import Button from '../../components/Button';
import FormField from '../../components/FormField';
import Screen from '../../components/Screen';
import { useData } from '../../context/DataContext';
import { spacing } from '../../theme';
import { makeStyles } from '../../context/ThemeContext';

export default function TenantFormScreen() {
  const styles = useStyles();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const tenantId = route.params?.tenantId as string | undefined;
  const { getTenantById, addTenant, updateTenant, deleteTenant } = useData();
  const existing = getTenantById(tenantId);

  const [name, setName] = useState(existing?.name ?? '');
  const [document, setDocument] = useState(existing?.document ?? '');
  const [email, setEmail] = useState(existing?.email ?? '');
  const [phone, setPhone] = useState(existing?.phone ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');

  const handleSave = () => {
    if (!name.trim()) {
      showAlert('Falta el nombre', 'Ingresá el nombre del inquilino.');
      return;
    }

    const payload = {
      name: name.trim(),
      document: document.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    if (existing) {
      updateTenant(existing.id, payload);
    } else {
      addTenant(payload);
    }
    navigation.goBack();
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <FormField label="Nombre completo" value={name} onChangeText={setName} placeholder="Ej: Ana Gómez" required />
        <FormField label="Documento" value={document} onChangeText={setDocument} placeholder="DNI / Pasaporte" />
        <FormField label="Teléfono" value={phone} onChangeText={setPhone} placeholder="Número de contacto" keyboardType="phone-pad" />
        <FormField label="Correo electrónico" value={email} onChangeText={setEmail} placeholder="correo@ejemplo.com" keyboardType="email-address" />
        <FormField label="Notas" value={notes} onChangeText={setNotes} placeholder="Información adicional" multiline />
        <Button label={existing ? 'Guardar cambios' : 'Crear inquilino'} onPress={handleSave} />
        {existing ? (
          <Button
            label="Eliminar inquilino"
            variant="dangerOutline"
            style={styles.deleteButton}
            onPress={() =>
              showConfirm({
                title: 'Eliminar inquilino',
                message: `¿Seguro que querés eliminar a "${existing.name}"?`,
                confirmLabel: 'Eliminar',
                destructive: true,
                onConfirm: () => {
                  const result = deleteTenant(existing.id);
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

const useStyles = makeStyles(() => ({
  deleteButton: {
    marginTop: spacing.md,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
}));
