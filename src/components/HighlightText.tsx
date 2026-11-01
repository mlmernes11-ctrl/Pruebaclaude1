import React from 'react';
import { StyleSheet, Text, TextProps } from 'react-native';
import { colors } from '../theme';
import { Range } from '../utils/search';

// Text with the matched parts marked; nested Text keeps it a single wrapping line.
export default function HighlightText({
  text,
  ranges,
  ...props
}: TextProps & { text: string; ranges: Range[] }) {
  if (!ranges.length) return <Text {...props}>{text}</Text>;
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  ranges.forEach(([start, end], index) => {
    if (start > cursor) parts.push(text.slice(cursor, start));
    parts.push(
      <Text key={index} style={styles.mark}>
        {text.slice(start, end)}
      </Text>,
    );
    cursor = end;
  });
  if (cursor < text.length) parts.push(text.slice(cursor));
  return <Text {...props}>{parts}</Text>;
}

const styles = StyleSheet.create({
  mark: {
    backgroundColor: colors.highlight,
    color: colors.text,
    fontWeight: '800',
  },
});
