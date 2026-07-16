import { useState } from 'react';
import AppIcon from '../common/AppIcon';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import { Mail, ICON_SIZES } from '../../constants/icons';
import { SUPPORT_EMAIL } from '../../data/help-center';
import { useAuth } from '../../hooks/useAuth';
import { useNotificationContext } from '../../context/NotificationContext';
import { submitToFormspree } from '../../utils/formspree';

const initialForm = {
  name: '',
  email: '',
  subject: '',
  message: '',
};

export default function HelpContactCard() {
  const { user } = useAuth();
  const { showToast } = useNotificationContext();
  const [form, setForm] = useState({
    ...initialForm,
    email: user?.email ?? '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field) => (e) => {
    setForm((current) => ({ ...current, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const name = form.name.trim();
    const email = form.email.trim();
    const subject = form.subject.trim();
    const message = form.message.trim();

    if (!name || !email || !subject || !message) {
      setError('Completa todos los campos del formulario.');
      return;
    }

    setSubmitting(true);
    const { ok } = await submitToFormspree({
      form_type: 'help',
      name,
      email,
      _replyto: email,
      subject,
      message,
      page_url: window.location.href,
    });
    setSubmitting(false);

    if (!ok) {
      setError('No se pudo enviar tu mensaje. Inténtalo de nuevo.');
      showToast('No se pudo enviar tu mensaje. Inténtalo de nuevo.', 'error');
      return;
    }

    showToast('Mensaje enviado. Te responderemos lo antes posible.', 'success');
    setForm({ ...initialForm, email: user?.email ?? '' });
  };

  return (
    <Card padding="lg" elevation={2}>
      <div className="flex items-start gap-space-md">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-radius-md bg-app-primary-soft">
          <AppIcon icon={Mail} size={ICON_SIZES.default} className="text-primary-600" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-title text-app-text">¿Necesitas más ayuda?</h2>
          <p className="mt-space-sm text-body-small leading-relaxed text-app-muted">
            Si no encuentras la respuesta que buscas, escríbenos y te responderemos en un plazo
            máximo de 48 horas hábiles.
          </p>
          <p className="mt-space-sm text-body-small text-app-subtle">
            También puedes escribirnos a{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-primary-600 hover:text-primary-700">
              {SUPPORT_EMAIL}
            </a>
          </p>

          <form onSubmit={handleSubmit} className="mt-space-lg space-y-space-base">
            <Input
              label="Nombre completo"
              name="name"
              value={form.name}
              onChange={handleChange('name')}
              placeholder="Tu nombre"
              required
              disabled={submitting}
            />
            <Input
              label="Correo electrónico"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange('email')}
              placeholder="tu@correo.com"
              required
              disabled={submitting}
            />
            <Input
              label="Asunto"
              name="subject"
              value={form.subject}
              onChange={handleChange('subject')}
              placeholder="Ej. Problema con mi postulación"
              required
              disabled={submitting}
            />
            <Textarea
              label="Mensaje"
              id="help-message"
              name="message"
              rows={4}
              value={form.message}
              onChange={handleChange('message')}
              placeholder="Describe tu consulta con el mayor detalle posible..."
              required
              disabled={submitting}
            />

            {error && <p className="text-body-small text-error-600">{error}</p>}

            <Button type="submit" loading={submitting} fullWidth className="sm:w-auto">
              Enviar mensaje
            </Button>
          </form>
        </div>
      </div>
    </Card>
  );
}
