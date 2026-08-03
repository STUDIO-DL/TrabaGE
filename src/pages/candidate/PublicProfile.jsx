import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer';
import CandidateProfileLayout from '../../components/profile/CandidateProfileLayout';
import AboutSection from '../../components/profile/AboutSection';
import ExperienceSection from '../../components/profile/ExperienceSection';
import EducationSection from '../../components/profile/EducationSection';
import CertificationsSection from '../../components/profile/CertificationsSection';
import SkillsSection from '../../components/profile/SkillsSection';
import LanguagesReadOnlySection from '../../components/profile/LanguagesReadOnlySection';
import ServicesSection from '../../components/profile/ServicesSection';
import ProjectsSection from '../../components/profile/ProjectsSection';
import PortfolioLinksSection from '../../components/profile/PortfolioLinksSection';
import PersonalSocialSection from '../../components/profile/PersonalSocialSection';
import ProfilePostsSection from '../../components/profile/ProfilePostsSection';
import FetchErrorBanner from '../../components/common/FetchErrorBanner';
import { ProfilePageSkeleton } from '../../components/common/Skeleton';
import { useProfile } from '../../hooks/useProfile';
import { useAuth } from '../../hooks/useAuth';
import { generateProfileUrl } from '../../utils/generateShareUrl';
import { useStartConversation } from '../../hooks/useStartConversation';
import { getDisplayName } from '../../utils/displayIdentity';
import { ROLES } from '../../constants/roles';
import { professionalPanelService } from '../../features/professional-panel/data/professionalPanel.service';

export default function PublicProfile() {
  const { userId } = useParams();
  const { user, isPreviewMode } = useAuth();
  const { profile, loading, error, refetch } = useProfile(userId);
  const { startConversation, starting } = useStartConversation();

  useEffect(() => {
    if (!userId || !profile || isPreviewMode) return;
    if (user?.id && user.id === userId) return;
    void professionalPanelService.trackProfileView(userId, { source: 'public_profile' });
  }, [isPreviewMode, profile, user?.id, userId]);

  const displayName = getDisplayName(profile, ROLES.PERSONAL, {
    fallbackAuthorName: profile?.full_name,
    context: 'public_profile',
  });

  if (loading) {
    return (
      <PageContainer topBar={false} bottomNav={false} className="max-w-none">
        <ProfilePageSkeleton />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer topBar={false} bottomNav={false} className="max-w-none">
        <div className="p-space-base">
          <FetchErrorBanner
            message="No se pudo cargar el perfil. Inténtalo de nuevo."
            onRetry={() => refetch()}
          />
        </div>
      </PageContainer>
    );
  }

  if (!profile) {
    return (
      <PageContainer topBar={false} bottomNav={false} className="max-w-none">
        <p className="p-space-xl text-center text-body-small text-app-muted">Perfil no encontrado.</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer topBar={false} bottomNav={false} className="max-w-none !pb-0">
      <CandidateProfileLayout
        backButton
        profile={profile}
        shareUrl={generateProfileUrl(userId, profile?.username)}
        shareTitle={displayName || 'Perfil en TrabaGE'}
        reportTargetId={userId}
        onMessage={user?.id !== userId ? () => startConversation(userId) : undefined}
        messageLoading={starting}
      >
        <AboutSection about={profile.about} />
        <ExperienceSection items={profile.experience} />
        <EducationSection items={profile.education} />
        <SkillsSection items={profile.skills} />
        <ProjectsSection items={profile.projects} />
        <ProfilePostsSection
          authorId={userId}
          postsPath={`/profile/${userId}/posts`}
          backTo={`/profile/${userId}`}
          enabled={Boolean(userId)}
        />
        <CertificationsSection items={profile.certifications} />
        <LanguagesReadOnlySection items={profile.languages} />
        <ServicesSection items={profile.services} />
        <PortfolioLinksSection items={profile.candidate_links} />
        <PersonalSocialSection socialLinks={profile.social_links} />
      </CandidateProfileLayout>
    </PageContainer>
  );
}
