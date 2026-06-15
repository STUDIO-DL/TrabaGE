import { useEffect, useState } from 'react';
import ProfileSectionCard from './ProfileSectionCard';
import Input from '../ui/Input';
import Button from '../ui/Button';
import AppIcon from '../common/AppIcon';
import { Save, ICON_SIZES } from '../../constants/icons';
import { PROFILE_SECTION_ICONS } from './ProfileIcons';

export default function ContactSection({
  contactEmail,
  contactWhatsapp,
  isOwn,
  onSave,
  loading = false,
}) {
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setEmail(contactEmail || '');
    setWhatsapp(contactWhatsapp || '');
    setDirty(false);
  }, [contactEmail, contactWhatsapp]);

  if (!isOwn && !contactEmail && !contactWhatsapp) return null;

  const handleSave = async () => {
    await onSave?.({
      contact_email: email.trim() || null,
      contact_whatsapp: whatsapp.trim() || null,
    });
    setDirty(false);
  };

  return (
    <ProfileSectionCard
      icon={PROFILE_SECTION_ICONS.contact}
      iconTone="contact"
      title="Datos de contacto"
      isEmpty={!isOwn && !contactEmail && !contactWhatsapp}
      emptyText="Contacto no disponible."
    >
      {isOwn ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Estos datos se usan cuando alguien pulsa &quot;Enviar mensaje&quot; en tu perfil público.
          </p>
          <Input
            label="Correo de contacto (Gmail u otro)"
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setDirty(true);
            }}
          />
          <Input
            label="WhatsApp (con código de país)"
            type="tel"
            placeholder="240XXXXXXXX"
            value={whatsapp}
            onChange={(e) => {
              setWhatsapp(e.target.value);
              setDirty(true);
            }}
          />
          {dirty && (
            <Button type="button" fullWidth loading={loading} onClick={handleSave} className="gap-2">
              <AppIcon icon={Save} size={ICON_SIZES.default} className="text-white" />
              Guardar contacto
            </Button>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-500">Usa el botón &quot;Enviar mensaje&quot; para contactar.</p>
      )}
    </ProfileSectionCard>
  );
}
