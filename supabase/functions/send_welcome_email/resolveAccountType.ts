import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import {
  FALLBACK_ACCOUNT_TYPE,
  normalizeWelcomeAccountType,
  type WelcomeAccountType,
  WELCOME_ACCOUNT_TYPES,
} from './constants.ts';

export interface ResolvedWelcomeAccount {
  accountType: WelcomeAccountType;
  source: 'outbox' | 'rpc' | 'user_roles' | 'metadata' | 'fallback';
  resolutionError?: string;
}

function isWelcomeAccountType(value: string | null | undefined): value is WelcomeAccountType {
  return Boolean(value && WELCOME_ACCOUNT_TYPES.includes(value as WelcomeAccountType));
}

async function resolveViaRpc(
  admin: SupabaseClient,
  userId: string,
): Promise<WelcomeAccountType | null> {
  const { data, error } = await admin.rpc('resolve_welcome_account_type', {
    p_user_id: userId,
  });

  if (error) {
    console.error('[send_welcome_email] resolve_welcome_account_type RPC error:', error.message);
    return null;
  }

  return isWelcomeAccountType(data) ? data : null;
}

async function resolveViaUserRoles(
  admin: SupabaseClient,
  userId: string,
): Promise<WelcomeAccountType | null> {
  const { data: roleRow, error: roleError } = await admin
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();

  if (roleError) {
    console.error('[send_welcome_email] user_roles lookup error:', roleError.message);
    return null;
  }

  let companyType: string | null = null;
  const rawRole = roleRow?.role ?? null;

  if (rawRole === 'company') {
    const { data: companyRow } = await admin
      .from('company_profiles')
      .select('company_type')
      .eq('user_id', userId)
      .maybeSingle();
    companyType = companyRow?.company_type ?? null;
  }

  return normalizeWelcomeAccountType(rawRole, { companyType });
}

async function resolveViaMetadata(
  admin: SupabaseClient,
  userId: string,
): Promise<WelcomeAccountType | null> {
  const { data: userData, error } = await admin.auth.admin.getUserById(userId);
  if (error || !userData.user) {
    console.error('[send_welcome_email] auth metadata lookup error:', error?.message ?? 'user missing');
    return null;
  }

  const metadata = userData.user.user_metadata ?? {};
  const metaRole = typeof metadata.role === 'string' ? metadata.role : null;
  const metaKind = typeof metadata.account_kind === 'string' ? metadata.account_kind : null;

  return (
    normalizeWelcomeAccountType(metaRole) ??
    normalizeWelcomeAccountType(metaKind)
  );
}

export async function resolveWelcomeAccountType(
  admin: SupabaseClient,
  userId: string,
  outboxAccountType?: string | null,
): Promise<ResolvedWelcomeAccount> {
  if (isWelcomeAccountType(outboxAccountType)) {
    return { accountType: outboxAccountType, source: 'outbox' };
  }

  const rpcType = await resolveViaRpc(admin, userId);
  if (rpcType) {
    return { accountType: rpcType, source: 'rpc' };
  }

  const roleType = await resolveViaUserRoles(admin, userId);
  if (roleType) {
    return { accountType: roleType, source: 'user_roles' };
  }

  const metadataType = await resolveViaMetadata(admin, userId);
  if (metadataType) {
    return { accountType: metadataType, source: 'metadata' };
  }

  console.error('[send_welcome_email] account type undeterminable for user:', userId);
  return {
    accountType: FALLBACK_ACCOUNT_TYPE,
    source: 'fallback',
    resolutionError: 'account_type_undeterminable',
  };
}
