import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { makeStyles, useTheme } from '../../context/ThemeContext';
import { fontSize, spacing } from '../../theme';

// Shown while access is checked, when the account is not the administrator, or without connection.
export default function AccessScreen({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { status, email, signOut, retry } = useAuth();

  if (status === 'loading' || status === 'checking') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const noAccess = status === 'noAccess';
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Ionicons
          name={noAccess ? 'lock-closed-outline' : 'cloud-offline-outline'}
          size={48}
          color={colors.textMuted}
        />
        <Text style={styles.title}>{noAccess ? 'Esta cuenta no tiene acceso' : 'Sin conexión con el servidor'}</Text>
        <Text style={styles.text}>
          {noAccess
            ? `${email ?? 'Esta cuenta'} no es la cuenta administradora de esta app.`
            : (message ?? 'No se pudo conectar con el servidor. Revisá la conexión a internet.')}
        </Text>
        {noAccess ? null : <Button label="Reintentar" onPress={onRetry ?? retry} style={styles.button} />}
        <Button label="Cerrar sesión" variant="secondary" onPress={signOut} style={styles.button} />
      </View>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((colors) => ({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  text: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 21,
  },
  button: {
    alignSelf: 'stretch',
  },
}));
