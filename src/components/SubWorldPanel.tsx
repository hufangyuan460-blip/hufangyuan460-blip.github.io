import { useEffect, useId, useRef, type ReactNode } from 'react';
import { useWorld } from '../context/WorldContext';
import { UI_TEXT } from '../i18n';

interface SubWorldPanelProps {
  title: string;
  subtitle: string;
  icon: ReactNode;
  variant?: 'center' | 'docked';
  children: ReactNode;
}

export function SubWorldPanel({
  title,
  subtitle,
  icon,
  variant = 'center',
  children,
}: SubWorldPanelProps) {
  const { locale, returnToOverworld } = useWorld();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();
  const panelId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    // Ensure attribute is set before interacting with popover API / polyfill
    dialog.setAttribute('popover', 'manual');

    const openPanel = () => {
      try {
        if (typeof dialog.showPopover === 'function') {
          if (!dialog.matches(':popover-open')) {
            dialog.showPopover();
          }
        } else if (!dialog.open) {
          dialog.show();
        }
      } catch {
        if (!dialog.open) {
          dialog.show();
        }
      }
    };

    // Defer by one microtask so conditional polyfill (if needed) can attach
    const frame = requestAnimationFrame(openPanel);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        returnToOverworld();
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('keydown', onKeyDown);
      try {
        if (typeof dialog.hidePopover === 'function' && dialog.matches(':popover-open')) {
          dialog.hidePopover();
        } else if (dialog.open) {
          dialog.close();
        }
      } catch {
        // Ignore cleanup errors if element already detached
      }
    };
  }, [returnToOverworld]);

  return (
    <dialog
      ref={dialogRef}
      id={panelId}
      className={`mc-panel mc-panel--${variant}`}
      aria-labelledby={titleId}
    >
      <header className="mc-panel__header">
        <div className="mc-panel__title-group">
          <span className="mc-panel__icon">{icon}</span>
          <div>
            <h2 id={titleId} className="mc-panel__title">
              {title}
            </h2>
            <p className="mc-panel__subtitle">{subtitle}</p>
          </div>
        </div>
        <button
          type="button"
          className="mc-stone-btn mc-stone-btn--icon"
          onClick={returnToOverworld}
          aria-label={UI_TEXT.closePanel[locale]}
          title={UI_TEXT.closePanel[locale]}
          {...({ popovertarget: panelId, popovertargetaction: 'hide' } as Record<string, string>)}
        >
          ×
        </button>
      </header>
      <div className="mc-panel__body">{children}</div>
    </dialog>
  );
}
