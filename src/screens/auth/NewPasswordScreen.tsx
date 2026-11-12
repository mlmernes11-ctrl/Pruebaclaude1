// =====================================================================
// Pantalla: Contraseña nueva
// ---------------------------------------------------------------------
// Aparece al volver del enlace de "Olvidé mi contraseña": se elige la contraseña nueva y se
// sigue a la app con la sesión ya abierta.
// =====================================================================

import { useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../../components/Button';
import FormField from '../../components/FormField';
import { useAuth } from '../../context/AuthContext';
import { makeStyles } from '../../context/ThemeContext';
import { fontSize, spacing } from '../../theme';

export default function NewPasswordScreen() {
  const styles = useStyles();
  const { setNewPassword, email } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const save = async () => {
    setError(undefined);
    if (password.length < 6) {
      setError('La contraseña tiene que tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden. Escribila igual en los dos campos.');
      return;
    }
    setBusy(true);
    const message = await setNewPassword(password);
    setBusy(false);
    if (message) setError(message);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title} accessibilityRole="header">
          Elegí tu contraseña nueva
        </Text>
        {email ? <Text style={styles.subtitle}>Para la cuenta {email}</Text> : null}
        <FormField label="Contraseña nueva" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />
        <FormField label="Repetir contraseña" value={confirm} onChangeText={setConfirm} secureTextEntry autoCapitalize="none" />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button label="Guardar contraseña" onPress={save} loading={busy} />
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((colors) => ({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    marginBottom: spacing.xl,
  },
  error: {
    color: colors.danger,
    fontSize: fontSize.md,
    marginBottom: spacing.md,
  },
}));
