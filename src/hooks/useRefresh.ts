// =====================================================================
// Deslizar para actualizar
// ---------------------------------------------------------------------
// Lo que pasa al tirar la lista hacia abajo en las pantallas principales.
// =====================================================================

import { useCallback, useState } from 'react';
import { useData } from '../context/DataContext';
import { useExchangeRate } from '../context/ExchangeRateContext';

// Deslizar hacia abajo para actualizar: vuelve a leer los datos de la cuenta y la cotización
// del dólar, y recalcula los vencimientos.
export function useRefresh() {
  const { refreshToday, pullFromServer } = useData();
  const { refreshQuotes } = useExchangeRate();
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    refreshToday();
    try {
      await Promise.all([pullFromServer(), refreshQuotes()]);
    } finally {
      setRefreshing(false);
    }
  }, [refreshToday, pullFromServer, refreshQuotes]);
  return { refreshing, onRefresh };
}
