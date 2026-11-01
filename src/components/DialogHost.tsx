import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, radius, spacing } from '../theme';
import Button from './Button';

interface DialogRequest {
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm?: () => void;
}

// React Native's Alert is a no-op on web, so dialogs are rendered in-app on every platform.
let listener: ((request: DialogRequest) => void) | null = null;

export function showAlert(title: string, message: string) {
  listener?.({ title, message });
}

export function showConfirm(options: {
  title: string;
  message: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
}) {
  listener?.(options);
}

export default function DialogHost() {
  const [request, setRequest] = useState<DialogRequest | null>(null);

  useEffect(() => {
    listener = setRequest;
    return () => {
      listener = null;
    };
  }, []);

  if (!request) return null;

  const close = () => setRequest(null);
  const confirm = () => {
    const onConfirm = request.onConfirm;
    close();
    onConfirm?.();
  };

  return (
    <Modal transparent visible animationType="fade" onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{request.title}</Text>
          <Text style={styles.message}>{request.message}</Text>
          <View style={styles.actions}>
            {request.onConfirm ? (
              <>
                <Button label="Cancelar" variant="secondary" onPress={close} style={styles.action} />
                <Button
                  label={request.confirmLabel ?? 'Aceptar'}
                  variant={request.destructive ? 'danger' : 'primary'}
                  onPress={confirm}
                  style={styles.action}
                />
              </>
            ) : (
              <Button label="Entendido" onPress={close} style={styles.action} />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    lineHeight: 21,
    marginBottom: spacing.xl,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  action: {
    flex: 1,
  },
});
