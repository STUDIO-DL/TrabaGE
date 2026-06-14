import { useParams } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer';
import CompanyHeader from '../../components/company/CompanyHeader';
import Spinner from '../../components/ui/Spinner';
import { companyService } from '../../services/company.service';
import { useEffect, useState } from 'react';

export default function CompanyPublicProfile() {
  const { companyId } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    companyService.getPublicProfile(companyId).then(({ data }) => {
      setProfile(data);
      setLoading(false);
    });
  }, [companyId]);

  return (
    <PageContainer title="Empresa" backButton bottomNav={false}>
      <div className="p-4">
        {loading ? <Spinner fullscreen /> : <CompanyHeader profile={profile} />}
      </div>
    </PageContainer>
  );
}
