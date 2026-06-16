import AppIcon from '../common/AppIcon';
import { Phone, ICON_SIZES } from '../../constants/icons';

export default function ProfileActionBar({
  isOwn = false,
  onContact,
  disabled,
  label = 'Contactar',
}) {
  if (isOwn) return null;

  return (
    <div className="border-b border-gray-200 bg-white px-4 py-4">
      <div className="mx-auto max-w-5xl">
        <button
          type="button"
          onClick={onContact}
          disabled={disabled}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-gray-300 sm:w-auto"
        >
          <AppIcon icon={Phone} size={ICON_SIZES.default} className="text-white" />
          {label}
        </button>
        {disabled && (
          <p className="mt-2 text-center text-xs text-gray-500 sm:text-left">
            Esta empresa aún no ha configurado un medio de contacto.
          </p>
        )}
      </div>
    </div>
  );
}
