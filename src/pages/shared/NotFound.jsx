import { Link } from 'react-router-dom';
import Button from '../../components/ui/Button';

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
        No hemos encontrado esta página
      </h1>
      <p className="mt-3 max-w-md text-sm text-gray-500">
        Es posible que el enlace ya no esté disponible o que la página se haya movido.
      </p>
      <Link to="/" className="mt-8">
        <Button>Volver al inicio</Button>
      </Link>
    </div>
  );
}
