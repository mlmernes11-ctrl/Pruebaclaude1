import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { makeStyles, useTheme } from '../context/ThemeContext';
import { fontSize, spacing } from '../theme';
import { highlightRanges } from '../utils/search';
import HighlightText from './HighlightText';
import StatusDot, { DotTone } from './StatusDot';

export type ValueTone = 'default' | 'muted' | 'danger' | 'primary' | 'success' | 'warning';

// One row of a grouped list. With a subtitle: name and amount on top, details below (two lines).
// Without: label on the left and a grey value on the right (settings style).
function ListRow({
  title,
  subtitle,
  value,
  valueTone = 'default',
  dot,
  icon,
  onPress,
  chevron,
  destructive,
  isFirst,
  inset,
  highlight,
  detail,
}: {
  title: string;
  subtitle?: string;
  // Search words: matches in the title, subtitle, value and detail are marked.
  highlight?: string[];
  // Third line, e.g. a note that matched the search.
  detail?: string;
  value?: React.ReactNode;
  valueTone?: ValueTone;
  dot?: DotTone;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  chevron?: boolean;
  destructive?: boolean;
  // Set by ListSection (or by a list for its first item): hides the separator above.
  isFirst?: boolean;
  // Separator inset when rows in a FlatList have a leading dot but this one does not.
  inset?: number;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const showChevron = chevron ?? (Boolean(onPress) && !destructive);
  const toneColor = {
    default: colors.text,
    muted: colors.textMuted,
    danger: colors.danger,
    primary: colors.primary,
    success: colors.success,
    warning: colors.warning,
  }[valueTone];
  const strongValue = valueTone === 'default' || valueTone === 'danger';
  const separatorInset = inset ?? spacing.lg + (dot ? 22 : icon ? 40 : 0);

  const words = highlight?.length ? highlight : undefined;
  // Amounts also match typed digits: "350000" marks "$ 350.000".
  const mark = (text: string, amount = false) =>
    words ? <HighlightText text={text} ranges={highlightRanges(text, words, false, amount)} /> : text;

  const valueNode =
    value === undefined || value === null ? null : typeof value === 'string' ? (
      <Text
        style={[subtitle ? (strongValue ? styles.valueStrong : styles.valueSoft) : styles.valueSetting, { color: toneColor }]}
        numberOfLines={1}
      >
        {mark(value, true)}
      </Text>
    ) : (
      value
    );

  const content = (
    <>
      {!isFirst ? <View style={[styles.separator, { left: separatorInset }]} /> : null}
      {dot ? <StatusDot tone={dot} /> : null}
      {icon ? <Ionicons name={icon} size={22} color={destructive ? colors.danger : colors.primary} /> : null}
      {subtitle ? (
        <View style={styles.body}>
          <View style={styles.topLine}>
            <Text style={styles.titleStrong} numberOfLines={1}>
              {mark(title)}
            </Text>
            {valueNode}
          </View>
          {/* While searching the subtitle may wrap, so a match near its end stays visible. */}
          <Text style={styles.subtitle} numberOfLines={words ? 2 : 1}>
            {mark(subtitle)}
          </Text>
          {detail ? (
            <Text style={styles.subtitle} numberOfLines={2}>
              {mark(detail)}
            </Text>
          ) : null}
        </View>
      ) : (
        <>
          <Text
            style={[styles.title, destructive && styles.destructive, destructive && !icon && styles.centered]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {valueNode}
        </>
      )}
      {showChevron ? <Ionicons name="chevron-forward" size={18} color={colors.chevron} /> : null}
    </>
  );

  const rowStyle = [styles.row, subtitle ? styles.rowTall : null];
  if (!onPress) return <View style={rowStyle}>{content}</View>;
  return (
    <TouchableOpacity style={rowStyle} onPress={onPress} activeOpacity={0.6} accessibilityRole="button">
      {content}
    </TouchableOpacity>
  );
}

ListRow.isListRow = true;
export default ListRow;

const useStyles = makeStyles((colors) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    backgroundColor: colors.surface,
  },
  rowTall: {
    minHeight: 62,
  },
  separator: {
    position: 'absolute',
    top: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.border,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  topLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  titleStrong: {
    flexShrink: 1,
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  // Labels keep their full width; a long value on the right is the part that gets "…".
  title: {
    flexGrow: 1,
    flexShrink: 0,
    fontSize: fontSize.lg,
    color: colors.text,
  },
  destructive: {
    color: colors.danger,
  },
  centered: {
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  valueStrong: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  valueSoft: {
    fontSize: fontSize.md,
    fontVariant: ['tabular-nums'],
  },
  valueSetting: {
    flexShrink: 1,
    fontSize: fontSize.lg,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
}));
