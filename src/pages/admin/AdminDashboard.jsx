import { useEffect, useState } from 'react';
import PageContainer from '../../components/layout/PageContainer';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import { useAuth } from '../../hooks/useAuth';
import { adminService } from '../../services/admin.service';

export default function AdminDashboard() {
  const { logout } = useAuth();
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getPendingVerifications().then(({ data }) => {
      setVerifications(data ?? []);
      setLoading(false);
    });
  }, []);

  const handleReview = async (id, status) => {
    await adminService.reviewVerification(id, status, '');
    const { data } = await adminService.getPendingVerifications();
    setVerifications(data ?? []);
  };

  return (
    <PageContainer title="Admin" bottomNav={false}>
      <div className="space-y-4 p-4">
        {loading ? (
          <Spinner fullscreen />
        ) : verifications.length === 0 ? (
          <p className="text-sm text-gray-500">No hay verificaciones pendientes.</p>
        ) : (
          verifications.map((item) => (
            <Card key={item.id}>
              <p className="font-semibold">{item.company_profiles?.company_name}</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={() => handleReview(item.id, 'verified')}>
                  Aprobar
                </Button>
                <Button size="sm" variant="danger" onClick={() => handleReview(item.id, 'rejected')}>
                  Rechazar
                </Button>
              </div>
            </Card>
          ))
        )}
        <Button variant="danger" fullWidth onClick={logout}>
          Cerrar sesión
        </Button>
      </div>
    </PageContainer>
  );
}
