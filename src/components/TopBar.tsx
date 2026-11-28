import { useState } from 'react';
import { soundEngine } from '../audio/soundEngine';
import { useWorld } from '../context/WorldContext';
import { ACHIEVEMENTS, UI_TEXT } from '../i18n';
import type { AchievementId } from '../worlds/types';
import {
  GithubPixelIcon,
  GrassIcon,
  MoonIcon,
  SpeakerOffIcon,
  SpeakerOnIcon,
  SunIcon,
  SunriseIcon,
  SunsetIcon,
  TrophyIcon,
} from './PixelIcons';

const ALL_ACHIEVEMENT_IDS: AchievementId[] = [
  'new-world',
  'creeper',
  'night-owl',
  'beacon-master',
  'sea-explorer',
  'sweet-dreams',
];

export function TopBar() {
  const {
    locale,
    toggleLocale,
    timePhase,
    audioMuted,
    toggleAudioMuted,
    sailingMode,
    focusedLandmark,
    requestCameraFocus,
    unlockedAchievements,
  } = useWorld();
  const [showLog, setShowLog] = useState(false);

  const renderPhaseIcon = () => {
    if (timePhase === 'dawn') return <SunriseIcon size={14} />;
    if (timePhase === 'dusk') return <SunsetIcon size={14} />;
    if (timePhase === 'night') return <MoonIcon size={14} />;
    return <SunIcon size={14} />;
  };

  return (
    <header className="mc-topbar">
      <div className="mc-topbar__brand">
        <div className="mc-world-pill">
          <GrassIcon size={20} />
          <div className="mc-world-pill__text">
            <span className="mc-world-pill__name">hufangyuan460</span>
            <span className="mc-world-pill__sub">{UI_TEXT.worldBadge[locale]}</span>
          </div>
          <span className={`mc-time-chip mc-time-chip--${timePhase}`} title={UI_TEXT.timePhases[timePhase][locale]}>
            {renderPhaseIcon()}
            <span>{UI_TEXT.timePhases[timePhase][locale]}</span>
          </span>
        </div>
        <p className="mc-topbar__hint">
          {sailingMode ? UI_TEXT.sailingControlsHint[locale] : UI_TEXT.worldTagline[locale]}
        </p>
      </div>

      <nav className="mc-topbar__actions" aria-label="Top navigation">
        {(sailingMode || focusedLandmark !== null) && (
          <button
            type="button"
            className="mc-stone-btn mc-stone-btn--primary"
            onClick={() => requestCameraFocus('overview')}
          >
            <span>{UI_TEXT.returnOverviewBtn[locale]}</span>
          </button>
        )}

        <button
          type="button"
          className={`mc-stone-btn mc-stone-btn--compact ${!audioMuted ? 'is-audio-active' : ''}`}
          onClick={toggleAudioMuted}
          aria-pressed={!audioMuted}
          aria-label={audioMuted ? UI_TEXT.audioOff[locale] : UI_TEXT.audioOn[locale]}
          title={audioMuted ? UI_TEXT.audioOff[locale] : UI_TEXT.audioOn[locale]}
        >
          {audioMuted ? <SpeakerOffIcon size={16} /> : <SpeakerOnIcon size={16} />}
        </button>

        <div className="mc-adv-wrapper">
          <button
            type="button"
            className="mc-stone-btn mc-stone-btn--compact"
            onClick={() => {
              soundEngine.playUiClick();
              setShowLog((prev) => !prev);
            }}
            aria-expanded={showLog}
            aria-label={UI_TEXT.advancementsCount[locale]}
            title={UI_TEXT.advancementsCount[locale]}
          >
            <TrophyIcon size={16} />
            <span>
              {unlockedAchievements.length}/{ALL_ACHIEVEMENT_IDS.length}
            </span>
          </button>

          {showLog && (
            <div className="mc-adv-dropdown" role="region" aria-label={UI_TEXT.advancementsCount[locale]}>
              <div className="mc-adv-dropdown__title">{UI_TEXT.advancementsCount[locale]}</div>
              <ul className="mc-adv-list">
                {ALL_ACHIEVEMENT_IDS.map((id) => {
                  const unlocked = unlockedAchievements.includes(id);
                  const def = ACHIEVEMENTS[id];
                  return (
                    <li key={id} className={`mc-adv-list__item ${unlocked ? 'is-unlocked' : 'is-locked'}`}>
                      <span className="mc-adv-list__dot">{unlocked ? '★' : '☆'}</span>
                      <div>
                        <div className="mc-adv-list__name">{def.title[locale]}</div>
                        <div className="mc-adv-list__desc">{def.description[locale]}</div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        <button
          type="button"
          className="mc-stone-btn"
          onClick={toggleLocale}
          aria-label={UI_TEXT.langToggleLabel[locale]}
        >
          <span className={locale === 'zh' ? 'mc-lang-active' : 'mc-lang-dim'}>中文</span>
          <span className="mc-lang-sep">/</span>
          <span className={locale === 'en' ? 'mc-lang-active' : 'mc-lang-dim'}>EN</span>
        </button>

        <a
          className="mc-stone-btn mc-stone-btn--link"
          href="https://github.com/hufangyuan460-blip"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => soundEngine.playUiClick()}
        >
          <GithubPixelIcon size={16} />
          <span>{UI_TEXT.githubButton[locale]}</span>
        </a>
      </nav>
    </header>
  );
}
