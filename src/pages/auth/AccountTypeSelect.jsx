import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Building2, ChevronRight, ShieldCheck, User } from 'lucide-react';

import TrabaGEWordmark from '../../components/splash/TrabaGEWordmark';
import { ROLE_HOME, ROLE_SETUP, ROLES } from '../../constants/roles';
import { useAuth } from '../../hooks/useAuth';
import { isPreviewActive } from '../../constants/preview';
import { supabase } from '../../config/supabase';

function AccountTypeDecorations() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Soft blue wavy shapes — top */}
      <svg
        className="absolute -left-24 -top-28 h-80 w-80 text-primary-100/70"
        viewBox="0 0 200 200"
        fill="none"
      >
        <path
          fill="currentColor"
          d="M44.6 -64.8C57.1 -55.7 66 -41.6 70.9 -26.3C75.8 -11 76.7 5.4 71.3 19.3C65.9 33.2 54.2 44.6 40.8 53.7C27.4 62.8 12.3 69.6 -3.6 74.6C-19.5 79.6 -36.2 82.8 -49.3 76.3C-62.4 69.8 -71.9 53.6 -76.6 37C-81.3 20.4 -81.2 3.4 -77 -12.1C-72.8 -27.6 -64.5 -41.6 -52.6 -50.9C-40.7 -60.2 -25.2 -64.8 -9.4 -68.3C6.4 -71.8 32.1 -73.9 44.6 -64.8Z"
          transform="translate(100 100)"
        />
      </svg>
      <svg
        className="absolute -right-20 -top-16 h-64 w-64 text-primary-50"
        viewBox="0 0 200 200"
        fill="none"
      >
        <path
          fill="currentColor"
          d="M38.5 -57.1C50.6 -49.1 61.3 -38.5 66.8 -25.4C72.3 -12.3 72.6 3.3 68.1 17.4C63.6 31.5 54.3 44.1 42.1 52.9C29.9 61.7 14.9 66.7 -0.7 67.7C-16.3 68.7 -32.7 65.7 -45.6 56.7C-58.5 47.7 -68 32.7 -71.4 16.5C-74.8 0.3 -72.1 -17.1 -64.2 -31.4C-56.3 -45.7 -43.2 -56.9 -29 -64C-14.8 -71.1 0.5 -74.1 13.8 -70.4C27.1 -66.7 26.4 -65.1 38.5 -57.1Z"
          transform="translate(100 100)"
        />
      </svg>
      {/* Faint dotted pattern — top right */}
      <svg className="absolute right-6 top-24 h-24 w-24 text-primary-200/60" viewBox="0 0 80 80">
        <defs>
          <pattern id="account-type-dots" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="2" fill="currentColor" />
          </pattern>
        </defs>
        <rect width="80" height="80" fill="url(#account-type-dots)" />
      </svg>

      {/* Bottom layered waves */}
      <svg
        className="absolute bottom-0 left-0 w-full text-primary-100/60"
        viewBox="0 0 500 200"
        preserveAspectRatio="none"
        fill="none"
      >
        <path
          fill="currentColor"
          d="M0 150C70 120 130 168 210 150C280 134 330 96 400 110C440 118 470 130 500 124V200H0V150Z"
          opacity="0.45"
        />
        <path
          fill="currentColor"
          d="M0 140C60 110 120 110 180 130C250 153 320 150 390 130C430 119 470 119 500 128V200H0V140Z"
          opacity="0.5"
        />
      </svg>
    </div>
  );
}

function AccountCard({ icon: Icon, title, description, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group flex w-full items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 text-left shadow-[0_10px_30px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-[0_16px_40px_rgba(37,99,235,0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600 transition group-hover:bg-primary-100">
        <Icon className="h-7 w-7" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-bold text-[#0F172A]">{title}</span>
        <span className="mt-1 block text-sm leading-relaxed text-[#64748B]">{description}</span>
      </span>
      <ChevronRight
        className="h-5 w-5 shrink-0 text-primary-500 transition group-hover:translate-x-0.5"
        aria-hidden
      />
    </button>
  );
}

export default function AccountTypeSelect() {
  const navigate = useNavigate();
  const { user, role, isPreviewMode, enterPreviewModeAsRole, refreshSetupStatus } = useAuth();
  const previewActive = isPreviewActive(isPreviewMode);

  useEffect(() => {
    if (previewActive || !role) return;
    if (role === ROLES.ADMIN) {
      navigate(ROLE_HOME[ROLES.ADMIN], { replace: true });
    }
  }, [previewActive, role, navigate]);

  const selectRole = async (selectedRole) => {
    if (previewActive) {
      enterPreviewModeAsRole(selectedRole);
      navigate(ROLE_HOME[selectedRole], { replace: true });
      return;
    }

    // New sign-up flow: an unauthenticated user picks their account type first,
    // then chooses how to create the account (email or Google). Carry the type forward.
    if (!user?.id) {
      navigate('/register-method', { state: { accountType: selectedRole } });
      return;
    }

    // Already authenticated (e.g. assigning a role after Google sign-in): persist and continue to setup.
    await supabase.from('user_roles').upsert({ user_id: user.id, role: selectedRole });
    await refreshSetupStatus();
    navigate(ROLE_SETUP[selectedRole], { replace: true });
  };

  return (
    <div className="relative min-h-dvh w-full overflow-hidden bg-gradient-to-b from-[#EFF6FF] via-white to-[#EFF6FF]">
      <AccountTypeDecorations />

      <div
        className="relative z-10 mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-10 sm:px-6"
        style={{
          paddingTop: 'max(2.5rem, env(safe-area-inset-top))',
          paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
        }}
      >
        <div className="flex flex-1 flex-col justify-center">
          {/* Wordmark */}
          <div className="flex justify-center">
            <TrabaGEWordmark className="h-10 w-auto" />
          </div>

          {/* Heading + subtitle */}
          <div className="mt-8 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">Elige el tipo de cuenta</h1>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-[#64748B]">
              {previewActive
                ? 'Elige un rol para explorar la app en modo vista previa.'
                : 'Selecciona la opción que mejor se adapte a tus necesidades.'}
            </p>
          </div>

          {previewActive ? (
            <p className="mt-6 rounded-xl bg-primary-50 px-4 py-3 text-center text-sm text-primary-800">
              Modo vista previa activo. Los datos no se guardarán en el servidor.
            </p>
          ) : null}

          {/* Account type cards */}
          <div className="mt-8 space-y-4">
            <AccountCard
              icon={User}
              title="Cuenta personal"
              description="Para buscar empleo, aplicar a ofertas y gestionar tu perfil."
              onClick={() => selectRole(ROLES.CANDIDATE)}
            />
            <AccountCard
              icon={Building2}
              title="Cuenta de organización"
              description="Para publicar ofertas, encontrar talento y gestionar tu equipo."
              onClick={() => selectRole(ROLES.COMPANY)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-10 flex flex-col items-center gap-2 text-center">
          <ShieldCheck className="h-6 w-6 text-primary-600" aria-hidden />
          <p className="text-sm font-bold text-[#0F172A]">Seguro y confiable</p>
          <p className="mx-auto max-w-xs text-xs leading-relaxed text-[#64748B]">
            Tu información está protegida y solo se usará para mejorar tu experiencia en TrabaGE.
          </p>
        </div>
      </div>
    </div>
  );
}
