import { useCallback, useState } from 'react';
import {
  addSearchHistory,
  clearSearchHistory,
  getSearchHistory,
  removeSearchHistory,
} from '../utils/searchHistory';

export function useSearchHistory() {
  const [history, setHistory] = useState(() => getSearchHistory());

  const refresh = useCallback(() => {
    setHistory(getSearchHistory());
  }, []);

  const add = useCallback(
    (query) => {
      setHistory(addSearchHistory(query));
    },
    [],
  );

  const remove = useCallback(
    (query) => {
      setHistory(removeSearchHistory(query));
    },
    [],
  );

  const clear = useCallback(() => {
    setHistory(clearSearchHistory());
  }, []);

  return { history, add, remove, clear, refresh };
}
