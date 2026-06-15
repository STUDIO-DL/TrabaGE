import AppIcon from '../common/AppIcon';
import { Search, ICON_COLORS, ICON_SIZES } from '../../constants/icons';

export default function HelpSearch({ value, onChange }) {
  return (
    <div className="relative">
      <AppIcon
        icon={Search}
        size={ICON_SIZES.default}
        className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${ICON_COLORS.inactive}`}
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Buscar en el centro de ayuda..."
        aria-label="Buscar en el centro de ayuda"
        className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
      />
    </div>
  );
}
