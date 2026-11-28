import { AchievementToast } from './components/AchievementToast';
import { Hotbar } from './components/Hotbar';
import { BoatIcon, CraftingTableIcon, PortalCrystalIcon } from './components/PixelIcons';
import { TopBar } from './components/TopBar';
import { WorldProvider, useWorld } from './context/WorldContext';
import { UI_TEXT } from './i18n';
import { OverworldScene } from './scene/OverworldScene';
import { getWorldById } from './worlds/registry';

function WorldShell() {
  const {
    locale,
    activeWorldId,
    selectSlot,
    sailingMode,
    setSailingMode,
    focusedLandmark,
    nearbyLandmark,
    requestCameraFocus,
    sleepFade,
  } = useWorld();
  const activeWorld = getWorldById(activeWorldId);
  const ActiveOverlay =
    activeWorld && activeWorld.kind === 'overlay' ? activeWorld.component : undefined;

  // Contextual landmark action card when zoomed onto or sailing near Lighthouse / Workshop
  const activeSatellite =
    nearbyLandmark ?? (focusedLandmark === 'lighthouse' || focusedLandmark === 'workshop' ? focusedLandmark : null);

  return (
    <main className="app-shell">
      <OverworldScene />
      <TopBar />

      {/* Bottom-left Sail / Overview action control */}
      {!ActiveOverlay && (
        <div className="mc-sail-dock">
          <button
            type="button"
            className={`mc-stone-btn ${sailingMode ? 'mc-stone-btn--primary' : ''}`}
            onClick={() => (sailingMode ? requestCameraFocus('overview') : setSailingMode(true))}
          >
            <BoatIcon size={18} />
            <span>{sailingMode ? UI_TEXT.returnOverviewBtn[locale] : UI_TEXT.setSailBtn[locale]}</span>
          </button>

          {activeSatellite === 'lighthouse' && (
            <div className="mc-landmark-card">
              <div className="mc-landmark-card__title">{UI_TEXT.lighthouseName[locale]}</div>
              <button
                type="button"
                className="mc-stone-btn mc-stone-btn--primary mc-stone-btn--compact"
                onClick={() => selectSlot(3, 'motion-lab')}
              >
                <PortalCrystalIcon size={16} />
                <span>{UI_TEXT.openMotionLabBtn[locale]}</span>
              </button>
            </div>
          )}

          {activeSatellite === 'workshop' && (
            <div className="mc-landmark-card">
              <div className="mc-landmark-card__title">{UI_TEXT.workshopName[locale]}</div>
              <button
                type="button"
                className="mc-stone-btn mc-stone-btn--primary mc-stone-btn--compact"
                onClick={() => selectSlot(2, 'profile-forge')}
              >
                <CraftingTableIcon size={16} />
                <span>{UI_TEXT.openForgeBtn[locale]}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {ActiveOverlay ? <ActiveOverlay /> : null}
      <Hotbar />
      <AchievementToast />

      {/* Vanilla Minecraft sleep fade-to-black curtain */}
      <div
        className="mc-sleep-curtain"
        style={{ opacity: sleepFade }}
        aria-hidden="true"
      />
    </main>
  );
}

export default function App() {
  return (
    <WorldProvider>
      <WorldShell />
    </WorldProvider>
  );
}
