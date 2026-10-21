import { useEffect, useRef } from 'react';
import { game, useGame } from '../game';
import { QuestTracker } from './components/QuestTracker';
import { Feed, OfflineModal, Sidebar, Toasts, TopBar, useFlaskHotkeys, usePage, type Page } from './Layout';
import { BenchPage } from './pages/BenchPage';
import { CombatPage } from './pages/CombatPage';
import { EquipmentPage } from './pages/EquipmentPage';
import { HideoutPage } from './pages/HideoutPage';
import { SkillPage } from './pages/SkillPage';
import { SettingsPage, StashPage, VendorPage } from './pages/TownPages';
import { TreePage } from './pages/TreePage';
import { CharacterCreate, CharacterSelect, IntroModal, TitleScreen } from './screens/Screens';

function Content({ page, go }: { page: Page; go: (p: Page) => void }) {
  switch (page) {
    case 'hideout':
      return <HideoutPage go={go} />;
    case 'combat':
      return <CombatPage />;
    case 'tree':
      return <TreePage />;
    case 'equipment':
      return <EquipmentPage />;
    case 'bench':
      return <BenchPage />;
    case 'stash':
      return <StashPage />;
    case 'vendor':
      return <VendorPage />;
    case 'settings':
      return <SettingsPage />;
    default:
      return <SkillPage key={page} skill={page} />;
  }
}

function GameScreen() {
  const s = useGame();
  const [page, go] = usePage();
  useFlaskHotkeys();
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
    game.visitPage(page);
  }, [page]);
  return (
    <div className={`app ${s.settings.reducedMotion ? 'reduced-motion' : ''}`}>
      <Sidebar page={page} go={go} />
      <TopBar go={go} />
      <main className="main" ref={mainRef}>
        <Content key={page} page={page} go={go} />
      </main>
      <Feed />
      <QuestTracker floating />
      <OfflineModal />
      <IntroModal />
    </div>
  );
}

export function App() {
  useGame();
  return (
    <>
      {game.screen === 'title' && <TitleScreen />}
      {game.screen === 'select' && <CharacterSelect />}
      {game.screen === 'create' && <CharacterCreate />}
      {game.screen === 'game' && <GameScreen />}
      <Toasts />
    </>
  );
}
