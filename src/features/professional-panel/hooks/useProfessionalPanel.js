import { useCallback, useEffect, useState } from 'react';
import { professionalPanelService } from '../data/professionalPanel.service';

export function useProfessionalPanel({ periodId = '30d', enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState(null);

  const reload = useCallback(() => {
    if (!enabled) {
      setData(null);
      setLoading(false);
      setError(null);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    professionalPanelService.getPanel({ periodId }).then(({ data: next, error: fetchError }) => {
      if (cancelled) return;
      if (fetchError) {
        setData(null);
        setError(fetchError);
      } else {
        setData(next);
        setError(null);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, periodId]);

  useEffect(() => {
    const cancel = reload();
    return () => {
      if (typeof cancel === 'function') cancel();
    };
  }, [reload]);

  return { data, loading, error, reload };
}
