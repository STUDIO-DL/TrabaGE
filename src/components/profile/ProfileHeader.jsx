import Avatar from '../ui/Avatar';
import Button from '../ui/Button';

export function ProfileHeader({ profile, isOwn = false, onEdit }) {
  return (
    <div className="mb-6 text-center">
      <Avatar
        src={profile?.avatar_url}
        name={profile?.full_name}
        size="lg"
        fallback="/images/default-user-avatar.png"
        className="mx-auto"
      />
      <h2 className="mt-4 text-xl font-bold text-gray-900">{profile?.full_name}</h2>
      {profile?.headline && <p className="mt-1 text-sm text-gray-500">{profile.headline}</p>}
      {profile?.city && <p className="mt-1 text-sm text-gray-400">📍 {profile.city}</p>}
      {isOwn && onEdit && (
        <Button variant="secondary" className="mt-4" onClick={onEdit}>
          Editar perfil
        </Button>
      )}
    </div>
  );
}

export function AboutSection({ about }) {
  if (!about) return null;
  return (
    <section className="mb-6">
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">Sobre mí</h3>
      <p className="text-sm text-gray-700">{about}</p>
    </section>
  );
}

export function ExperienceSection({ items = [] }) {
  if (!items.length) return null;
  return (
    <section className="mb-6">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Experiencia</h3>
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id}>
            <p className="font-medium text-gray-900">{item.position}</p>
            <p className="text-sm text-gray-600">{item.company}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function EducationSection({ items = [] }) {
  if (!items.length) return null;
  return (
    <section className="mb-6">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Educación</h3>
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id}>
            <p className="font-medium text-gray-900">{item.institution}</p>
            <p className="text-sm text-gray-600">{item.program}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function CertificationsSection({ items = [] }) {
  if (!items.length) return null;
  return (
    <section className="mb-6">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Certificaciones</h3>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="text-sm text-gray-700">
            {item.name}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function SkillsSection({ items = [] }) {
  if (!items.length) return null;
  return (
    <section className="mb-6">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Habilidades</h3>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span key={item.id} className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">
            {item.name}
          </span>
        ))}
      </div>
    </section>
  );
}

export function LanguagesSection({ items = [] }) {
  if (!items.length) return null;
  return (
    <section className="mb-6">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Idiomas</h3>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="text-sm text-gray-700">
            {item.language} {item.level && `— ${item.level}`}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function DocumentsSection({ cvName, coverLetterName }) {
  if (!cvName && !coverLetterName) return null;
  return (
    <section className="mb-6">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Documentos</h3>
      <ul className="space-y-2 text-sm text-gray-700">
        {cvName && <li>CV: {cvName}</li>}
        {coverLetterName && <li>Carta de presentación: {coverLetterName}</li>}
      </ul>
    </section>
  );
}
