import { CheckCircle2 } from 'lucide-react';
import Button from '../ui/Button';

export default function ApplySuccessState({ onViewApplications }) {
  return (
    <div
      className="flex min-h-[60vh] flex-col items-center justify-center px-space-base py-space-xl text-center"
      role="status"
      aria-live="polite"
    >
      <CheckCircle2 className="card-enter h-16 w-16 text-success-600" aria-hidden />
      <h2 className="mt-space-lg text-heading-s font-bold text-app-text">Solicitud enviada</h2>
      <p className="mt-space-sm max-w-sm text-body-small leading-relaxed text-app-muted">
        La empresa ha recibido tu candidatura. Podrás seguir el estado desde:{' '}
        <span className="font-medium text-app-text">Perfil → Solicitudes</span>
      </p>
      <Button type="button" fullWidth className="mt-space-xl" onClick={onViewApplications}>
        Ver mis solicitudes
      </Button>
    </div>
  );
}
