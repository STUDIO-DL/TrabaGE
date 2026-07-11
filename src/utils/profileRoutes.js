import { isEmployerAuthor, isPersonalAuthor } from '../constants/authorTypes';

export function getUserProfilePath(userId, userType = 'personal') {
  if (!userId) return null;
  if (isEmployerAuthor(userType) || userType === 'organization' || userType === 'institution') {
    return `/companies/${userId}`;
  }
  if (isPersonalAuthor(userType) || userType === 'personal' || userType === 'candidate') {
    return `/profile/${userId}`;
  }
  return `/profile/${userId}`;
}
