import type { ReactNode } from 'react';
import { OreIcon, PortalCrystalIcon, WaveIcon } from '../components/PixelIcons';
import { SubWorldPanel } from '../components/SubWorldPanel';
import { useWorld } from '../context/WorldContext';
import { UI_TEXT } from '../i18n';
import type { MotionPresets } from '../worlds/types';

export function MotionLab() {
  const {
    locale,
    motion,
    toggleMotionPreset,
    setMotionSpeed,
    setMotionDensity,
    setAllMotionPresets,
    resetMotion,
  } = useWorld();

  const presetCards: Array<{
    key: keyof MotionPresets;
    label: string;
    desc: string;
    icon: ReactNode;
    accent: string;
  }> = [
    {
      key: 'oreOrbit',
      label: UI_TEXT.motionLab.oreOrbit[locale],
      desc: locale === 'zh' ? UI_TEXT.motionLab.oreOrbit.descZh : UI_TEXT.motionLab.oreOrbit.descEn,
      icon: <OreIcon size={22} />,
      accent: 'cyan',
    },
    {
      key: 'portalVortex',
      label: UI_TEXT.motionLab.portalVortex[locale],
      desc:
        locale === 'zh'
          ? UI_TEXT.motionLab.portalVortex.descZh
          : UI_TEXT.motionLab.portalVortex.descEn,
      icon: <PortalCrystalIcon size={22} />,
      accent: 'purple',
    },
    {
      key: 'blockWave',
      label: UI_TEXT.motionLab.blockWave[locale],
      desc:
        locale === 'zh' ? UI_TEXT.motionLab.blockWave.descZh : UI_TEXT.motionLab.blockWave.descEn,
      icon: <WaveIcon size={22} />,
      accent: 'emerald',
    },
  ];

  return (
    <SubWorldPanel
      title={UI_TEXT.motionLab.heading[locale]}
      subtitle={UI_TEXT.motionLab.subheading[locale]}
      icon={<PortalCrystalIcon size={26} />}
      variant="docked"
    >
      <div className="motion-lab">
        <div className="motion-lab__section">
          <div className="mc-field__label">{UI_TEXT.motionLab.presetsLabel[locale]}</div>
          <div className="motion-preset-list">
            {presetCards.map((card) => {
              const active = motion.presets[card.key];
              return (
                <button
                  key={card.key}
                  type="button"
                  className={`motion-preset-card motion-preset-card--${card.accent} ${active ? 'is-active' : ''}`}
                  aria-pressed={active}
                  onClick={() => toggleMotionPreset(card.key)}
                >
                  <span className="motion-preset-card__icon">{card.icon}</span>
                  <span className="motion-preset-card__text">
                    <span className="motion-preset-card__title">{card.label}</span>
                    <span className="motion-preset-card__desc">{card.desc}</span>
                  </span>
                  <span className="motion-preset-card__pill">{active ? 'ON' : 'OFF'}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="motion-lab__sliders">
          <label className="mc-slider-field">
            <div className="mc-slider-field__top">
              <span className="mc-field__label">{UI_TEXT.motionLab.speedLabel[locale]}</span>
              <span className="mc-slider-value">{motion.speed.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              className="mc-slider"
              min={0.2}
              max={3.0}
              step={0.1}
              value={motion.speed}
              onChange={(e) => setMotionSpeed(Number(e.target.value))}
            />
          </label>

          <label className="mc-slider-field">
            <div className="mc-slider-field__top">
              <span className="mc-field__label">{UI_TEXT.motionLab.densityLabel[locale]}</span>
              <span className="mc-slider-value">{Math.round(motion.density * 100)}%</span>
            </div>
            <input
              type="range"
              className="mc-slider"
              min={0.2}
              max={1.0}
              step={0.05}
              value={motion.density}
              onChange={(e) => setMotionDensity(Number(e.target.value))}
            />
          </label>
        </div>

        <div className="motion-lab__actions">
          <button
            type="button"
            className="mc-stone-btn mc-stone-btn--primary"
            onClick={() => setAllMotionPresets(true)}
          >
            {UI_TEXT.motionLab.enableAll[locale]}
          </button>
          <button
            type="button"
            className="mc-stone-btn"
            onClick={() => setAllMotionPresets(false)}
          >
            {UI_TEXT.motionLab.calmAll[locale]}
          </button>
          <button type="button" className="mc-stone-btn mc-stone-btn--ghost" onClick={resetMotion}>
            {UI_TEXT.motionLab.resetBtn[locale]}
          </button>
        </div>
      </div>
    </SubWorldPanel>
  );
}
