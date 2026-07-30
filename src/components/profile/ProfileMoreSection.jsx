import { useState } from 'react';
import AppIcon from '../common/AppIcon';
import { ChevronDown, ICON_SIZES } from '../../constants/icons';
import { profileSectionCardClass } from './profileLayoutClasses';

/**
 * Collapsible utility group for own profile — keeps secondary blocks out of the main scroll.
 */
export default function ProfileMoreSection({ children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={profileSectionCardClass}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-space-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        aria-expanded={open}
      >
        <div>
          <h3 className="text-body font-semibold tracking-tight text-app-text">Más</h3>
          <p className="mt-space-xs text-caption text-app-subtle">
            Documentos, redes y enlaces
          </p>
        </div>
        <AppIcon
          icon={ChevronDown}
          size={ICON_SIZES.md}
          className={[
            'shrink-0 text-app-subtle transition-transform duration-fast',
            open ? 'rotate-180' : '',
          ].join(' ')}
        />
      </button>

      {open ? <div className="mt-space-md space-y-space-md">{children}</div> : null}
    </section>
  );
}
