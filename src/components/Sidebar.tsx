// =====================================================================
// Barra lateral (versión de escritorio)
// ---------------------------------------------------------------------
// Reemplaza a las pestañas de abajo cuando la pantalla es grande: nombre de la app, las
// secciones y, abajo, la cotización en uso y la cuenta.
// =====================================================================

import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { RATE_SOURCE_LABEL, useExchangeRate } from '../context/ExchangeRateContext';
import { makeStyles, useTheme } from '../context/ThemeContext';
import { fontSize, spacing } from '../theme';
import { formatMoney } from '../utils/format';

// Logo de Locatia (la L con la casita), el mismo del ícono de la app.
const BRAND_TILE = require('../../assets/brand-tile.png');

// ── Componente ────────────────────────────────────────────────────────

export default function Sidebar({ state, descriptors, navigation }: BottomTabBarProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { rate, source } = useExchangeRate();
  const { email, status } = useAuth();

  return (
    <View style={styles.sidebar} accessibilityRole="tablist">
      <View style={styles.brand}>
        <Image source={BRAND_TILE} style={styles.logo} accessibilityIgnoresInvertColors />
        <Text style={styles.brandText} accessibilityLabel="Locatia">locatia</Text>
      </View>

      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const focused = state.index === index;
        const color = focused ? colors.primary : colors.text;
        // Igual que las pestañas: tocar la sección activa vuelve a su lista principal.
        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        };
        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={[styles.item, focused && styles.itemActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
          >
            {options.tabBarIcon?.({ focused, color, size: 20 })}
            <Text style={[styles.itemText, focused && styles.itemTextActive]}>{options.title ?? route.name}</Text>
          </TouchableOpacity>
        );
      })}

      <View style={styles.spacer} />
      <Text style={styles.footer}>
        {rate ? `Dólar ${RATE_SOURCE_LABEL[source].toLowerCase()} ${formatMoney(rate, 'ARS')}` : 'Sin cotización'}
        {'\n'}
        {status === 'demo' ? 'Modo demo' : (email ?? '')}
      </Text>
    </View>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────

const useStyles = makeStyles((colors) => ({
  sidebar: {
    width: 232,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    gap: 2,
    backgroundColor: colors.tabBar,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xl,
  },
  logo: {
    width: 32,
    height: 32,
  },
  brandText: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.8,
    color: colors.text,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 8,
  },
  itemActive: {
    backgroundColor: colors.surface,
  },
  itemText: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.text,
  },
  itemTextActive: {
    fontWeight: '600',
    color: colors.primary,
  },
  spacer: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: 10,
    fontSize: fontSize.sm,
    lineHeight: 19,
    color: colors.textMuted,
  },
}));
