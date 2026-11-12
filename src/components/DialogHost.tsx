// =====================================================================
// Cuadros de diálogo
// ---------------------------------------------------------------------
// Avisos y confirmaciones ("¿Seguro que querés eliminar…?"). Se llaman con showAlert() y
// showConfirm() desde cualquier pantalla.
// =====================================================================

import React, { useEffect, useState } from 'react';
import { Modal, Text, View } from 'react-native';
import { fontSize, radius, spacing } from '../theme';
import Button from './Button';
import { makeStyles } from '../context/ThemeContext';

// ── Constantes y funciones auxiliares ─────────────────────────────────

interface DialogRequest {
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm?: () => void;
  // Una salida más suave que la acción principal (por ejemplo "Finalizar en su lugar" al eliminar).
  alternative?: { label: string; onPress: () => void };
}

// Los avisos nativos no funcionan en la web, así que los cuadros de diálogo se dibujan dentro de la app.
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
  alternative?: { label: string; onPress: () => void };
}) {
  listener?.(options);
}

// ── Componente ────────────────────────────────────────────────────────

export default function DialogHost() {
  const styles = useStyles();
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
          <View style={[styles.actions, request.alternative && styles.actionsStacked]}>
            {request.onConfirm && request.alternative ? (
              <>
                <Button
                  label={request.alternative.label}
                  onPress={() => {
                    const onPress = request.alternative?.onPress;
                    close();
                    onPress?.();
                  }}
                />
                <Button
                  label={request.confirmLabel ?? 'Aceptar'}
                  variant={request.destructive ? 'dangerOutline' : 'secondary'}
                  onPress={confirm}
                />
                <Button label="Cancelar" variant="secondary" onPress={close} />
              </>
            ) : request.onConfirm ? (
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

// ── Estilos ───────────────────────────────────────────────────────────

const useStyles = makeStyles((colors) => ({
  backdrop: {
    flex: 1,
    backgroundColor: colors.backdrop,
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
  // Con tres botones van uno abajo del otro: primero la opción recomendada.
  actionsStacked: {
    flexDirection: 'column',
    gap: spacing.sm,
  },
  action: {
    flex: 1,
  },
}));
