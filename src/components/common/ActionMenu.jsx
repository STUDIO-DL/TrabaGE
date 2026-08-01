import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import AppIcon from './AppIcon';
import {
  AlertTriangle,
  Copy,
  MoreHorizontal,
  Pencil,
  Share2,
  Trash2,
  ICON_SIZES,
} from '../../constants/icons';

const TRIGGER_VARIANTS = {
  icon:
    'inline-flex h-btn-md min-h-touch min-w-touch items-center justify-center rounded-radius-sm text-app-muted transition-colors duration-fast ease-out hover:bg-app-surface hover:text-app-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg',
  button:
    'inline-flex h-btn-md min-h-touch min-w-touch items-center justify-center rounded-radius-md bg-app-card text-app-muted ring-1 ring-inset ring-app-border transition-colors duration-fast ease-out hover:bg-app-surface hover:text-app-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg',
};

const MENU_ITEM_CLASS =
  'flex w-full min-h-touch items-center gap-space-sm px-space-base py-space-sm text-left text-body-small text-app-text transition-colors duration-fast hover:bg-app-surface';

const MENU_PANEL_CLASS =
  'fixed z-toast min-w-[12.5rem] overflow-hidden rounded-radius-md border border-app-border bg-app-card py-space-xs shadow-elevation-3';

export default function ActionMenu({
  onShare,
  onCopy,
  onReport,
  onEdit,
  onDelete,
  reportLabel = 'Reportar',
  deleteLabel = 'Eliminar',
  align = 'right',
  variant = 'icon',
  className = '',
}) {
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);

  const hasItems = Boolean(onShare || onCopy || onReport || onEdit || onDelete);
  const triggerClass = TRIGGER_VARIANTS[variant] || TRIGGER_VARIANTS.icon;

  const updatePosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const menuWidth = menuRef.current?.offsetWidth ?? 200;
    const gap = 4;
    const viewportPad = 8;

    let left = align === 'left' ? rect.left : rect.right - menuWidth;
    left = Math.min(Math.max(viewportPad, left), window.innerWidth - menuWidth - viewportPad);

    const topBelow = rect.bottom + gap;
    const estimatedHeight = menuRef.current?.offsetHeight ?? 140;
    const top =
      topBelow + estimatedHeight > window.innerHeight - viewportPad
        ? Math.max(viewportPad, rect.top - estimatedHeight - gap)
        : topBelow;

    setCoords({ top, left });
  };

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return undefined;
    }
    updatePosition();
    const handleReposition = () => updatePosition();
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);
    return () => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, align, onShare, onCopy, onReport, onEdit, onDelete]);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointer = (event) => {
      const inTrigger = rootRef.current?.contains(event.target);
      const inMenu = menuRef.current?.contains(event.target);
      if (!inTrigger && !inMenu) setOpen(false);
    };
    const handleKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const run = (fn) => {
    setOpen(false);
    fn?.();
  };

  const handleTriggerClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!hasItems) return;
    setOpen((value) => !value);
  };

  return (
    <div className={`relative shrink-0 ${className}`.trim()} ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleTriggerClick}
        className={triggerClass}
        aria-label="Más opciones"
        aria-expanded={open}
        aria-haspopup="menu"
        disabled={!hasItems}
      >
        <AppIcon icon={MoreHorizontal} size={ICON_SIZES.md} />
      </button>

      {open && hasItems && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              className={MENU_PANEL_CLASS}
              style={{
                top: coords?.top ?? -9999,
                left: coords?.left ?? -9999,
                visibility: coords ? 'visible' : 'hidden',
              }}
            >
              {onEdit ? (
                <button type="button" role="menuitem" onClick={() => run(onEdit)} className={MENU_ITEM_CLASS}>
                  <AppIcon icon={Pencil} size={ICON_SIZES.sm} className="text-app-subtle" />
                  Editar
                </button>
              ) : null}
              {onShare ? (
                <button type="button" role="menuitem" onClick={() => run(onShare)} className={MENU_ITEM_CLASS}>
                  <AppIcon icon={Share2} size={ICON_SIZES.sm} className="text-app-subtle" />
                  Compartir
                </button>
              ) : null}
              {onCopy ? (
                <button type="button" role="menuitem" onClick={() => run(onCopy)} className={MENU_ITEM_CLASS}>
                  <AppIcon icon={Copy} size={ICON_SIZES.sm} className="text-app-subtle" />
                  Copiar enlace
                </button>
              ) : null}
              {onReport ? (
                <button type="button" role="menuitem" onClick={() => run(onReport)} className={MENU_ITEM_CLASS}>
                  <AppIcon icon={AlertTriangle} size={ICON_SIZES.sm} className="text-warning-600" />
                  {reportLabel}
                </button>
              ) : null}
              {onDelete ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => run(onDelete)}
                  className={`${MENU_ITEM_CLASS} text-error-600`}
                >
                  <AppIcon icon={Trash2} size={ICON_SIZES.sm} className="text-error-600" />
                  {deleteLabel}
                </button>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
