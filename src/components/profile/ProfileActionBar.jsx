import { IconMail } from './ProfileIcons';

export default function ProfileActionBar({ isOwn = false, profile, onMessage, disabled }) {
  if (isOwn) return null;

  return (
    <div className="border-b border-gray-200 bg-white px-4 py-4">
      <div className="mx-auto max-w-5xl">
        <button
          type="button"
          onClick={onMessage}
          disabled={disabled}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          <IconMail className="h-4 w-4" />
          Enviar mensaje
        </button>
      </div>
    </div>
  );
}
