import { useCallback, useEffect } from 'react';
import { useWorld } from '../context/WorldContext';
import { UI_TEXT } from '../i18n';
import { getHotbarSlots } from '../worlds/registry';
import type { HotbarSlotNumber, WorldPlugin } from '../worlds/types';

export function Hotbar() {
  const {
    locale,
    timeOfDay,
    activeSlot,
    selectSlot,
    returnToOverworld,
    toggleTimeOfDay,
    emptySlotHintSlot,
    flashEmptySlot,
  } = useWorld();

  const slots = getHotbarSlots();

  const activateSlot = useCallback(
    (slotNum: HotbarSlotNumber, plugin: WorldPlugin | null) => {
      if (!plugin) {
        flashEmptySlot(slotNum);
        return;
      }

      if (plugin.kind === 'action' && plugin.onActivate) {
        plugin.onActivate({
          toggleTimeOfDay,
          setActiveWorld: (id, s) => selectSlot(s, id),
          closeOverlay: returnToOverworld,
        });
        return;
      }

      if (plugin.kind === 'hub') {
        returnToOverworld();
        return;
      }

      // Clicking the already-active overlay slot toggles back to Overworld
      if (activeSlot === slotNum) {
        returnToOverworld();
        return;
      }

      selectSlot(slotNum, plugin.id);
    },
    [activeSlot, flashEmptySlot, returnToOverworld, selectSlot, toggleTimeOfDay],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const digit = Number(e.key);
      if (digit >= 1 && digit <= 9) {
        const slotNum = digit as HotbarSlotNumber;
        const entry = slots.find((s) => s.slot === slotNum);
        activateSlot(slotNum, entry?.plugin ?? null);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activateSlot, slots]);

  const activeEntry = slots.find((s) => s.slot === activeSlot);
  const captionText = emptySlotHintSlot
    ? `${UI_TEXT.emptySlotName[locale]} (#${emptySlotHintSlot})`
    : activeEntry?.plugin
      ? activeEntry.plugin.name[locale]
      : UI_TEXT.emptySlotName[locale];

  return (
    <div className="mc-hotbar-dock">
      <div className="mc-hotbar-caption" aria-live="polite">
        {captionText}
      </div>

      <div className="mc-hotbar" role="toolbar" aria-label={UI_TEXT.hotbarAriaLabel[locale]}>
        {slots.map(({ slot, plugin }) => {
          const isSelected = activeSlot === slot;
          const isEmpty = plugin === null;
          const isFlashingEmpty = emptySlotHintSlot === slot;
          const label = plugin
            ? `${slot}. ${plugin.name[locale]} — ${plugin.subtitle[locale]}`
            : `${slot}. ${UI_TEXT.emptySlotHint[locale]}`;

          return (
            <button
              key={slot}
              type="button"
              className={[
                'mc-hotbar__slot',
                isSelected ? 'is-selected' : '',
                isEmpty ? 'is-empty' : 'is-filled',
                isFlashingEmpty ? 'is-empty-flash' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => activateSlot(slot, plugin)}
              aria-label={label}
              aria-pressed={!isEmpty && plugin.kind !== 'action' ? isSelected : undefined}
              title={label}
            >
              <span className="mc-hotbar__key">{slot}</span>
              <span className="mc-hotbar__icon">
                {plugin ? plugin.icon({ timeOfDay }) : null}
              </span>
              {plugin && (
                <span className="mc-hotbar__tooltip" aria-hidden="true">
                  {plugin.name[locale]}
                </span>
              )}
              {isEmpty && (
                <span className="mc-hotbar__tooltip mc-hotbar__tooltip--muted" aria-hidden="true">
                  {UI_TEXT.emptySlotName[locale]}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
