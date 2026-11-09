import { useEffect, useRef } from 'react';
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
import { MarketPage } from './pages/MarketPage';
import { TraderPage } from './pages/TraderPage';
import { TreePage } from './pages/TreePage';
import { AccountModal, AccountScreen, CharacterCreate, CharacterSelect, DemoBanner, EventBanner, FallenScreen, IntroModal, NewPasswordModal, TitleScreen } from './screens/Screens';
import { AdminMailNotice } from './components/AdminInbox';
import { PageErrorBoundary } from './components/PageErrorBoundary';
import { AdminPage } from './pages/AdminPage';

// Admin is in the main bundle on purpose. As a separate lazy chunk it went black whenever a release landed while the
// game was open: the old chunk file was gone, and the failed load took the whole app down. It's a few kB.

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
    case 'market':
      return <MarketPage />;
    case 'achievements':
      return <AchievementsPage />;
    case 'settings':
      return <SettingsPage />;
    case 'admin':
      return game.isAdmin ? <AdminPage /> : <SettingsPage />;
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
        <EventBanner />
        {page !== 'settings' && <AdminMailNotice open={() => go('settings')} />}
        <PageErrorBoundary key={page} where={`page:${page}`} onLeave={() => go('hideout')}>
          <Content page={page} go={go} />
        </PageErrorBoundary>
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
      {game.screen === 'menu' && <AccountScreen />}
      {game.screen === 'select' && <CharacterSelect />}
      {game.screen === 'create' && <CharacterCreate />}
      {game.screen === 'game' && <GameScreen />}
      {game.screen === 'fallen' && <FallenScreen />}
      <NewPasswordModal />
      <Toasts />
    </>
  );
}
