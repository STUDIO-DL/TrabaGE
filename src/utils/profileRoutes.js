export function getUserProfilePath(userId, userType = 'candidate') {
  if (!userId) return null;
  return userType === 'company' ? `/companies/${userId}` : `/profile/${userId}`;
}
