import { useParams } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer';
import CandidateProfileLayout from '../../components/profile/CandidateProfileLayout';
import AboutSection from '../../components/profile/AboutSection';
import ExperienceSection from '../../components/profile/ExperienceSection';
import EducationSection from '../../components/profile/EducationSection';
import CertificationsSection from '../../components/profile/CertificationsSection';
import SkillsSection from '../../components/profile/SkillsSection';
import ServicesSection from '../../components/profile/ServicesSection';
import { ProfilePageSkeleton } from '../../components/common/Skeleton';
import { useProfile } from '../../hooks/useProfile';
import { generateProfileUrl } from '../../utils/generateShareUrl';
import { openCandidateContact } from '../../utils/contact';
import { useNotificationContext } from '../../context/NotificationContext';

export default function PublicProfile() {
  const { userId } = useParams();
  const { profile, loading } = useProfile(userId);
  const { showToast } = useNotificationContext();

  const handleContact = () => {
    const { ok, error } = openCandidateContact(profile);
    if (!ok) showToast(error, 'error');
  };

  if (loading) {
    return (
      <PageContainer topBar={false} bottomNav={false} className="max-w-none">
        <ProfilePageSkeleton />
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
        title="Perfil del candidato"
        profile={profile}
        shareUrl={generateProfileUrl(userId)}
        shareTitle={profile.full_name || 'Perfil en TrabaGE'}
        reportTargetId={userId}
        onContact={handleContact}
      >
        <AboutSection about={profile.about} />
        <EducationSection items={profile.education} />
        <CertificationsSection items={profile.certifications} />
        <SkillsSection items={profile.skills} />
        <ServicesSection items={profile.services} />
        <ExperienceSection items={profile.experience} />
      </CandidateProfileLayout>
    </PageContainer>
  );
}
