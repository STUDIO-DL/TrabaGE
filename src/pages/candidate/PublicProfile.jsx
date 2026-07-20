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
import FetchErrorBanner from '../../components/common/FetchErrorBanner';
import { ProfilePageSkeleton } from '../../components/common/Skeleton';
import { useProfile } from '../../hooks/useProfile';
import { useAuth } from '../../hooks/useAuth';
import { generateProfileUrl } from '../../utils/generateShareUrl';
import useContactAction from '../../hooks/useContactAction';
import { useStartConversation } from '../../hooks/useStartConversation';
import { useNotificationContext } from '../../context/NotificationContext';
import { getDisplayName } from '../../utils/displayIdentity';
import { ROLES } from '../../constants/roles';

export default function PublicProfile() {
  const { userId } = useParams();
  const { user } = useAuth();
  const { profile, loading, error, refetch } = useProfile(userId);
  const { showToast } = useNotificationContext();
  const { handleContact, contactPickerModal } = useContactAction({ showToast });
  const { startConversation, starting } = useStartConversation();

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
        <p className="p-8 text-center text-sm text-gray-500">Perfil no encontrado.</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer topBar={false} bottomNav={false} className="max-w-none !pb-0">
      <CandidateProfileLayout
        backButton
        profile={profile}
        shareUrl={generateProfileUrl(userId)}
        shareTitle={displayName || 'Perfil en TrabaGE'}
        reportTargetId={userId}
        onContact={() => handleContact(profile)}
        onMessage={user?.id && user.id !== userId ? () => startConversation(userId) : undefined}
        messageLoading={starting}
      >
        <AboutSection about={profile.about} />
        <PersonalSocialSection socialLinks={profile.social_links} />
        <ExperienceSection items={profile.experience} />
        <EducationSection items={profile.education} />
        <CertificationsSection items={profile.certifications} />
        <SkillsSection items={profile.skills} />
        <LanguagesReadOnlySection items={profile.languages} />
        <PortfolioLinksSection items={profile.candidate_links} />
        <ServicesSection items={profile.services} />
        <ProjectsSection items={profile.projects} />
      </CandidateProfileLayout>
      {contactPickerModal}
    </PageContainer>
  );
}
