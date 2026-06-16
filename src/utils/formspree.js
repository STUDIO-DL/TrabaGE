import { FORMSPREE_ENDPOINT } from '../constants/formspree';

export async function submitToFormspree(data) {
  try {
    const response = await fetch(FORMSPREE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const message = body.error || `Error al enviar el formulario (${response.status})`;
      return { ok: false, error: new Error(message) };
    }

    return { ok: true, error: null };
  } catch (error) {
    return { ok: false, error };
  }
}
