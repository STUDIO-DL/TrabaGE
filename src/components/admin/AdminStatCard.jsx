import AppIcon from '../common/AppIcon';
import { ICON_SIZES } from '../../constants/icons';

const TONES = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  purple: 'bg-violet-50 text-violet-600',
  slate: 'bg-slate-100 text-slate-600',
};

export default function AdminStatCard({ icon, tone = 'blue', value, label }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${TONES[tone]}`}>
        <AppIcon icon={icon} size={ICON_SIZES.default} />
      </span>
      <p className="mt-4 text-2xl font-bold tracking-tight text-gray-900">{value}</p>
      <p className="mt-1 text-sm text-gray-500">{label}</p>
    </div>
  );
}
