import type { ComponentType, ReactNode } from 'react';

export type Locale = 'zh' | 'en';
export type TimeOfDay = 'day' | 'night';
export type HotbarSlotNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type WorldKind = 'hub' | 'overlay' | 'action';

export type AchievementId = 'new-world' | 'creeper' | 'night-owl';

export interface AchievementDefinition {
  id: AchievementId;
  icon: 'grass' | 'creeper' | 'moon';
  title: Record<Locale, string>;
  description: Record<Locale, string>;
}

export interface AchievementToastItem {
  uid: number;
  achievementId: AchievementId;
  createdAt: number;
}

export interface MotionPresets {
  oreOrbit: boolean;
  portalVortex: boolean;
  blockWave: boolean;
}

export interface MotionSettings {
  presets: MotionPresets;
  speed: number;
  density: number;
}

export interface ProfileConfig {
  title: string;
  subtitle: string;
  slots: [string, string, string, string];
}

export interface WorldActionContext {
  toggleTimeOfDay: () => void;
  setActiveWorld: (id: string, slot: HotbarSlotNumber) => void;
  closeOverlay: () => void;
}

export interface WorldPlugin {
  id: string;
  slot: HotbarSlotNumber;
  kind: WorldKind;
  name: Record<Locale, string>;
  subtitle: Record<Locale, string>;
  icon: (ctx: { timeOfDay: TimeOfDay }) => ReactNode;
  component?: ComponentType;
  onActivate?: (actions: WorldActionContext) => void;
}
