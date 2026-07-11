import AppIcon from '../common/AppIcon';
import { Phone, ICON_SIZES } from '../../constants/icons';
import Button from '../ui/Button';

export default function ProfileActionBar({
  isOwn = false,
  onContact,
  disabled,
  label = 'Contactar',
}) {
  if (isOwn) return null;

  return (
    <div className="border-b border-app-border bg-app-card px-space-base py-space-base">
      <div className="mx-auto max-w-5xl">
        <Button
          type="button"
          onClick={onContact}
          disabled={disabled}
          className="sm:w-auto"
          fullWidth
        >
          <AppIcon icon={Phone} size={ICON_SIZES.md} className="text-white" />
          {label}
        </Button>
        {disabled && (
          <p className="mt-space-sm text-center text-caption text-app-muted sm:text-left">
            Esta empresa aún no ha configurado un medio de contacto.
          </p>
        )}
      </div>
    </div>
  );
}
