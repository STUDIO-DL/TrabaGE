import { useCallback, useEffect, useState } from 'react';
import { companyDashboardService } from './companyDashboard.service';
import { getPreviewCompanyDashboard } from './dashboardPreview';
import { toUserFacingError, ERROR_ACTION } from '../../utils/userFacingError';

export function useCompanyDashboardSummary({ userId, role, isPreviewMode, profile }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    if (isPreviewMode) {
      setData(getPreviewCompanyDashboard(profile));
      setError(null);
      setLoading(false);
      return;
    }

    if (!userId) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const result = await companyDashboardService.getSummary({ userId, role });
    if (result.error) {
      setData(null);
      const mapped = toUserFacingError(result.error, {
        action: ERROR_ACTION.load,
        log: true,
        context: { area: 'company_dashboard' },
      });
      setError(mapped.message || 'No hemos podido cargar esta información.');
    } else {
      setData(result.data);
    }
    setLoading(false);
  }, [userId, role, isPreviewMode, profile]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, loading, error, reload };
}
