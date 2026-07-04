import { useState } from 'react';
import AppIcon from '../common/AppIcon';
import Button from '../ui/Button';
import Input from '../ui/Input';
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
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50">
          <AppIcon icon={Mail} size={ICON_SIZES.default} className="text-primary-600" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-slate-900">¿Necesitas más ayuda?</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Si no encuentras la respuesta que buscas, escríbenos y te responderemos en un plazo
            máximo de 48 horas hábiles.
          </p>
          <p className="mt-2 text-sm text-slate-500">
            También puedes escribirnos a{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-primary-600 hover:text-primary-700">
              {SUPPORT_EMAIL}
            </a>
          </p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
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
            <div>
              <label htmlFor="help-message" className="mb-1.5 block text-sm font-medium text-gray-700">
                Mensaje
              </label>
              <textarea
                id="help-message"
                name="message"
                rows={4}
                value={form.message}
                onChange={handleChange('message')}
                placeholder="Describe tu consulta con el mayor detalle posible..."
                required
                disabled={submitting}
                className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:opacity-60"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button type="submit" loading={submitting} fullWidth className="sm:w-auto">
              Enviar mensaje
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}
