import { supabase } from '../config/supabase';
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
  upsert: async (subscriptionId) => {
    const { data, error } = await supabase.rpc('upsert_push_subscription', {
      p_onesignal_subscription_id: subscriptionId,
      p_platform: detectPlatform(),
      p_browser: detectBrowser(),
      p_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    });

    if (error) {
      reportError(error, { area: 'push_subscription_register' });
    }

    return { data, error };
  },

  deactivate: async (subscriptionId = null) => {
    const { data, error } = await supabase.rpc('deactivate_push_subscription', {
      p_onesignal_subscription_id: subscriptionId,
    });

    if (error) {
      reportError(error, { area: 'push_subscription_deactivate' });
    }

    return { data, error };
  },
};
