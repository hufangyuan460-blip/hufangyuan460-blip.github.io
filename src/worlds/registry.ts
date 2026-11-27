import { createElement } from 'react';
import {
  CraftingTableIcon,
  GrassIcon,
  MoonIcon,
  PortalCrystalIcon,
  SunIcon,
} from '../components/PixelIcons';
import { MotionLab } from './MotionLab';
import { ProfileForge } from './ProfileForge';
import type { HotbarSlotNumber, WorldPlugin } from './types';

/**
 * Pluggable Sub-World Registry
 *
 * Add new worlds by registering an entry in slots 5–9 with an id, localized
 * labels, pixel icon, hotbar slot number, and component.
 */
export const WORLD_REGISTRY: WorldPlugin[] = [
  {
    id: 'overworld',
    slot: 1,
    kind: 'hub',
    name: {
      zh: '主世界',
      en: 'Overworld',
    },
    subtitle: {
      zh: '回到 3D 浮空岛自由视角',
      en: 'Return to the 3D floating island camera',
    },
    icon: () => createElement(GrassIcon, { size: 30 }),
  },
  {
    id: 'profile-forge',
    slot: 2,
    kind: 'overlay',
    name: {
      zh: 'MC 主页工坊',
      en: 'Profile Forge',
    },
    subtitle: {
      zh: '可视化定制并导出 profile.config.json',
      en: 'Customize & export profile.config.json',
    },
    icon: () => createElement(CraftingTableIcon, { size: 30 }),
    component: ProfileForge,
  },
  {
    id: 'motion-lab',
    slot: 3,
    kind: 'overlay',
    name: {
      zh: '动画实验室',
      en: 'Motion Lab',
    },
    subtitle: {
      zh: '控制 3D 场景程序化动画与粒子密度',
      en: 'Control 3D procedural animations & particle density',
    },
    icon: () => createElement(PortalCrystalIcon, { size: 30 }),
    component: MotionLab,
  },
  {
    id: 'day-night-toggle',
    slot: 4,
    kind: 'action',
    name: {
      zh: '昼夜切换',
      en: 'Day / Night',
    },
    subtitle: {
      zh: '切换晴空太阳与星空火把夜景',
      en: 'Switch between sunny sky and starry torchlight',
    },
    icon: ({ timeOfDay }) =>
      createElement(timeOfDay === 'day' ? SunIcon : MoonIcon, { size: 30 }),
    onActivate: ({ toggleTimeOfDay }) => {
      toggleTimeOfDay();
    },
  },
];

const ALL_SLOTS: HotbarSlotNumber[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export function getWorldById(id: string): WorldPlugin | undefined {
  return WORLD_REGISTRY.find((w) => w.id === id);
}

export function getWorldBySlot(slot: HotbarSlotNumber): WorldPlugin | undefined {
  return WORLD_REGISTRY.find((w) => w.slot === slot);
}

export function getHotbarSlots(): Array<{ slot: HotbarSlotNumber; plugin: WorldPlugin | null }> {
  return ALL_SLOTS.map((slot) => ({
    slot,
    plugin: getWorldBySlot(slot) ?? null,
  }));
}
