import type { AchievementDefinition, AchievementId, Locale } from './worlds/types';

export const ACHIEVEMENTS: Record<AchievementId, AchievementDefinition> = {
  'new-world': {
    id: 'new-world',
    icon: 'grass',
    title: {
      zh: '新世界已生成',
      en: 'New World Generated',
    },
    description: {
      zh: '欢迎来到刚开档的 3D 方块浮空岛',
      en: 'Welcome to a fresh-save 3D voxel sky island',
    },
  },
  creeper: {
    id: 'creeper',
    icon: 'creeper',
    title: {
      zh: '嘶嘶嘶...',
      en: 'Creeper Whisperer',
    },
    description: {
      zh: '你戳响了岛上的体素苦力怕！',
      en: 'You poked the voxel Creeper on the island!',
    },
  },
  'night-owl': {
    id: 'night-owl',
    icon: 'moon',
    title: {
      zh: '夜猫子',
      en: 'Night Owl',
    },
    description: {
      zh: '切换昼夜天光，点亮浮空岛火把',
      en: 'Switched the sky cycle and lit the island torches',
    },
  },
};

export const UI_TEXT = {
  pageTitle: {
    zh: '方块世界 · hufangyuan460',
    en: 'Voxel World · hufangyuan460',
  },
  worldBadge: {
    zh: '存档 #001 · 刚开档',
    en: 'SAVE #001 · FRESH WORLD',
  },
  worldTagline: {
    zh: '拖拽旋转 · 滚轮缩放 · 试试点击岛上的苦力怕',
    en: 'Drag to orbit · Scroll to zoom · Try clicking the Creeper',
  },
  langToggleLabel: {
    zh: '切换语言',
    en: 'Switch Language',
  },
  githubButton: {
    zh: 'GitHub 主页',
    en: 'GitHub Profile',
  },
  advancementBanner: {
    zh: '获得进度！',
    en: 'Advancement Made!',
  },
  notificationsRegion: {
    zh: '进度通知',
    en: 'Advancement notifications',
  },
  screenReaderAnnouncements: {
    zh: '屏幕阅读器进度播报',
    en: 'Screen reader advancement announcements',
  },
  dismissToast: {
    zh: '关闭通知',
    en: 'Dismiss notification',
  },
  closePanel: {
    zh: '返回主世界 (Esc)',
    en: 'Back to Overworld (Esc)',
  },
  dayLabel: {
    zh: '白昼',
    en: 'DAY',
  },
  nightLabel: {
    zh: '星夜',
    en: 'NIGHT',
  },
  emptySlotName: {
    zh: '空槽位 · 留给新存档',
    en: 'Empty Slot · Reserved for New Save',
  },
  emptySlotHint: {
    zh: '新存档空白格，等待未来的子世界插件',
    en: 'Blank slot waiting for future sub-world plugins',
  },
  hotbarAriaLabel: {
    zh: '底部九格快捷物品栏',
    en: 'Bottom 9-slot hotbar',
  },
  advancementsCount: {
    zh: '已解锁进度',
    en: 'Advancements',
  },
  creeperHint: {
    zh: '苦力怕似乎在看着你...',
    en: 'The Creeper is staring at you...',
  },
  forge: {
    heading: {
      zh: 'MC 主页工坊',
      en: 'Profile Forge',
    },
    subheading: {
      zh: '可视化定制你的 profile.config.json，实时预览并一键导出',
      en: 'Customize profile.config.json visually with live preview & one-click export',
    },
    titleLabel: {
      zh: '世界标题 (title)',
      en: 'World Title (title)',
    },
    subtitleLabel: {
      zh: '世界副标题 (subtitle)',
      en: 'World Subtitle (subtitle)',
    },
    slotsLegend: {
      zh: '前 4 格快捷栏名称 (slots)',
      en: 'First 4 Hotbar Slot Names (slots)',
    },
    slotPrefix: {
      zh: '槽位',
      en: 'Slot',
    },
    previewHeading: {
      zh: '实时预览',
      en: 'Live Preview',
    },
    jsonHeading: {
      zh: 'profile.config.json 预览',
      en: 'profile.config.json Output',
    },
    copyBtn: {
      zh: '复制 JSON',
      en: 'Copy JSON',
    },
    copiedBtn: {
      zh: '已复制!',
      en: 'Copied!',
    },
    downloadBtn: {
      zh: '下载 JSON',
      en: 'Download JSON',
    },
    resetBtn: {
      zh: '恢复默认',
      en: 'Reset',
    },
    defaults: {
      zh: {
        title: 'hufangyuan460 的方块世界',
        subtitle: '一个刚开档的开源玩家的 3D 像素浮空岛',
        slots: ['主世界', 'MC 主页工坊', '动画实验室', '昼夜切换'] as [string, string, string, string],
      },
      en: {
        title: "hufangyuan460's Voxel World",
        subtitle: 'A fresh-save open-source player 3D pixel sky island',
        slots: ['Overworld', 'Profile Forge', 'Motion Lab', 'Day / Night'] as [string, string, string, string],
      },
    },
  },
  motionLab: {
    heading: {
      zh: '动画实验室',
      en: 'Motion Lab',
    },
    subheading: {
      zh: '实时操控 3D 浮空岛的程序化粒子与律动，面板不遮挡视角拖拽',
      en: 'Control live procedural particles & voxel motion while orbiting the 3D island',
    },
    presetsLabel: {
      zh: '程序化动画预设',
      en: 'Procedural Presets',
    },
    oreOrbit: {
      zh: '矿石环绕',
      en: 'Ore Orbit',
      descZh: '钻石、绿宝石、金矿与红石绕岛公转',
      descEn: 'Glowing diamond, emerald, gold & redstone crystals orbit the island',
    },
    portalVortex: {
      zh: '传送门粒子漩涡',
      en: 'Portal Particle Vortex',
      descZh: '下界紫色漩涡粒子在浮空岛周围盘旋升腾',
      descEn: 'Swirling purple Nether portal particles spiral around the island',
    },
    blockWave: {
      zh: '方块呼吸波浪',
      en: 'Block Breathing Wave',
      descZh: '岛屿表层体素与环绕小方块随谐波轻轻起伏',
      descEn: 'Island surface voxels and floating cubes ripple in a breathing wave',
    },
    speedLabel: {
      zh: '动画速度',
      en: 'Speed',
    },
    densityLabel: {
      zh: '粒子 / 方块密度',
      en: 'Density',
    },
    enableAll: {
      zh: '全部开启',
      en: 'Enable All',
    },
    calmAll: {
      zh: '静止微风',
      en: 'Calm Mode',
    },
    resetBtn: {
      zh: '默认参数',
      en: 'Reset',
    },
  },
} as const;

export function t(record: Record<Locale, string>, locale: Locale): string {
  return record[locale];
}
