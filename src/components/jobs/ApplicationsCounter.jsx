export default function ApplicationsCounter({ count = 0 }) {
  const label = count > 50 ? 'Más de 50 candidatos' : `${count} candidato${count === 1 ? '' : 's'}`;

  return <p className="text-sm text-gray-500">{label}</p>;
}
