import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FormPageLayout from '../../components/layout/FormPageLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Spinner from '../../components/ui/Spinner';
import { ROLE_PROFILE, ROLES } from '../../constants/roles';
import { useAuth } from '../../hooks/useAuth';
import { profileService } from '../../services/profile.service';
import { readIdentityFromUser } from '../../utils/displayIdentity';
import { extractGoogleProfile } from '../../utils/googleProfile';
import { getCandidateBootstrapMissing } from '../../utils/profileRequirements';
import { getSupabaseErrorMessage } from '../../utils/supabaseErrors';

/**
 * Setup assistant for personal accounts — only shown when bootstrap identity
 * (full_name) is missing, e.g. a Google sign-up without a display name.
 * Headline, sector, and location are collected in Edit Intro instead.
 */
export default function CandidateSetup() {
  const navigate = useNavigate();
  const { user, refreshSetupStatus } = useAuth();
  const [form, setForm] = useState({ full_name: '' });
  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.id) return undefined;
    let mounted = true;

    const google = extractGoogleProfile(user);
    const identity = readIdentityFromUser(user);

    profileService.getCandidateProfile(user.id).then(({ data, error: profileError }) => {
      if (!mounted) return;

      if (profileError) {
        setError(getSupabaseErrorMessage(profileError));
        setInitializing(false);
        return;
      }

      if (getCandidateBootstrapMissing(data).length === 0) {
        navigate(ROLE_PROFILE[ROLES.PERSONAL], { replace: true });
        return;
      }

      setForm({
        full_name: data?.full_name || identity.full_name || google.full_name || '',
      });
      setInitializing(false);
    });

    return () => {
      mounted = false;
    };
  }, [user, navigate]);

  const missingFields = useMemo(
    () => getCandidateBootstrapMissing(form),
    [form],
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmed = {
      full_name: form.full_name.trim(),
    };

    if (getCandidateBootstrapMissing(trimmed).length > 0) {
      setError('Completa los campos obligatorios para continuar.');
      return;
    }

    setLoading(true);

    const { error: saveError } = await profileService.upsertCandidateProfile({
      user_id: user.id,
      ...trimmed,
    });

    if (saveError) {
      setError(getSupabaseErrorMessage(saveError));
      setLoading(false);
      return;
    }

    await refreshSetupStatus();
    navigate(ROLE_PROFILE[ROLES.PERSONAL], { replace: true });
  };

  if (initializing) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <FormPageLayout
      title="Completa tu perfil"
      footer={
        <>
          {error ? <p className="mb-space-sm text-body-small text-error-600">{error}</p> : null}
          <Button type="submit" form="candidate-setup-form" fullWidth loading={loading} size="lg">
            Continuar
          </Button>
        </>
      }
    >
      <form id="candidate-setup-form" onSubmit={handleSubmit} className="space-y-space-base p-space-base">
        {!missingFields.includes('full_name') && form.full_name ? (
          <input type="hidden" name="full_name" value={form.full_name} />
        ) : (
          <Input
            label="Nombre completo"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            required
          />
        )}
      </form>
    </FormPageLayout>
  );
}
