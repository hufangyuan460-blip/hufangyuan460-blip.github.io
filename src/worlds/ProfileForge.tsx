import { useMemo, useState } from 'react';
import { CraftingTableIcon, GrassIcon, PortalCrystalIcon, SunIcon } from '../components/PixelIcons';
import { SubWorldPanel } from '../components/SubWorldPanel';
import { useWorld } from '../context/WorldContext';
import { UI_TEXT } from '../i18n';
import type { ProfileConfig } from '../worlds/types';

export function ProfileForge() {
  const { locale } = useWorld();
  const defaults = UI_TEXT.forge.defaults[locale];

  const [config, setConfig] = useState<ProfileConfig>(() => ({
    title: defaults.title,
    subtitle: defaults.subtitle,
    slots: [...defaults.slots] as [string, string, string, string],
  }));
  const [copied, setCopied] = useState(false);

  const jsonOutput = useMemo(
    () =>
      JSON.stringify(
        {
          version: '0.1',
          theme: 'minecraft-voxel',
          title: config.title,
          subtitle: config.subtitle,
          hotbarSlots: config.slots.map((name, idx) => ({
            slot: idx + 1,
            name,
          })),
        },
        null,
        2,
      ),
    [config],
  );

  const updateSlotName = (index: number, value: string) => {
    setConfig((prev) => {
      const nextSlots = [...prev.slots] as [string, string, string, string];
      nextSlots[index] = value;
      return { ...prev, slots: nextSlots };
    });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonOutput);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback textarea copy
      const area = document.createElement('textarea');
      area.value = jsonOutput;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      document.body.removeChild(area);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([jsonOutput], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'profile.config.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    const fresh = UI_TEXT.forge.defaults[locale];
    setConfig({
      title: fresh.title,
      subtitle: fresh.subtitle,
      slots: [...fresh.slots] as [string, string, string, string],
    });
  };

  const previewIcons = [
    <GrassIcon key="1" size={18} />,
    <CraftingTableIcon key="2" size={18} />,
    <PortalCrystalIcon key="3" size={18} />,
    <SunIcon key="4" size={18} />,
  ];

  return (
    <SubWorldPanel
      title={UI_TEXT.forge.heading[locale]}
      subtitle={UI_TEXT.forge.subheading[locale]}
      icon={<CraftingTableIcon size={26} />}
      variant="center"
    >
      <div className="forge-grid">
        <section className="forge-form">
          <label className="mc-field">
            <span className="mc-field__label">{UI_TEXT.forge.titleLabel[locale]}</span>
            <input
              type="text"
              className="mc-input"
              value={config.title}
              maxLength={48}
              onChange={(e) => setConfig((prev) => ({ ...prev, title: e.target.value }))}
            />
          </label>

          <label className="mc-field">
            <span className="mc-field__label">{UI_TEXT.forge.subtitleLabel[locale]}</span>
            <input
              type="text"
              className="mc-input"
              value={config.subtitle}
              maxLength={72}
              onChange={(e) => setConfig((prev) => ({ ...prev, subtitle: e.target.value }))}
            />
          </label>

          <fieldset className="mc-fieldset">
            <legend className="mc-field__label">{UI_TEXT.forge.slotsLegend[locale]}</legend>
            <div className="forge-slots-inputs">
              {config.slots.map((slotVal, idx) => (
                <label key={idx} className="mc-field mc-field--inline">
                  <span className="mc-slot-badge">
                    {UI_TEXT.forge.slotPrefix[locale]} {idx + 1}
                  </span>
                  <input
                    type="text"
                    className="mc-input"
                    value={slotVal}
                    maxLength={24}
                    onChange={(e) => updateSlotName(idx, e.target.value)}
                  />
                </label>
              ))}
            </div>
          </fieldset>

          <div className="forge-actions">
            <button type="button" className="mc-stone-btn mc-stone-btn--primary" onClick={handleCopy}>
              {copied ? UI_TEXT.forge.copiedBtn[locale] : UI_TEXT.forge.copyBtn[locale]}
            </button>
            <button type="button" className="mc-stone-btn" onClick={handleDownload}>
              {UI_TEXT.forge.downloadBtn[locale]}
            </button>
            <button type="button" className="mc-stone-btn mc-stone-btn--ghost" onClick={handleReset}>
              {UI_TEXT.forge.resetBtn[locale]}
            </button>
          </div>
        </section>

        <section className="forge-output">
          <div className="forge-preview-card">
            <div className="forge-section-kicker">{UI_TEXT.forge.previewHeading[locale]}</div>
            <div className="forge-preview-banner">
              <div className="forge-preview-banner__title">
                {config.title || defaults.title}
              </div>
              <div className="forge-preview-banner__sub">
                {config.subtitle || defaults.subtitle}
              </div>
              <div className="forge-mini-hotbar" aria-label="Preview hotbar">
                {config.slots.map((name, i) => (
                  <div key={i} className="forge-mini-slot">
                    <span className="forge-mini-slot__num">{i + 1}</span>
                    {previewIcons[i]}
                    <span className="forge-mini-slot__name">{name || `#${i + 1}`}</span>
                  </div>
                ))}
                {[5, 6, 7, 8, 9].map((n) => (
                  <div key={n} className="forge-mini-slot forge-mini-slot--empty">
                    <span className="forge-mini-slot__num">{n}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="forge-json-box">
            <div className="forge-section-kicker">{UI_TEXT.forge.jsonHeading[locale]}</div>
            <pre className="mc-code-block">
              <code>{jsonOutput}</code>
            </pre>
          </div>
        </section>
      </div>
    </SubWorldPanel>
  );
}
