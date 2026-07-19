import { AppShellSkeleton } from '../common/Skeleton';

/** Full-screen skeleton shown while auth state hydrates — prevents route flicker. */
export default function AuthLoadingScreen() {
  return <AppShellSkeleton />;
}
