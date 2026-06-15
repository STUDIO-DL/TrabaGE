import AppIcon from '../common/AppIcon';
import { ChevronDown, ICON_SIZES } from '../../constants/icons';

export default function HelpQuestion({ id, question, answer, isOpen, onToggle }) {
  const panelId = `${id}-panel`;
  const buttonId = `${id}-button`;

  return (
    <div className="bg-white">
      <h3>
        <button
          id={buttonId}
          type="button"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={onToggle}
          className="flex w-full items-start justify-between gap-3 px-4 py-4 text-left transition-colors hover:bg-slate-50 sm:px-5"
        >
          <span className="text-sm font-medium text-slate-900 sm:text-[15px]">{question}</span>
          <AppIcon
            icon={ChevronDown}
            size={ICON_SIZES.default}
            className={`mt-0.5 shrink-0 text-primary-600 transition-transform duration-300 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>
      </h3>

      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        className={`grid transition-all duration-300 ease-in-out ${
          isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <p className="whitespace-pre-wrap px-4 pb-4 text-sm leading-relaxed text-slate-600 sm:px-5">
            {answer}
          </p>
        </div>
      </div>
    </div>
  );
}
