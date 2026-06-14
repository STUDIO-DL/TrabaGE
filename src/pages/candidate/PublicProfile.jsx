import { useParams } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer';
import CandidateProfileLayout from '../../components/profile/CandidateProfileLayout';
import AboutSection from '../../components/profile/AboutSection';
import ExperienceSection from '../../components/profile/ExperienceSection';
import EducationSection from '../../components/profile/EducationSection';
import CertificationsSection from '../../components/profile/CertificationsSection';
import SkillsSection from '../../components/profile/SkillsSection';
import Spinner from '../../components/ui/Spinner';
import { useProfile } from '../../hooks/useProfile';
import { generateProfileUrl } from '../../utils/generateShareUrl';
import { openCandidateContact } from '../../utils/contact';
import { useNotificationContext } from '../../context/NotificationContext';

export default function PublicProfile() {
  const { userId } = useParams();
  const { profile, loading } = useProfile(userId);
  const { showToast } = useNotificationContext();

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(generateProfileUrl(userId));
      showToast('Enlace copiado', 'success');
    } catch {
      showToast('No se pudo copiar el enlace', 'error');
    }
  };

  const handleMessage = () => {
    const { ok, error } = openCandidateContact(profile);
    if (!ok) showToast(error, 'error');
  };

  if (loading) {
    return (
      <PageContainer topBar={false} bottomNav={false} className="max-w-none">
        <Spinner fullscreen />
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
        onShare={handleShare}
        onMessage={handleMessage}
      >
        <AboutSection about={profile.about} />
        <EducationSection items={profile.education} />
        <CertificationsSection items={profile.certifications} />
        <SkillsSection items={profile.skills} />
        <ExperienceSection items={profile.experience} />
      </CandidateProfileLayout>
    </PageContainer>
  );
}
