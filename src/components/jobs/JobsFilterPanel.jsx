import Select from '../ui/Select';
import Input from '../ui/Input';
import { CITIES } from '../../constants/cities';
import { JOB_TYPES } from '../../constants/jobTypes';
import { WORK_MODES } from '../../constants/workModes';
import { SECTORS } from '../../constants/sectors';

export default function JobsFilterPanel({ filters = {}, onChange, open = false }) {
  if (!open) return null;

  const cityOptions = [{ value: '', label: 'Todas las ciudades' }, ...CITIES.map((c) => ({ value: c, label: c }))];
  const typeOptions = [{ value: '', label: 'Todos los tipos' }, ...JOB_TYPES];
  const workModeOptions = [{ value: '', label: 'Todas las modalidades' }, ...WORK_MODES];
  const sectorOptions = [{ value: '', label: 'Todos los sectores' }, ...SECTORS.map((s) => ({ value: s, label: s }))];

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
        <Select
          label="Modalidad"
          value={filters.workMode || ''}
          onChange={(e) => onChange?.({ ...filters, workMode: e.target.value || undefined })}
          options={workModeOptions}
        />
        <Select
          label="Sector"
          value={filters.sector || ''}
          onChange={(e) => onChange?.({ ...filters, sector: e.target.value || undefined })}
          options={sectorOptions}
        />
        <Input
          label="Salario mínimo"
          type="number"
          min="0"
          value={filters.salaryMin || ''}
          onChange={(e) => onChange?.({ ...filters, salaryMin: e.target.value || undefined })}
          placeholder="Ej. 500000"
        />
        <Input
          label="Publicado desde"
          type="date"
          value={filters.dateFrom || ''}
          onChange={(e) => onChange?.({ ...filters, dateFrom: e.target.value || undefined })}
        />
      </div>
    </div>
  );
}
