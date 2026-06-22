import MobileScreenLayout from '../../components/layout/MobileScreenLayout';
import SearchInput from '../../components/common/SearchInput';

export default function CandidateHome() {
  return (
    <MobileScreenLayout header={<h1 className="text-2xl font-bold">Encuentra tu próximo trabajo</h1>}>
      <div className="p-4">
        <SearchInput placeholder="Buscar por puesto, empresa o habilidad..." />
        {/* Aquí irían otros componentes del dashboard del candidato */}
        <p className="mt-8 text-center text-slate-500">Contenido del dashboard del candidato...</p>
      </div>
    </MobileScreenLayout>
  );
}