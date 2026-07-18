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
  ICON_SIZES,
} from '../../../constants/icons';
import { CONTACT_ROLE_SUGGESTIONS } from '../../../constants/companyServices';
import { hasCompanyActionableContact } from '../../../utils/contact';
import { hasCompanyContact, getCompanyContactInitials } from '../../../utils/companyProfile';

function ContactChannel({ icon, label, value, href }) {
  const content = (
    <div className="flex items-center gap-3 rounded-xl border border-primary-100 bg-white px-4 py-3 transition hover:border-primary-200 hover:bg-primary-50/40">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50">
        <AppIcon icon={icon} size={ICON_SIZES.default} className="text-primary-600" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-primary-600/70">{label}</p>
        <p className="mt-0.5 truncate text-sm font-medium text-gray-900">{value}</p>
      </div>
    </div>
  );

  if (href) {
    return (
      <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer">
        {content}
      </a>
    );
  }

  return content;
}

export default function CompanyContactSection({
  profile,
  readOnly = false,
  onSave,
  saving = false,
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
    if (!result?.error) {
      setDirty(false);
    }
  };

  const whatsappDigits = profile?.contact_whatsapp?.replace(/\D/g, '');

  return (
    <section className="px-space-base py-space-base">
      <div className="mb-space-base flex items-center gap-space-sm">
        <span className="flex h-8 w-8 items-center justify-center rounded-radius-md bg-primary-50">
          <AppIcon icon={Headphones} size={ICON_SIZES.default} className="text-primary-600" />
        </span>
        <div>
          <h3 className="text-body font-semibold text-app-text">Contacto</h3>
          <p className="text-caption text-app-muted">Persona de referencia</p>
        </div>
      </div>

      {readOnly && (
        <div className="overflow-hidden rounded-2xl border border-primary-100 bg-gradient-to-br from-primary-50/70 via-white to-white shadow-sm ring-1 ring-primary-50">
          <div className="flex items-start gap-4 p-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-600 to-primary-700 text-lg font-bold text-white shadow-md">
              {initials || (
                <AppIcon icon={Headphones} size={ICON_SIZES.lg} className="text-white" />
              )}
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="truncate text-base font-semibold text-gray-900">
                {profile.contact_name?.trim() || 'Contacto de la empresa'}
              </p>
              {profile.contact_role && (
                <span className="mt-1.5 inline-flex items-center rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-semibold text-primary-800">
                  {profile.contact_role}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2 border-t border-primary-100/80 bg-white/60 p-4">
            {profile.contact_email && (
              <ContactChannel
                icon={Mail}
                label="Correo"
                value={profile.contact_email}
                href={`mailto:${profile.contact_email}`}
              />
            )}
            {profile.contact_whatsapp && (
              <ContactChannel
                icon={Phone}
                label="WhatsApp"
                value={profile.contact_whatsapp}
                href={whatsappDigits ? `https://wa.me/${whatsappDigits}` : undefined}
              />
            )}
            {profile.contact_phone && (
              <ContactChannel
                icon={Phone}
                label="Teléfono"
                value={profile.contact_phone}
                href={`tel:${profile.contact_phone.replace(/\s/g, '')}`}
              />
            )}
          </div>
        </div>
      )}

      {!readOnly && (
        <div className="space-y-4">
          {!hasContact && (
            <p className="text-sm text-gray-500">
              Añade un contacto de referencia. Los visitantes podrán pulsar &quot;Contactar&quot; en tu
              perfil para escribirte por WhatsApp, correo o teléfono.
            </p>
          )}

          <div className="rounded-2xl border border-primary-100 bg-gradient-to-b from-primary-50/40 to-white p-4">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-sm font-bold text-white">
                {getCompanyContactInitials({ contact_name: name }) || (
                  <AppIcon icon={User} size={ICON_SIZES.default} className="text-white" />
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-3">
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
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {CONTACT_ROLE_SUGGESTIONS.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => {
                          setRole(suggestion);
                          setDirty(true);
                        }}
                        className={[
                          'rounded-full px-2.5 py-1 text-xs font-medium transition',
                          role === suggestion
                            ? 'bg-primary-600 text-white'
                            : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-primary-50 hover:text-primary-800 hover:ring-primary-200',
                        ].join(' ')}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
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

            {dirty && (
              <Button
                type="button"
                fullWidth
                loading={saving}
                onClick={handleSave}
                className="mt-4 gap-2"
              >
                <AppIcon icon={Save} size={ICON_SIZES.default} className="text-white" />
                Guardar contacto
              </Button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
