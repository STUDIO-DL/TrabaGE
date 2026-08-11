import { isSupabaseConfigured, supabase } from '../config/supabase';
import { reportError } from '../utils/logger';

function detectPlatform() {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent ?? '';
  if (/android/i.test(ua)) return 'android';
  if (/iphone|ipad/i.test(ua)) return 'ios';
  return 'web';
}

function detectBrowser() {
  if (typeof navigator === 'undefined') return null;
  const ua = navigator.userAgent ?? '';
  if (/edg\//i.test(ua)) return 'edge';
  if (/chrome/i.test(ua) && !/edg\//i.test(ua)) return 'chrome';
  if (/firefox/i.test(ua)) return 'firefox';
  if (/safari/i.test(ua) && !/chrome/i.test(ua)) return 'safari';
  return null;
}

export const pushSubscriptionsService = {
  upsert: async (subscription) => {
    if (!isSupabaseConfigured) {
      return { data: null, error: null };
    }

    const { data, error } = await supabase.rpc('upsert_web_push_subscription', {
      p_endpoint: subscription?.endpoint,
      p_p256dh: subscription?.keys?.p256dh,
      p_auth: subscription?.keys?.auth,
      p_platform: detectPlatform(),
      p_browser: detectBrowser(),
      p_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    });

    if (error) {
      reportError(error, { area: 'push_subscription_register' });
    }

    return { data, error };
  },

  deactivate: async (endpoint = null) => {
    if (!isSupabaseConfigured) {
      return { data: null, error: null };
    }

    const { data, error } = await supabase.rpc('deactivate_web_push_subscription', {
      p_endpoint: endpoint,
    });

    if (error) {
      reportError(error, { area: 'push_subscription_deactivate' });
    }

    return { data, error };
  },
};
