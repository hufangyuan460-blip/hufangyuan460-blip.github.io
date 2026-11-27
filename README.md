# hufangyuan460-blip.github.io

一个刚开档的开源玩家的 Minecraft 风格 3D 像素互动世界（v0.1）。

Built with **Vite + React + TypeScript + Three.js** and deployed to GitHub Pages at `/`.

## 特性 / Features

- **3D 主世界浮空岛**：纯程序化体素构建的草方块、泥土、石头、发光矿石、方块橡树、瀑布水面与漂浮像素云，支持鼠标拖拽旋转与滚轮缩放。
- **昼夜循环**：晴空太阳光与星空火把/萤石暖光夜景平滑切换。
- **苦力怕彩蛋**：点击岛上的体素苦力怕触发闪烁与粒子炸开特效，解锁进度「嘶嘶嘶... / Creeper Whisperer」。
- **插件化子世界注册表** (`src/worlds/registry.ts`)：底部 9 格 Hotbar HUD 支持鼠标点击与键盘 `1-9` 切换，前 4 格已点亮（主世界 / MC 主页工坊 / 动画实验室 / 昼夜切换），第 5–9 格留空待扩展。
- **中英双语切换**：默认简体中文，顶部 MC 石头按钮一键切换 `中文 / EN`。

## 本地运行 / Local Development

```bash
npm install
npm run dev
```

## 生产构建与本地预览 / Build & Preview

```bash
npm run build
npm run preview
```
