import { useEffect, useRef, useState } from 'react';
import UserAvatar from '../common/UserAvatar';
import { IconBriefcase, IconLocation } from './ProfileIcons';

const EMPTY = {
  name: 'Nombre no especificado',
  headline: 'Titular no especificado',
  city: 'Ubicación no especificada',
  experience: 'Experiencia no especificada',
  availability: 'Disponible para trabajar',
  openToWork: 'Abierto a empleo',
};

function IconCamera({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
    </svg>
  );
}

function IconPencil({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
    </svg>
  );
}

function EditableHeroField({
  value,
  placeholder,
  isOwn,
  onSave,
  saving,
  as = 'h2',
  inputClassName = '',
  displayClassName = '',
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');
  const inputRef = useRef(null);

  useEffect(() => {
    if (!editing) setDraft(value || '');
  }, [value, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const save = async () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    await onSave?.(trimmed);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(value || '');
    setEditing(false);
  };

  const Tag = as;

  if (!isOwn) {
    return (
      <Tag className={displayClassName}>{value || placeholder}</Tag>
    );
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-2">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
            if (e.key === 'Escape') cancel();
          }}
          className={`w-full rounded-lg border-0 bg-white/15 px-3 py-2 text-white placeholder-blue-200 outline-none ring-2 ring-white/30 ${inputClassName}`}
          placeholder={placeholder}
        />
        <div className="flex gap-2">
          <button
            type="button"
            disabled={saving || !draft.trim()}
            onClick={save}
            className="rounded-lg bg-white px-3 py-1 text-xs font-semibold text-primary-700 disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
          <button
            type="button"
            onClick={cancel}
            className="rounded-lg px-3 py-1 text-xs font-medium text-blue-100 hover:text-white"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-start gap-2">
      <Tag className={`min-w-0 flex-1 ${displayClassName}`}>{value || placeholder}</Tag>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="mt-1 shrink-0 rounded-lg p-1.5 text-blue-100 opacity-80 hover:bg-white/10 hover:opacity-100"
        aria-label="Editar"
      >
        <IconPencil />
      </button>
    </div>
  );
}

export default function ProfileHero({
  profile,
  isOwn = false,
  onAvatarChange,
  avatarLoading = false,
  onSaveField,
  savingField,
}) {
  const inputRef = useRef(null);
  const experienceCount = profile?.experience?.length ?? 0;

  const experienceLabel =
    experienceCount > 0
      ? `${experienceCount} ${experienceCount === 1 ? 'experiencia' : 'experiencias'} registrada${experienceCount === 1 ? '' : 's'}`
      : EMPTY.experience;

  return (
    <section className="profile-hero relative overflow-hidden px-4 pb-8 pt-6 text-white">
      <div className="relative z-10 mx-auto flex max-w-5xl flex-col gap-5 sm:flex-row sm:items-end">
        <div className="relative shrink-0">
          <UserAvatar
            src={profile?.avatar_url}
            alt={profile?.full_name}
            size="xl"
            className="border-white/30 ring-4 ring-white/20"
          />
          {isOwn && onAvatarChange && (
            <>
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onAvatarChange(file);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                disabled={avatarLoading}
                onClick={() => inputRef.current?.click()}
                aria-label="Cambiar foto de perfil"
                className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full bg-white text-primary-700 shadow disabled:opacity-60"
              >
                {avatarLoading ? (
                  <span className="text-xs font-medium">…</span>
                ) : (
                  <IconCamera />
                )}
              </button>
            </>
          )}
        </div>

        <div className="min-w-0 flex-1 pb-1">
          <EditableHeroField
            as="h2"
            value={profile?.full_name}
            placeholder={EMPTY.name}
            isOwn={isOwn}
            saving={savingField === 'full_name'}
            onSave={(v) => onSaveField?.('full_name', v)}
            displayClassName="text-2xl font-bold leading-tight sm:text-3xl"
            inputClassName="text-xl sm:text-2xl font-bold"
          />

          <div className="mt-1">
            <EditableHeroField
              as="p"
              value={profile?.headline}
              placeholder={EMPTY.headline}
              isOwn={isOwn}
              saving={savingField === 'headline'}
              onSave={(v) => onSaveField?.('headline', v)}
              displayClassName="text-base text-blue-100 sm:text-lg"
              inputClassName="text-base"
            />
          </div>

          <p className="mt-2 flex items-center gap-1.5 text-sm text-blue-100">
            <IconLocation />
            {profile?.city || EMPTY.city}
          </p>

          <ul className="mt-4 flex flex-wrap gap-2">
            <li className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs backdrop-blur-sm">
              <IconBriefcase className="h-4 w-4 shrink-0" />
              {experienceLabel}
            </li>
            <li className="rounded-full bg-white/10 px-3 py-1.5 text-xs backdrop-blur-sm">
              {EMPTY.availability}
            </li>
            <li className="rounded-full bg-white/10 px-3 py-1.5 text-xs backdrop-blur-sm">
              {EMPTY.openToWork}
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
