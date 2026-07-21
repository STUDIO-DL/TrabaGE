/**
 * Fail-loud helpers for Supabase writes. PostgREST returns { data: null, error: null }
 * when RLS blocks an UPDATE/INSERT or zero rows match — never treat that as success.
 */

const WRITE_NO_ROW_MESSAGE =
  'No se guardó el cambio. Comprueba tu sesión e inténtalo de nuevo.';

export function assertWriteResult({ data, error } = {}, { allowNullData = false } = {}) {
  if (error) {
    return { data: null, error };
  }

  if (!allowNullData && (data === null || data === undefined)) {
    return {
      data: null,
      error: { message: WRITE_NO_ROW_MESSAGE, code: 'WRITE_NO_ROW' },
    };
  }

  return { data: data ?? null, error: null };
}

export async function executeWrite(promise, options) {
  const result = await promise;
  return assertWriteResult(result, options);
}

export async function executeDelete(promise) {
  const { data, error } = await promise;
  if (error) return { data: null, error };

  // When the caller uses .select(), an empty array means RLS blocked or no row matched.
  if (Array.isArray(data) && data.length === 0) {
    return {
      data: null,
      error: { message: WRITE_NO_ROW_MESSAGE, code: 'WRITE_NO_ROW' },
    };
  }

  return { data: true, error: null };
}
