import React from 'react';
import { StyleProp, Text, View, ViewStyle } from 'react-native';
import { makeStyles } from '../context/ThemeContext';
import { fontSize, radius, spacing } from '../theme';

// iOS "inset grouped" list: optional caption above, rows on one rounded surface, note below.
export default function ListSection({
  header,
  footer,
  children,
  style,
}: {
  header?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useStyles();
  const rows = React.Children.toArray(children).filter(React.isValidElement);
  return (
    <View style={[styles.section, style]}>
      {header ? <Text style={styles.header}>{header}</Text> : null}
      <View style={styles.group}>
        {rows.map((row, index) =>
          (row.type as { isListRow?: boolean }).isListRow
            ? React.cloneElement(row as React.ReactElement<{ isFirst?: boolean }>, { isFirst: index === 0 })
            : row,
        )}
      </View>
      {typeof footer === 'string' ? <Text style={styles.footer}>{footer}</Text> : footer}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  section: {
    marginBottom: spacing.xl,
  },
  header: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginHorizontal: spacing.lg,
    marginBottom: 6,
  },
  group: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  footer: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginHorizontal: spacing.lg,
    marginTop: 6,
    lineHeight: 18,
  },
}));
