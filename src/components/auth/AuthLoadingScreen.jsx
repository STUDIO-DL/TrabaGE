import Spinner from '../ui/Spinner';

/** Full-screen loader shown while auth state hydrates — prevents route flicker. */
export default function AuthLoadingScreen() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-white">
      <Spinner size="lg" />
    </div>
  );
}
