// =====================================================================
// Texto resaltado
// =====================================================================

import React from 'react';
import { Text, TextProps } from 'react-native';
import { Range } from '../utils/search';
import { makeStyles } from '../context/ThemeContext';

// ── Componente ────────────────────────────────────────────────────────

// Texto con las partes que coinciden con la búsqueda resaltadas.
export default function HighlightText({
  text,
  ranges,
  ...props
}: TextProps & { text: string; ranges: Range[] }) {
  const styles = useStyles();
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

// ── Estilos ───────────────────────────────────────────────────────────

const useStyles = makeStyles((colors) => ({
  mark: {
    backgroundColor: colors.highlight,
    color: colors.text,
    fontWeight: '800',
  },
}));
