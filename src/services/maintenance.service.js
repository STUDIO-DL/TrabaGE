import { isSupabaseConfigured, supabase } from '../config/supabase';
import { reportError } from '../utils/logger';

const DEFAULT_MESSAGE =
  'Estamos realizando tareas de mantenimiento para mejorar TrabaGE.\n\nVolveremos muy pronto.\n\nGracias por tu paciencia.';

function normalizeStatus(row) {
  if (!row) {
    return {
      enabled: false,
      message: DEFAULT_MESSAGE,
      start_at: null,
      end_at: null,
      is_active: false,
      updated_at: null,
    };
  }

  return {
    enabled: Boolean(row.enabled),
    message: (row.message && String(row.message).trim()) || DEFAULT_MESSAGE,
    start_at: row.start_at ?? null,
    end_at: row.end_at ?? null,
    is_active: Boolean(row.is_active),
    updated_at: row.updated_at ?? null,
  };
}

export const maintenanceService = {
  DEFAULT_MESSAGE,

  getStatus: async () => {
    if (!isSupabaseConfigured) {
      return { data: normalizeStatus(null), error: null };
    }

    const { data, error } = await supabase.rpc('get_maintenance_status');
    if (error) {
      reportError(error, { area: 'maintenance_get_status' });
      return { data: normalizeStatus(null), error };
    }
    const row = Array.isArray(data) ? data[0] : data;
    return { data: normalizeStatus(row), error: null };
  },

  /**
   * Admin-only update. Pass clearStart/clearEnd to null out schedule fields.
   */
  updateSettings: async ({
    enabled,
    message,
    startAt = undefined,
    endAt = undefined,
    clearStart = false,
    clearEnd = false,
  }) => {
    const { data, error } = await supabase.rpc('admin_update_maintenance_settings', {
      p_enabled: enabled,
      p_message: message ?? null,
      p_start_at: clearStart ? null : startAt ?? null,
      p_end_at: clearEnd ? null : endAt ?? null,
      p_clear_start: clearStart,
      p_clear_end: clearEnd,
    });

    if (error) {
      reportError(error, { area: 'maintenance_admin_update' });
      return { data: null, error };
    }

    return {
      data: normalizeStatus({
        ...data,
        is_active:
          Boolean(data?.enabled) &&
          (!data?.start_at || new Date(data.start_at).getTime() <= Date.now()) &&
          (!data?.end_at || new Date(data.end_at).getTime() > Date.now()),
      }),
      error: null,
    };
  },

  subscribe: (onChange) => {
    if (!isSupabaseConfigured) {
      return () => {};
    }

    const channel = supabase
      .channel('maintenance_settings_live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'maintenance_settings' },
        () => {
          void maintenanceService.getStatus().then(({ data }) => onChange?.(data));
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  },
};
