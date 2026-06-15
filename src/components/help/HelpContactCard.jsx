import AppIcon from '../common/AppIcon';
import { Mail, ICON_SIZES } from '../../constants/icons';
import { SUPPORT_EMAIL } from '../../data/help-center';

export default function HelpContactCard() {
  const mailto = `mailto:${SUPPORT_EMAIL}`;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50">
          <AppIcon icon={Mail} size={ICON_SIZES.default} className="text-primary-600" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-slate-900">¿Necesitas más ayuda?</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Si no encuentras la respuesta que buscas, puedes contactar con nuestro equipo.
          </p>
          <a
            href={mailto}
            className="mt-3 inline-block text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            {SUPPORT_EMAIL}
          </a>
          <a
            href={mailto}
            className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700 sm:w-auto"
          >
            Contactar Soporte
          </a>
        </div>
      </div>
    </section>
  );
}
