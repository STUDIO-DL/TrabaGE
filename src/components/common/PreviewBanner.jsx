import { useAuth } from '../../hooks/useAuth';
import { ROLES } from '../../constants/roles';

const ROLE_LABELS = {
  [ROLES.COMPANY]: 'empresa',
  [ROLES.CANDIDATE]: 'candidato',
};

export default function PreviewBanner() {
  const { isPreviewMode, role } = useAuth();

  if (!isPreviewMode) return null;

  const roleLabel = ROLE_LABELS[role] ?? 'cuenta';

  return (
    <div className="border-b border-primary-100 bg-primary-50 px-4 py-2 text-center text-xs text-primary-800">
      Modo vista previa ({roleLabel}) · Los cambios no se guardan
    </div>
  );
}
