import AdminEmployerList from '../../components/admin/AdminEmployerList';
import { ROLES } from '../../constants/roles';

export default function AdminCompanies() {
  return (
    <AdminEmployerList
      accountRole={ROLES.BUSINESS}
      title="Empresas"
      description="Cuentas Business registradas en la plataforma."
    />
  );
}
