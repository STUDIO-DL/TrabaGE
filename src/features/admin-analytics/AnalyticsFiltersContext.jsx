import { createContext, useContext, useMemo, useState } from 'react';
import { CITIES } from '../../constants/cities';
import { SECTORS } from '../../constants/sectors';
import {
  ACCOUNT_ROLE_OPTIONS,
  JOB_TYPE_OPTIONS,
  WORK_MODE_OPTIONS,
  resolveAnalyticsPeriod,
} from './analyticsPeriods';

const AnalyticsFiltersContext = createContext(null);

export function AnalyticsFiltersProvider({ children }) {
  const [periodId, setPeriodId] = useState('30d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [city, setCity] = useState('');
  const [sector, setSector] = useState('');
  const [accountRole, setAccountRole] = useState('');
  const [jobType, setJobType] = useState('');
  const [workMode, setWorkMode] = useState('');

  const range = useMemo(
    () => resolveAnalyticsPeriod(periodId, customFrom, customTo),
    [periodId, customFrom, customTo],
  );

  const value = useMemo(
    () => ({
      periodId,
      setPeriodId,
      customFrom,
      setCustomFrom,
      customTo,
      setCustomTo,
      city,
      setCity,
      sector,
      setSector,
      accountRole,
      setAccountRole,
      jobType,
      setJobType,
      workMode,
      setWorkMode,
      range,
      cities: CITIES,
      sectors: SECTORS,
      accountRoleOptions: ACCOUNT_ROLE_OPTIONS,
      jobTypeOptions: JOB_TYPE_OPTIONS,
      workModeOptions: WORK_MODE_OPTIONS,
      rpcFilters: {
        from: range.from,
        to: range.to,
        city: city || null,
        sector: sector || null,
        accountRole: accountRole || null,
        jobType: jobType || null,
        workMode: workMode || null,
      },
    }),
    [
      periodId,
      customFrom,
      customTo,
      city,
      sector,
      accountRole,
      jobType,
      workMode,
      range,
    ],
  );

  return (
    <AnalyticsFiltersContext.Provider value={value}>{children}</AnalyticsFiltersContext.Provider>
  );
}

export function useAnalyticsFilters() {
  const ctx = useContext(AnalyticsFiltersContext);
  if (!ctx) throw new Error('useAnalyticsFilters must be used within AnalyticsFiltersProvider');
  return ctx;
}
