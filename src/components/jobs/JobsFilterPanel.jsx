import Select from '../ui/Select';
import { CITIES } from '../../constants/cities';
import { JOB_TYPES } from '../../constants/jobTypes';

export default function JobsFilterPanel({ filters = {}, onChange, open = false }) {
  if (!open) return null;

  const cityOptions = [{ value: '', label: 'Todas las ciudades' }, ...CITIES.map((c) => ({ value: c, label: c }))];
  const typeOptions = [{ value: '', label: 'Todos los tipos' }, ...JOB_TYPES];

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Select
          label="Ciudad"
          value={filters.city || ''}
          onChange={(e) => onChange?.({ ...filters, city: e.target.value || undefined })}
          options={cityOptions}
        />
        <Select
          label="Tipo de empleo"
          value={filters.jobType || ''}
          onChange={(e) => onChange?.({ ...filters, jobType: e.target.value || undefined })}
          options={typeOptions}
        />
      </div>
    </div>
  );
}
