import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import ProfilePageShell from '../../components/profile/ProfilePageShell';
import CompanyProfileView from '../../components/company/profile/CompanyProfileView';
import { ProfilePageSkeleton } from '../../components/common/Skeleton';
import PageContainer from '../../components/layout/PageContainer';
import { companyService } from '../../services/company.service';
import { jobsService } from '../../services/jobs.service';
import { getPreviewMediaUrls, getPreviewProfile, PREVIEW_USER } from '../../constants/preview';
import { isEmployerRole, ROLES } from '../../constants/roles';
import { useAuth } from '../../hooks/useAuth';
import { generateCompanyUrl } from '../../utils/generateShareUrl';
import { hasCompanyActionableContact, openCompanyContact } from '../../utils/contact';
import { useNotificationContext } from '../../context/NotificationContext';
import { useFollow } from '../../hooks/useFollow';
import { FOLLOWS_TARGET } from '../../services/follows.service';
import { getSupabaseErrorMessage } from '../../utils/supabaseErrors';
import { getOrgLabels, isOrganizationProfile } from '../../utils/orgLabels';

export default function CompanyPublicProfile() {
  const { companyId } = useParams();
  const { isPreviewMode, user, role, isAuthenticated } = useAuth();
  const { showToast } = useNotificationContext();
  const [profile, setProfile] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

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

    Promise.all([
      companyService.getPublicProfile(companyId),
      jobsService.getCompanyJobs(companyId),
    ]).then(([profileResult, jobsResult]) => {
      if (!profileResult.data) {
        setProfile(null);
        setJobs([]);
        setNotFound(true);
      } else {
        setProfile(profileResult.data);
        setJobs(jobsResult.data ?? []);
        setNotFound(false);
      }
      setLoading(false);
    });
  }, [companyId, isPreviewMode]);

  const handleContact = () => {
    const { ok, error } = openCompanyContact(profile);
    if (!ok) showToast(error, 'error');
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
      <PageContainer topBar={false} className="max-w-none">
        <ProfilePageSkeleton />
      </PageContainer>
    );
  }

  if (notFound || !profile) {
    return (
      <PageContainer topBar={false} className="max-w-none">
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
    <PageContainer topBar={false} className="max-w-none">
      <ProfilePageShell
        backButton
        shareUrl={generateCompanyUrl(companyId)}
        shareTitle={profile?.company_name || orgLabels.defaultName}
        reportTargetId={companyId}
        isOwn={false}
      >
        <CompanyProfileView
          profile={profile}
          readOnly
          companyId={companyId}
          jobs={jobs}
          showFollowButton={showFollowButton || !isAuthenticated}
          isFollowing={isFollowing}
          followLoading={followLoading}
          canFollow={canFollow || !isAuthenticated}
          onToggleFollow={handleToggleFollow}
          onContact={handleContact}
          contactDisabled={!hasCompanyActionableContact(profile)}
          shareUrl={generateCompanyUrl(companyId)}
          shareTitle={profile?.company_name || orgLabels.defaultName}
          reportTargetId={companyId}
          followerCount={followerCount}
        />
      </ProfilePageShell>
    </PageContainer>
  );
}
