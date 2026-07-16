import AppIcon from '../common/AppIcon';
import { ChevronDown, ICON_SIZES } from '../../constants/icons';

export default function HelpQuestion({ id, question, answer, isOpen, onToggle }) {
  const panelId = `${id}-panel`;
  const buttonId = `${id}-button`;

  return (
    <div className="bg-app-card">
      <h3>
        <button
          id={buttonId}
          type="button"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={onToggle}
          className="flex w-full items-start justify-between gap-space-md px-space-base py-space-base text-left transition-colors duration-fast ease-out hover:bg-app-surface sm:px-space-lg"
        >
          <span className="text-body-small font-medium text-app-text">{question}</span>
          <AppIcon
            icon={ChevronDown}
            size={ICON_SIZES.default}
            className={`mt-0.5 shrink-0 text-primary-600 transition-transform duration-fast ease-out ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>
      </h3>

      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        className={`grid transition-all duration-fast ease-out ${
          isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <p className="whitespace-pre-wrap px-space-base pb-space-base text-body-small leading-relaxed text-app-muted sm:px-space-lg">
            {answer}
          </p>
        </div>
      </div>
    </div>
  );
}
