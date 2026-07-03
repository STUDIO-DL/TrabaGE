import { Link } from 'react-router-dom';
import { LEGAL_ROUTES } from '../../constants/legalRoutes';

export function LegalInlineLink({ to, children }) {
  return (
    <Link
      to={to}
      className="font-medium text-primary-600 underline decoration-primary-200 underline-offset-2 transition hover:text-primary-700 hover:decoration-primary-400"
    >
      {children}
    </Link>
  );
}

export function LegalFooterLinks({ className = '' }) {
  return (
    <nav
      className={`flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm ${className}`}
      aria-label="Enlaces legales"
    >
      <LegalInlineLink to={LEGAL_ROUTES.privacy}>Política de Privacidad</LegalInlineLink>
      <span className="text-slate-300" aria-hidden>
        ·
      </span>
      <LegalInlineLink to={LEGAL_ROUTES.terms}>Términos de Uso</LegalInlineLink>
    </nav>
  );
}

export function LegalAcceptanceText({ className = '' }) {
  return (
    <p className={`text-center text-xs leading-relaxed text-slate-500 ${className}`}>
      Al crear una cuenta aceptas nuestros{' '}
      <LegalInlineLink to={LEGAL_ROUTES.terms}>Términos de Uso</LegalInlineLink> y nuestra{' '}
      <LegalInlineLink to={LEGAL_ROUTES.privacy}>Política de Privacidad</LegalInlineLink>.
    </p>
  );
}
