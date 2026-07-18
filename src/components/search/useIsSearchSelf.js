import { useAuth } from '../../hooks/useAuth';

/** True when a search hit is the signed-in user's own profile. */
export function useIsSearchSelf(item) {
  const { user } = useAuth();

  if (item?.isSelf) return true;
  if (!user?.id || !item?.id) return false;

  const type = item.type;
  if (
    type !== 'personal' &&
    type !== 'business' &&
    type !== 'organization' &&
    type !== 'candidate' &&
    type !== 'company' &&
    type !== 'institution'
  ) {
    return false;
  }

  return String(user.id).toLowerCase() === String(item.id).toLowerCase();
}
