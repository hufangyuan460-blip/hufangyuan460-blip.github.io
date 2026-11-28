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
      zh: '切换昼夜天光，点亮海岛灯笼与信标',
      en: 'Switched the sky cycle and lit the island lanterns & beacon',
    },
  },
  'beacon-master': {
    id: 'beacon-master',
    icon: 'beacon',
    title: {
      zh: '信标大师',
      en: 'Beacon Master',
    },
    description: {
      zh: '点击山巅信标方块，切换直冲云霄的光柱颜色',
      en: 'Cycled the summit Beacon beam color into the sky',
    },
  },
  'sea-explorer': {
    id: 'sea-explorer',
    icon: 'boat',
    title: {
      zh: '星海航海家',
      en: 'Sea Explorer',
    },
    description: {
      zh: '驾驭橡木小船扬帆出海，探访灯塔岛或风车工坊岛',
      en: 'Sailed the oak boat across the sea to visit the Lighthouse or Workshop Isle',
    },
  },
  'sweet-dreams': {
    id: 'sweet-dreams',
    icon: 'bed',
    title: {
      zh: '甜蜜的梦',
      en: 'Sweet Dreams',
    },
    description: {
      zh: '在星夜点击经典红床安然入眠，迎接破晓晨光',
      en: 'Slept in the classic red bed at night and woke to dawn sunrise',
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
    zh: '拖拽旋转 · 点击岛屿/小船/红床探索星海群岛',
    en: 'Drag to orbit · Click islands, oak boat, or red bed to explore',
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
    zh: '黑夜',
    en: 'NIGHT',
  },
  timePhases: {
    dawn: { zh: '黎明', en: 'DAWN' },
    day: { zh: '白昼', en: 'DAY' },
    dusk: { zh: '黄昏', en: 'DUSK' },
    night: { zh: '黑夜', en: 'NIGHT' },
  },
  audioOn: {
    zh: '环境音已开启',
    en: 'Ambient Audio On',
  },
  audioOff: {
    zh: '开启海浪与音效',
    en: 'Enable Waves & SFX',
  },
  setSailBtn: {
    zh: '出海巡航',
    en: 'Set Sail',
  },
  returnOverviewBtn: {
    zh: '返回全景',
    en: 'Overview',
  },
  sailingControlsHint: {
    zh: 'W/A/S/D 掌舵 · Esc 返回全景',
    en: 'W/A/S/D to Sail · Esc for Overview',
  },
  boatHint: {
    zh: '点击橡木船 · 出海巡航',
    en: 'Click Oak Boat · Set Sail',
  },
  bedHint: {
    zh: '点击红床 · 夜间入睡',
    en: 'Click Red Bed · Sleep at Night',
  },
  bedDaytimeOnly: {
    zh: '你只能在夜间入睡',
    en: 'You may only rest at night',
  },
  lighthouseName: {
    zh: '海崖灯塔岛',
    en: 'Cliff Lighthouse Isle',
  },
  lighthouseHint: {
    zh: '点击海崖灯塔岛 · 聚焦视角',
    en: 'Click Lighthouse Isle · Focus View',
  },
  openMotionLabBtn: {
    zh: '打开动画实验室',
    en: 'Open Motion Lab',
  },
  workshopName: {
    zh: '风车工坊岛',
    en: 'Windmill Workshop Isle',
  },
  workshopHint: {
    zh: '点击风车工坊岛 · 聚焦视角',
    en: 'Click Workshop Isle · Focus View',
  },
  openForgeBtn: {
    zh: '打开 MC 主页工坊',
    en: 'Open Profile Forge',
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
  beaconHint: {
    zh: '点击信标 · 切换光柱颜色',
    en: 'Click Beacon · Cycle Beam Color',
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
