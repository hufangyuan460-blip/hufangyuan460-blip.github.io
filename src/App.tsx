import { AchievementToast } from './components/AchievementToast';
import { Hotbar } from './components/Hotbar';
import { TopBar } from './components/TopBar';
import { WorldProvider, useWorld } from './context/WorldContext';
import { OverworldScene } from './scene/OverworldScene';
import { getWorldById } from './worlds/registry';

function WorldShell() {
  const { activeWorldId } = useWorld();
  const activeWorld = getWorldById(activeWorldId);
  const ActiveOverlay =
    activeWorld && activeWorld.kind === 'overlay' ? activeWorld.component : undefined;

  return (
    <main className="app-shell">
      <OverworldScene />
      <TopBar />
      {ActiveOverlay ? <ActiveOverlay /> : null}
      <Hotbar />
      <AchievementToast />
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
