import AdminEmployerList from '../../components/admin/AdminEmployerList';
import { ROLES } from '../../constants/roles';

export default function AdminOrganizations() {
  return (
    <AdminEmployerList
      accountRole={ROLES.ORGANIZATION}
      title="Organizaciones"
      description="Instituciones y organizaciones registradas en la plataforma."
    />
  );
}
