import MobileScreenLayout from '../../components/layout/MobileScreenLayout';
import SearchInput from '../../components/common/SearchInput';

export default function CompanyHome() {
  return (
    <MobileScreenLayout header={<h1 className="text-2xl font-bold">Encuentra al mejor talento</h1>}>
      <div className="p-4">
        <SearchInput placeholder="Buscar por nombre, profesión o habilidad..." />
        {/* Aquí irían otros componentes del dashboard de la empresa */}
        <p className="mt-8 text-center text-slate-500">Contenido del dashboard de la empresa...</p>
      </div>
    </MobileScreenLayout>
  );
}