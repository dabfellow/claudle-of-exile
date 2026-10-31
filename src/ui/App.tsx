import { lazy, Suspense, useEffect, useRef } from 'react';
import { game, useGame } from '../game';
import { PinDock } from './components/common';
import { ItemMenuHost } from './components/ItemMenu';
import { QuestTracker } from './components/QuestTracker';
import { Feed, OfflineModal, Sidebar, Toasts, TopBar, useFlaskHotkeys, usePage, XpBar, type Page } from './Layout';
import { AchievementsPage } from './pages/AchievementsPage';
import { BenchPage } from './pages/BenchPage';
import { CampaignPage } from './pages/CampaignPage';
import { CombatPage } from './pages/CombatPage';
import { SkillGemsPage } from './pages/SkillGemsPage';
import { EquipmentPage } from './pages/EquipmentPage';
import { HideoutPage } from './pages/HideoutPage';
import { MapDevicePage } from './pages/MapDevicePage';
import { UpcomingSkillsPage } from './pages/UpcomingSkillsPage';
import { SkillPage } from './pages/SkillPage';
import { SettingsPage } from './pages/SettingsPage';
import { StashPage } from './pages/StashPage';
import { TraderPage } from './pages/TraderPage';
import { TreePage } from './pages/TreePage';
import { AccountModal, CharacterCreate, CharacterSelect, DemoBanner, IntroModal, NewPasswordModal, TitleScreen } from './screens/Screens';

// admins only: kept out of the main bundle
const AdminPage = lazy(() => import('./pages/AdminPage').then((m) => ({ default: m.AdminPage })));

function Content({ page, go }: { page: Page; go: (p: Page) => void }) {
  switch (page) {
    case 'hideout':
      return <HideoutPage go={go} />;
    case 'combat':
      return <CombatPage go={go} />;
    case 'campaign':
      return <CampaignPage go={go} />;
    case 'maps':
      return <MapDevicePage go={go} />;
    case 'upcoming':
      return <UpcomingSkillsPage />;
    case 'skills':
      return <SkillGemsPage />;
    case 'tree':
      return <TreePage />;
    case 'equipment':
      return <EquipmentPage />;
    case 'bench':
      return <BenchPage />;
    case 'stash':
      return <StashPage go={go} />;
    case 'vendor':
      return <TraderPage />;
    case 'achievements':
      return <AchievementsPage />;
    case 'settings':
      return <SettingsPage />;
    case 'admin':
      return game.isAdmin ? (
        <Suspense fallback={<p className="dim">Loading…</p>}>
          <AdminPage />
        </Suspense>
      ) : (
        <SettingsPage />
      );
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
  // a quest can ask for the page you're already on
  useEffect(() => game.visitPage(page), [s.tutorial.step]);
  return (
    <div className={`app ${s.settings.reducedMotion ? 'reduced-motion' : ''}`}>
      <Sidebar page={page} go={go} />
      <TopBar go={go} />
      <main className="main" ref={mainRef}>
        <DemoBanner />
        <Content key={page} page={page} go={go} />
      </main>
      <Feed />
      <XpBar />
      <PinDock />
      <ItemMenuHost />
      <QuestTracker floating />
      <OfflineModal />
      <IntroModal />
      <AccountModal />
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
      <NewPasswordModal />
      <Toasts />
    </>
  );
}
