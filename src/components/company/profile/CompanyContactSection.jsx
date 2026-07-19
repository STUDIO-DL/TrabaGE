import { useEffect, useMemo, useState } from 'react';
import AppIcon from '../../common/AppIcon';
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import {
  Headphones,
  Mail,
  Phone,
  Save,
  User,
  ICON_COLORS,
  ICON_SIZES,
} from '../../../constants/icons';
import { CONTACT_ROLE_SUGGESTIONS } from '../../../constants/companyServices';
import { hasCompanyActionableContact } from '../../../utils/contact';
import { hasCompanyContact, getCompanyContactInitials } from '../../../utils/companyProfile';
import CompanyProfileSectionCard from './CompanyProfileSectionCard';
import { PROFILE_SECTION_ICONS } from '../../../constants/icons';

function ContactChannel({ icon, label, value, href }) {
  const row = (
    <div className="flex min-h-touch items-center gap-space-md rounded-radius-md border border-app-border bg-app-surface px-space-base py-space-sm transition-colors duration-fast hover:bg-app-card">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-radius-md bg-app-surface ring-1 ring-app-border">
        <AppIcon icon={icon} size={ICON_SIZES.default} className={ICON_COLORS.default} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-caption text-app-subtle">{label}</p>
        <p className="mt-0.5 truncate text-body-small font-medium text-app-text">{value}</p>
      </div>
    </div>
  );

  if (href) {
    return (
      <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer">
        {row}
      </a>
    );
  }

  return row;
}

export default function CompanyContactSection({
  profile,
  readOnly = false,
  onSave,
  saving = false,
  embedded = false,
}) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [phone, setPhone] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setName(profile?.contact_name || '');
    setRole(profile?.contact_role || '');
    setEmail(profile?.contact_email || '');
    setWhatsapp(profile?.contact_whatsapp || '');
    setPhone(profile?.contact_phone || '');
    setDirty(false);
  }, [
    profile?.contact_name,
    profile?.contact_role,
    profile?.contact_email,
    profile?.contact_whatsapp,
    profile?.contact_phone,
  ]);

  const hasContact = hasCompanyContact(profile);
  const initials = useMemo(() => getCompanyContactInitials(profile), [profile]);

  if (readOnly && !hasCompanyActionableContact(profile)) return null;

  const markDirty = (setter) => (event) => {
    setter(event.target.value);
    setDirty(true);
  };

  const handleSave = async () => {
    const result = await onSave?.({
      contact_name: name.trim() || null,
      contact_role: role.trim() || null,
      contact_email: email.trim() || null,
      contact_whatsapp: whatsapp.trim() || null,
      contact_phone: phone.trim() || null,
    });
    if (!result?.error) setDirty(false);
  };

  const whatsappDigits = profile?.contact_whatsapp?.replace(/\D/g, '');

  const content = readOnly ? (
    <div className="space-y-space-md">
      <div className="flex items-start gap-space-md">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-radius-md bg-app-surface text-lg font-bold text-app-text ring-1 ring-app-border">
          {initials || <AppIcon icon={Headphones} size={ICON_SIZES.lg} className={ICON_COLORS.default} />}
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="truncate text-body-small font-semibold text-app-text">
            {profile.contact_name?.trim() || 'Contacto de la empresa'}
          </p>
          {profile.contact_role ? (
            <p className="mt-space-xs text-caption text-app-muted">{profile.contact_role}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-space-sm">
        {profile.contact_email ? (
          <ContactChannel
            icon={Mail}
            label="Correo"
            value={profile.contact_email}
            href={`mailto:${profile.contact_email}`}
          />
        ) : null}
        {profile.contact_whatsapp ? (
          <ContactChannel
            icon={Phone}
            label="WhatsApp"
            value={profile.contact_whatsapp}
            href={whatsappDigits ? `https://wa.me/${whatsappDigits}` : undefined}
          />
        ) : null}
        {profile.contact_phone ? (
          <ContactChannel
            icon={Phone}
            label="Teléfono"
            value={profile.contact_phone}
            href={`tel:${profile.contact_phone.replace(/\s/g, '')}`}
          />
        ) : null}
      </div>
    </div>
  ) : (
    <div className="space-y-space-md">
      {!hasContact ? (
        <p className="text-body-small text-app-muted">
          Añade un contacto de referencia. Los visitantes podrán pulsar &quot;Contactar&quot; en tu
          perfil para escribirte por WhatsApp, correo o teléfono.
        </p>
      ) : null}

      <div className="flex items-start gap-space-md">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-radius-md bg-app-surface text-sm font-bold text-app-text ring-1 ring-app-border">
          {getCompanyContactInitials({ contact_name: name }) || (
            <AppIcon icon={User} size={ICON_SIZES.default} className={ICON_COLORS.default} />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-space-md">
          <Input
            label="Nombre del contacto"
            placeholder="Ej. María Obiang"
            value={name}
            onChange={markDirty(setName)}
          />
          <div>
            <Input
              label="Cargo o área"
              placeholder="Ej. RR.HH., Representante comercial"
              value={role}
              onChange={markDirty(setRole)}
            />
            <div className="mt-space-sm flex flex-wrap gap-space-sm">
              {CONTACT_ROLE_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => {
                    setRole(suggestion);
                    setDirty(true);
                  }}
                  className={[
                    'rounded-radius-circular px-space-sm py-1 text-caption font-medium transition-colors duration-fast',
                    role === suggestion
                      ? 'bg-primary-600 text-white'
                      : 'bg-app-surface text-app-muted ring-1 ring-app-border hover:bg-app-card hover:text-app-text',
                  ].join(' ')}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
        <Input
          label="Correo"
          type="email"
          placeholder="rrhh@empresa.com"
          value={email}
          onChange={markDirty(setEmail)}
        />
        <Input
          label="WhatsApp (con código de país)"
          type="tel"
          placeholder="240XXXXXXXX"
          value={whatsapp}
          onChange={markDirty(setWhatsapp)}
        />
        <Input
          label="Teléfono fijo (opcional)"
          type="tel"
          placeholder="+240 XXX XXX"
          value={phone}
          onChange={markDirty(setPhone)}
          className="sm:col-span-2"
        />
      </div>

      {dirty ? (
        <Button type="button" fullWidth loading={saving} onClick={handleSave} className="gap-space-sm">
          <AppIcon icon={Save} size={ICON_SIZES.default} className="text-white" />
          Guardar contacto
        </Button>
      ) : null}
    </div>
  );

  if (embedded) return content;

  return (
    <CompanyProfileSectionCard title="Contacto" icon={PROFILE_SECTION_ICONS.contact} iconTone="contact">
      {content}
    </CompanyProfileSectionCard>
  );
}
