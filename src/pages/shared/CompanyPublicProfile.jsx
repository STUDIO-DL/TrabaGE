import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import ProfilePageShell from '../../components/profile/ProfilePageShell';
import CompanyProfileView from '../../components/company/profile/CompanyProfileView';
import FetchErrorBanner from '../../components/common/FetchErrorBanner';
import { ProfilePageSkeleton } from '../../components/common/Skeleton';
import PageContainer from '../../components/layout/PageContainer';
import { companyService } from '../../services/company.service';
import { jobsService } from '../../services/jobs.service';
import { getPreviewMediaUrls, getPreviewProfile, PREVIEW_USER } from '../../constants/preview';
import { isEmployerRole, ROLES } from '../../constants/roles';
import { useAuth } from '../../hooks/useAuth';
import { generateCompanyUrl } from '../../utils/generateShareUrl';
import { BUSINESS_CONTACT_METHODS, hasCompanyActionableContact } from '../../utils/contact';
import useContactAction from '../../hooks/useContactAction';
import { useStartConversation } from '../../hooks/useStartConversation';
import { useNotificationContext } from '../../context/NotificationContext';
import { useFollow } from '../../hooks/useFollow';
import { FOLLOWS_TARGET } from '../../services/follows.service';
import { getSupabaseErrorMessage } from '../../utils/supabaseErrors';
import { getOrgLabels, isOrganizationProfile } from '../../utils/orgLabels';

export default function CompanyPublicProfile() {
  const { companyId } = useParams();
  const { isPreviewMode, user, role, isAuthenticated } = useAuth();
  const { showToast } = useNotificationContext();
  const { handleContact: runContact, contactPickerModal } = useContactAction({
    showToast,
    methodIds: BUSINESS_CONTACT_METHODS,
    pickerTitle: 'Contactar empresa',
  });
  const { startConversation, starting } = useStartConversation();
  const [profile, setProfile] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  const followTarget = useMemo(
    () =>
      isOrganizationProfile(profile) ? FOLLOWS_TARGET.ORGANIZATION : FOLLOWS_TARGET.BUSINESS,
    [profile],
  );
  const orgLabels = getOrgLabels(profile);

  const {
    isFollowing,
    followerCount,
    actionLoading: followLoading,
    toggleFollow,
    canFollow,
  } = useFollow({
    targetType: followTarget,
    targetId: companyId,
    enabled: Boolean(companyId) && !isPreviewMode && Boolean(profile),
  });

  const showFollowButton =
    !isPreviewMode && user?.id !== companyId && !isEmployerRole(role);

  useEffect(() => {
    if (isPreviewMode && companyId === PREVIEW_USER.id) {
      const media = getPreviewMediaUrls();
      setProfile({
        ...getPreviewProfile(ROLES.BUSINESS),
        cover_url: media.cover_url,
        logo_path: media.logo_path,
      });
      setJobs([]);
      setLoading(false);
      setNotFound(false);
      return;
    }

    setLoading(true);
    setNotFound(false);
    setFetchError(null);

    Promise.all([
      companyService.getPublicProfile(companyId),
      jobsService.getCompanyJobs(companyId),
    ]).then(([profileResult, jobsResult]) => {
      if (profileResult.error) {
        setProfile(null);
        setJobs([]);
        setNotFound(false);
        setFetchError(profileResult.error.message ?? 'No se pudo cargar el perfil.');
      } else if (!profileResult.data) {
        setProfile(null);
        setJobs([]);
        setNotFound(true);
        setFetchError(null);
      } else {
        setProfile(profileResult.data);
        setJobs((jobsResult.data ?? []).filter((job) => job.status === 'active'));
        setNotFound(false);
        setFetchError(null);
      }
      setLoading(false);
    });
  }, [companyId, isPreviewMode]);

  const retryFetch = () => {
    if (!companyId || isPreviewMode) return;
    setLoading(true);
    setNotFound(false);
    setFetchError(null);

    Promise.all([
      companyService.getPublicProfile(companyId),
      jobsService.getCompanyJobs(companyId),
    ]).then(([profileResult, jobsResult]) => {
      if (profileResult.error) {
        setProfile(null);
        setJobs([]);
        setFetchError(profileResult.error.message ?? 'No se pudo cargar el perfil.');
      } else if (!profileResult.data) {
        setProfile(null);
        setJobs([]);
        setNotFound(true);
      } else {
        setProfile(profileResult.data);
        setJobs((jobsResult.data ?? []).filter((job) => job.status === 'active'));
      }
      setLoading(false);
    });
  };

  const onContact = () => {
    runContact(profile);
  };

  const handleToggleFollow = async () => {
    const result = await toggleFollow();
    if (result?.needsAuth) {
      showToast(orgLabels.followPrompt, 'info');
      return;
    }
    if (result?.error) {
      showToast(getSupabaseErrorMessage(result.error, 'No se pudo actualizar el seguimiento'), 'error');
    }
  };

  if (loading) {
    return (
      <PageContainer topBar={false} bottomNav={false} className="max-w-none">
        <ProfilePageSkeleton />
      </PageContainer>
    );
  }

  if (fetchError) {
    return (
      <PageContainer topBar={false} bottomNav={false} className="max-w-none">
        <div className="p-space-base">
          <FetchErrorBanner
            message="No se pudo cargar el perfil. Inténtalo de nuevo."
            onRetry={retryFetch}
          />
        </div>
      </PageContainer>
    );
  }

  if (notFound || !profile) {
    return (
      <PageContainer topBar={false} bottomNav={false} className="max-w-none">
        <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-12 text-center">
          <p className="text-lg font-semibold text-app-text">{orgLabels.notFound}</p>
          <p className="mt-2 max-w-sm text-sm text-app-muted">
            Es posible que el enlace no sea correcto o que el perfil ya no esté disponible.
          </p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer topBar={false} bottomNav={false} className="max-w-none">
      <ProfilePageShell
        hideHeader
        backButton={false}
        shareUrl={generateCompanyUrl(companyId)}
        shareTitle={profile?.company_name || orgLabels.defaultName}
        reportTargetId={companyId}
        isOwn={false}
      >
        <CompanyProfileView
          profile={profile}
          readOnly
          showBackButton
          companyId={companyId}
          jobs={jobs}
          showFollowButton={showFollowButton || !isAuthenticated}
          isFollowing={isFollowing}
          followLoading={followLoading}
          canFollow={canFollow || !isAuthenticated}
          onToggleFollow={handleToggleFollow}
          onContact={onContact}
          onMessage={user?.id !== companyId ? () => startConversation(companyId) : undefined}
          messageLoading={starting}
          contactDisabled={!hasCompanyActionableContact(profile)}
          shareUrl={generateCompanyUrl(companyId)}
          shareTitle={profile?.company_name || orgLabels.defaultName}
          reportTargetId={companyId}
          followerCount={followerCount}
        />
      </ProfilePageShell>
      {contactPickerModal}
    </PageContainer>
  );
}
