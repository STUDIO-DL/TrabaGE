import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ProfilePageShell from '../../components/profile/ProfilePageShell';
import ProfileActionBar from '../../components/profile/ProfileActionBar';
import CompanyProfileView from '../../components/company/profile/CompanyProfileView';
import Spinner from '../../components/ui/Spinner';
import PageContainer from '../../components/layout/PageContainer';
import { companyService } from '../../services/company.service';
import { jobsService } from '../../services/jobs.service';
import { getPreviewMediaUrls, getPreviewProfile, PREVIEW_USER } from '../../constants/preview';
import { ROLES } from '../../constants/roles';
import { useAuth } from '../../hooks/useAuth';
import { generateCompanyUrl } from '../../utils/generateShareUrl';
import { hasCompanyActionableContact, openCompanyContact } from '../../utils/contact';
import { useNotificationContext } from '../../context/NotificationContext';

export default function CompanyPublicProfile() {
  const { companyId } = useParams();
  const { isPreviewMode } = useAuth();
  const { showToast } = useNotificationContext();
  const [profile, setProfile] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isPreviewMode && companyId === PREVIEW_USER.id) {
      const media = getPreviewMediaUrls();
      setProfile({
        ...getPreviewProfile(ROLES.COMPANY),
        cover_url: media.cover_url,
        logo_url: media.logo_url,
      });
      setJobs([]);
      setLoading(false);
      return;
    }

    Promise.all([
      companyService.getPublicProfile(companyId),
      jobsService.getCompanyJobs(companyId),
    ]).then(([profileResult, jobsResult]) => {
      setProfile(profileResult.data);
      setJobs(jobsResult.data ?? []);
      setLoading(false);
    });
  }, [companyId, isPreviewMode]);

  const handleContact = () => {
    const { ok, error } = openCompanyContact(profile);
    if (!ok) showToast(error, 'error');
  };

  if (loading) {
    return (
      <PageContainer topBar={false} className="max-w-none">
        <Spinner fullscreen />
      </PageContainer>
    );
  }

  return (
    <PageContainer topBar={false} className="max-w-none">
      <ProfilePageShell
        title="Perfil de empresa"
        backButton
        compactBack
        shareUrl={generateCompanyUrl(companyId)}
        shareTitle={profile?.company_name || 'Empresa en TrabaGE'}
        reportTargetId={companyId}
        isOwn={false}
      >
        <ProfileActionBar
          onContact={handleContact}
          disabled={!hasCompanyActionableContact(profile)}
          label="Contactar"
        />
        <CompanyProfileView
          profile={profile}
          readOnly
          companyId={companyId}
          jobs={jobs}
        />
      </ProfilePageShell>
    </PageContainer>
  );
}
