// =====================================================================
// Pantalla de "algo falló"
// ---------------------------------------------------------------------
// Si una pantalla se rompe, en vez de quedar en blanco muestra un aviso con "Volver a intentar"
// y anota el error (ver errorReporting).
// =====================================================================

import { Component, ReactNode } from 'react';
import { Text, View } from 'react-native';
import { reportError } from '../lib/errorReporting';
import Button from './Button';

export default class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    reportError(error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 }}>
        <Text style={{ fontSize: 20, fontWeight: '700', textAlign: 'center' }}>Algo falló</Text>
        <Text style={{ fontSize: 15, textAlign: 'center', color: '#6C6C70' }}>
          Ya nos llegó el aviso. Tus datos están guardados.
        </Text>
        <Button label="Volver a intentar" onPress={() => this.setState({ failed: false })} />
      </View>
    );
  }
}
