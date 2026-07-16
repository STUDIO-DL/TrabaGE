import AppIcon from '../common/AppIcon';
import Input from '../ui/Input';
import { Search } from '../../constants/icons';

export default function HelpSearch({ value, onChange }) {
  return (
    <Input
      type="search"
      icon={Search}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Buscar en el centro de ayuda..."
      aria-label="Buscar en el centro de ayuda"
    />
  );
}
