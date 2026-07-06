// Helpers for reading the identity data Supabase stores for OAuth (Google)
// users. Google profile info lives in `user.user_metadata` (full_name/name,
// email, avatar_url/picture); the provider is exposed via `app_metadata`.

export function extractGoogleProfile(user) {
  const meta = user?.user_metadata ?? {};
  const fullName = String(meta.full_name || meta.name || '').trim();
  const email = String(meta.email || user?.email || '').trim();
  const avatarUrl = String(meta.avatar_url || meta.picture || '').trim();

  return {
    full_name: fullName || null,
    email: email || null,
    avatar_url: avatarUrl || null,
  };
}

export function isGoogleUser(user) {
  const provider = user?.app_metadata?.provider;
  const providers = user?.app_metadata?.providers;
  return provider === 'google' || (Array.isArray(providers) && providers.includes('google'));
}
