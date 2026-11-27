import { useEffect, useId, useRef, useState } from 'react';
import { useWorld } from '../context/WorldContext';
import { ACHIEVEMENTS, UI_TEXT } from '../i18n';
import type { AchievementToastItem } from '../worlds/types';
import { CreeperIcon, GrassIcon, MoonIcon } from './PixelIcons';

function renderToastIcon(kind: 'grass' | 'creeper' | 'moon') {
  switch (kind) {
    case 'creeper':
      return <CreeperIcon size={28} />;
    case 'moon':
      return <MoonIcon size={28} />;
    case 'grass':
    default:
      return <GrassIcon size={28} />;
  }
}

interface SingleToastProps {
  item: AchievementToastItem;
  index: number;
  onDismiss: (uid: number) => void;
}

function SingleAchievementToast({ item, index, onDismiss }: SingleToastProps) {
  const { locale } = useWorld();
  const toastRef = useRef<HTMLDivElement | null>(null);
  const toastId = useId();
  const [paused, setPaused] = useState(false);

  const def = ACHIEVEMENTS[item.achievementId];

  useEffect(() => {
    const el = toastRef.current;
    if (!el) return;
    el.setAttribute('popover', 'manual');
    const frame = requestAnimationFrame(() => {
      try {
        if (typeof el.showPopover === 'function' && !el.matches(':popover-open')) {
          el.showPopover();
        }
      } catch {
        // Fallback: CSS handles visibility if popover API is unavailable
      }
    });
    return () => {
      cancelAnimationFrame(frame);
      try {
        if (typeof el.hidePopover === 'function' && el.matches(':popover-open')) {
          el.hidePopover();
        }
      } catch {
        // Ignore cleanup errors
      }
    };
  }, []);

  useEffect(() => {
    if (paused) return;
    const timer = window.setTimeout(() => {
      onDismiss(item.uid);
    }, 4800);
    return () => window.clearTimeout(timer);
  }, [item.uid, onDismiss, paused]);

  return (
    <div
      ref={toastRef}
      id={toastId}
      className="mc-toast"
      style={{ '--toast-index': index } as React.CSSProperties}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setPaused(false);
        }
      }}
    >
      <div className="mc-toast__icon-slot">{renderToastIcon(def.icon)}</div>
      <div className="mc-toast__content">
        <div className="mc-toast__kicker">{UI_TEXT.advancementBanner[locale]}</div>
        <div className="mc-toast__title">{def.title[locale]}</div>
        <div className="mc-toast__desc">{def.description[locale]}</div>
      </div>
      <button
        type="button"
        className="mc-toast__close"
        aria-label={UI_TEXT.dismissToast[locale]}
        onClick={() => onDismiss(item.uid)}
        {...({ popovertarget: toastId, popovertargetaction: 'hide' } as Record<string, string>)}
      >
        ×
      </button>
    </div>
  );
}

export function AchievementToast() {
  const { locale, toasts, dismissToast, srAnnouncement } = useWorld();

  return (
    <>
      <p className="sr-only">{UI_TEXT.screenReaderAnnouncements[locale]}</p>
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {srAnnouncement}
      </div>

      <div
        className="mc-toast-region"
        role="region"
        aria-label={UI_TEXT.notificationsRegion[locale]}
      >
        {toasts.map((item, idx) => (
          <SingleAchievementToast
            key={item.uid}
            item={item}
            index={idx}
            onDismiss={dismissToast}
          />
        ))}
      </div>
    </>
  );
}
