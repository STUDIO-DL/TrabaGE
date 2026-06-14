import { useParams } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer';
import {
  ProfileHeader,
  AboutSection,
  ExperienceSection,
  EducationSection,
  CertificationsSection,
  SkillsSection,
  LanguagesSection,
} from '../../components/profile/ProfileHeader';
import Spinner from '../../components/ui/Spinner';
import { useProfile } from '../../hooks/useProfile';

export default function PublicProfile() {
  const { userId } = useParams();
  const { profile, loading } = useProfile(userId);

  return (
    <PageContainer title="Perfil público" backButton bottomNav={false}>
      <div className="p-4">
        {loading ? (
          <Spinner fullscreen />
        ) : (
          <>
            <ProfileHeader profile={profile} />
            <AboutSection about={profile?.about} />
            <ExperienceSection items={profile?.experience} />
            <EducationSection items={profile?.education} />
            <CertificationsSection items={profile?.certifications} />
            <SkillsSection items={profile?.skills} />
            <LanguagesSection items={profile?.languages} />
          </>
        )}
      </div>
    </PageContainer>
  );
}
