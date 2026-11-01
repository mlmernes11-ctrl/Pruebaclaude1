import { useCallback, useState } from 'react';
import { useData } from '../context/DataContext';
import { useExchangeRate } from '../context/ExchangeRateContext';

// Pull to refresh: updates the dollar quote and re-evaluates due dates for today.
export function useRefresh() {
  const { refreshToday } = useData();
  const { refreshQuotes } = useExchangeRate();
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    refreshToday();
    try {
      await refreshQuotes();
    } finally {
      setRefreshing(false);
    }
  }, [refreshToday, refreshQuotes]);
  return { refreshing, onRefresh };
}
