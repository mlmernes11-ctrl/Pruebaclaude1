// =====================================================================
// Pantalla: Ingreso
// ---------------------------------------------------------------------
// Mail y contraseña, crear la cuenta la primera vez, o entrar al modo demo.
// =====================================================================

import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { makeStyles, useTheme } from '../../context/ThemeContext';
import { fontSize, radius, spacing } from '../../theme';

// ── Pantalla ──────────────────────────────────────────────────────────

// Ingreso con mail y contraseña; la primera vez, la cuenta administradora se crea acá.
export default function LoginScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { signIn, signUp, enterDemo } = useAuth();
  const [creating, setCreating] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();

  const webOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null;

  const submit = async () => {
    setError(undefined);
    setNotice(undefined);
    if (!email.trim() || !password) {
      setError('Completá el mail y la contraseña.');
      return;
    }
    setBusy(true);
    if (creating) {
      const result = await signUp(email, password);
      if (result.error) setError(result.error);
      else if (result.needsConfirmation) {
        setNotice('Te enviamos un mail para confirmar la cuenta. Abrí el enlace y después ingresá con tu contraseña.');
        setCreating(false);
      }
    } else {
      const message = await signIn(email, password);
      if (message) setError(message);
    }
    setBusy(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.logo}>
            <Ionicons name="business" size={34} color={colors.white} />
          </View>
          <Text style={styles.title} accessibilityRole="header">
            Gestión de Alquileres
          </Text>
          <Text style={styles.subtitle}>
            {creating ? 'Creá la cuenta de administradora' : 'Ingresá con tu cuenta de administradora'}
          </Text>

          <View style={styles.group}>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Mail"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              style={[styles.input, webOutline]}
              accessibilityLabel="Mail"
            />
            <View style={styles.separator} />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Contraseña"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              textContentType={creating ? 'newPassword' : 'password'}
              autoComplete={creating ? 'new-password' : 'current-password'}
              onSubmitEditing={submit}
              returnKeyType="go"
              style={[styles.input, webOutline]}
              accessibilityLabel="Contraseña"
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {notice ? <Text style={styles.notice}>{notice}</Text> : null}

          <Button label={creating ? 'Crear cuenta' : 'Ingresar'} onPress={submit} loading={busy} style={styles.primary} />
          <TouchableOpacity
            onPress={() => {
              setCreating(!creating);
              setError(undefined);
              setNotice(undefined);
            }}
            style={styles.link}
            accessibilityRole="button"
          >
            <Text style={styles.linkText}>
              {creating ? 'Ya tengo cuenta, ingresar' : '¿Primera vez? Crear cuenta'}
            </Text>
          </TouchableOpacity>

          <View style={styles.demo}>
            <Button label="Probar con datos de ejemplo" variant="secondary" onPress={enterDemo} />
            <Text style={styles.demoNote}>Se guardan solo en este dispositivo y no tocan tu cuenta.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────

const useStyles = makeStyles((colors) => ({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: colors.primarySolid,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  group: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  input: {
    minHeight: 50,
    paddingHorizontal: spacing.lg,
    fontSize: fontSize.lg,
    color: colors.text,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: spacing.lg,
  },
  error: {
    fontSize: fontSize.sm,
    color: colors.danger,
    marginTop: spacing.md,
    marginHorizontal: spacing.xs,
  },
  notice: {
    fontSize: fontSize.sm,
    color: colors.success,
    marginTop: spacing.md,
    marginHorizontal: spacing.xs,
    lineHeight: 19,
  },
  primary: {
    marginTop: spacing.lg,
  },
  link: {
    alignSelf: 'center',
    paddingVertical: spacing.md,
  },
  linkText: {
    fontSize: fontSize.md,
    color: colors.primary,
  },
  demo: {
    marginTop: spacing.xxl,
    gap: spacing.sm,
  },
  demoNote: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
}));
