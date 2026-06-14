import PageContainer from '../../components/layout/PageContainer';
import {
  ProfileHeader,
  AboutSection,
  ExperienceSection,
  EducationSection,
  CertificationsSection,
  SkillsSection,
  LanguagesSection,
  DocumentsSection,
} from '../../components/profile/ProfileHeader';
import Spinner from '../../components/ui/Spinner';
import Button from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';

export default function Profile() {
  const { logout } = useAuth();
  const { profile, loading } = useProfile();

  return (
    <PageContainer title="Mi perfil">
      <div className="p-4">
        {loading ? (
          <Spinner fullscreen />
        ) : (
          <>
            <ProfileHeader profile={profile} isOwn />
            <AboutSection about={profile?.about} />
            <ExperienceSection items={profile?.experience} />
            <EducationSection items={profile?.education} />
            <CertificationsSection items={profile?.certifications} />
            <SkillsSection items={profile?.skills} />
            <LanguagesSection items={profile?.languages} />
            <DocumentsSection cvName={profile?.cv_name} coverLetterName={profile?.cover_letter_name} />
            <Button variant="danger" fullWidth onClick={logout}>
              Cerrar sesión
            </Button>
          </>
        )}
      </div>
    </PageContainer>
  );
}
