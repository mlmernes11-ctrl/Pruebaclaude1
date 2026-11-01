import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { makeStyles } from '../context/ThemeContext';
import { fontSize, spacing } from '../theme';

// Big screen title (iOS "large title") with an optional caption or "+" action on the right.
export default function LargeTitleHeader({
  title,
  caption,
  onCaptionPress,
  onAdd,
  addLabel = 'Agregar',
}: {
  title: string;
  caption?: string;
  onCaptionPress?: () => void;
  onAdd?: () => void;
  addLabel?: string;
}) {
  const styles = useStyles();
  return (
    <View style={styles.row}>
      <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
        {title}
      </Text>
      {caption ? (
        <TouchableOpacity onPress={onCaptionPress} disabled={!onCaptionPress} hitSlop={8}>
          <Text style={styles.caption}>{caption}</Text>
        </TouchableOpacity>
      ) : null}
      {onAdd ? (
        <TouchableOpacity
          onPress={onAdd}
          style={styles.addTarget}
          accessibilityRole="button"
          accessibilityLabel={addLabel}
        >
          <View style={styles.addCircle}>
            <Text style={styles.addText}>+</Text>
          </View>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    minHeight: 52,
    paddingLeft: spacing.xl - 4,
    paddingRight: spacing.md,
    paddingTop: spacing.sm,
    marginBottom: spacing.md,
  },
  title: {
    flexShrink: 1,
    fontSize: fontSize.largeTitle,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: colors.text,
  },
  caption: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    paddingRight: spacing.sm,
  },
  addTarget: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: {
    fontSize: 26,
    lineHeight: 28,
    color: colors.primary,
    fontWeight: '400',
  },
}));
