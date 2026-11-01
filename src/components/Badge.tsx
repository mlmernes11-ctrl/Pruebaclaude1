import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, radius, spacing } from '../theme';

export type BadgeTone = 'success' | 'warning' | 'danger' | 'neutral' | 'primary' | 'info';

const TONE_STYLES: Record<BadgeTone, { bg: string; fg: string }> = {
  success: { bg: colors.successMuted, fg: colors.success },
  warning: { bg: colors.warningMuted, fg: colors.warning },
  danger: { bg: colors.dangerMuted, fg: colors.danger },
  neutral: { bg: colors.neutralMuted, fg: colors.textMuted },
  primary: { bg: colors.primaryMuted, fg: colors.primary },
  info: { bg: colors.infoMuted, fg: colors.info },
};

export default function Badge({ label, tone = 'neutral' }: { label: string; tone?: BadgeTone }) {
  const toneStyle = TONE_STYLES[tone];
  return (
    <View style={[styles.container, { backgroundColor: toneStyle.bg }]}>
      <Text style={[styles.text, { color: toneStyle.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.round,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
});
