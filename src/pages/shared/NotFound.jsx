import { Link } from 'react-router-dom';
import Button from '../../components/ui/Button';

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <h1 className="text-6xl font-bold text-primary-600">404</h1>
      <p className="mt-4 text-lg font-medium text-gray-900">Página no encontrada</p>
      <p className="mt-2 text-sm text-gray-500">La página que buscas no existe o fue movida.</p>
      <Link to="/" className="mt-8">
        <Button>Volver al inicio</Button>
      </Link>
    </div>
  );
}
