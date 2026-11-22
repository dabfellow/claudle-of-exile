import { useEffect, useRef, useState } from 'react';
import { game, useGame } from '../game';
import { PinDock } from './components/common';
import { ItemMenuHost } from './components/ItemMenu';
import { QuestTracker } from './components/QuestTracker';
import { CampaignJournal } from './components/CampaignJournal';
import { Feed, OfflineModal, Sidebar, Toasts, TopBar, useFlaskHotkeys, usePage, XpBar, type Page } from './Layout';
import { AchievementsPage } from './pages/AchievementsPage';
import { CampaignPage } from './pages/CampaignPage';
import { CombatPage } from './pages/CombatPage';
import { SkillGemsPage } from './pages/SkillGemsPage';
import { InventoryPage } from './pages/InventoryPage';
import { GuildStashPage, type GuildStashCategory } from './pages/GuildStashPage';
import { HideoutPage } from './pages/HideoutPage';
import { MapDevicePage } from './pages/MapDevicePage';
import { UpcomingSkillsPage } from './pages/UpcomingSkillsPage';
import { SkillPage } from './pages/SkillPage';
import { FishingPage } from './pages/FishingPage';
import { SettingsPage } from './pages/SettingsPage';
import { MarketPage } from './pages/MarketPage';
import { TraderPage } from './pages/TraderPage';
import { TreePage } from './pages/TreePage';
import { AccountModal, AccountScreen, CharacterCreate, CharacterSelect, DemoBanner, EventBanner, FallenScreen, IntroModal, NewPasswordModal, TitleScreen } from './screens/Screens';
import { AdminMailNotice } from './components/AdminInbox';
import { FellingCards } from './components/FellingCards';
import { PageErrorBoundary } from './components/PageErrorBoundary';
import { AdminPage } from './pages/AdminPage';

// Admin is in the main bundle on purpose. As a separate lazy chunk it went black whenever a release landed while the
// game was open: the old chunk file was gone, and the failed load took the whole app down. It's a few kB.

function Content({ page, go, questMapZone, showQuestOnMap, guildCategory, openGuildStash, focusStash }: {
  page: Page;
  go: (p: Page) => void;
  questMapZone: string | null;
  showQuestOnMap: (zoneId: string) => void;
  guildCategory: GuildStashCategory;
  openGuildStash: (category: GuildStashCategory) => void;
  /** a Stash link was followed: Inventory opens scrolled to the stash */
  focusStash: boolean;
}) {
  switch (page) {
    case 'hideout':
      return <HideoutPage go={go} />;
    case 'combat':
      return <CombatPage go={go} />;
    case 'campaign':
      return <CampaignPage key={game.state.character.id} go={go} initialQuestZone={questMapZone} />;
    case 'quests':
      return <CampaignJournal showRewards onSelectZone={showQuestOnMap} />;
    case 'maps':
      return <MapDevicePage go={go} openGuildMaps={() => openGuildStash('maps')} />;
    case 'upcoming':
      return <UpcomingSkillsPage />;
    case 'skills':
      return <SkillGemsPage />;
    case 'tree':
      return <TreePage />;
    // Stash and the Crafting Bench are part of the Inventory screen now; old links to them land there
    case 'equipment':
    case 'bench':
    case 'stash':
      return <InventoryPage go={go} openGuildStash={openGuildStash} focusStash={focusStash} />;
    case 'guild-stash':
      return <GuildStashPage go={go} initialCategory={guildCategory} />;
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
    case 'fishing':
      return <FishingPage go={go} />;
    default:
      return <SkillPage key={page} skill={page} go={go} />;
  }
}

function GameScreen() {
  const s = useGame();
  const [page, setPage] = usePage();
  const [questMapZone, setQuestMapZone] = useState<string | null>(null);
  const [guildCategory, setGuildCategory] = useState<GuildStashCategory>('gear');
  const [focusStash, setFocusStash] = useState(false);
  // the Stash and Crafting Bench pages became the Inventory screen: send old links there so the sidebar lights up
  const go = (p: Page) => {
    setQuestMapZone(null);
    setFocusStash(p === 'stash');
    setPage(p === 'stash' || p === 'bench' ? 'equipment' : p);
  };
  const openGuildStash = (category: GuildStashCategory) => {
    setGuildCategory(category);
    go('guild-stash');
  };
  const showQuestOnMap = (zoneId: string) => {
    setQuestMapZone(zoneId);
    setPage('campaign');
  };
  useFlaskHotkeys();
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => {
    // On phones the whole shell scrolls, including navigation and vitals.
    mainRef.current?.closest('.app')?.scrollTo({ top: 0 });
    mainRef.current?.parentElement?.scrollTo({ top: 0 });
    mainRef.current?.scrollTo({ top: 0 });
    game.visitPage(page);
  }, [page]);
  // a quest can ask for the page you're already on
  useEffect(() => game.visitPage(page), [s.tutorial.step]);
  return (
    <div className={`app ${page === 'hideout' ? 'hideout-app' : ''} ${s.settings.reducedMotion ? 'reduced-motion' : ''}`}>
      <Sidebar page={page} go={go} />
      <div className="game-content">
        <TopBar go={go} />
        <main className="main" ref={mainRef}>
          <QuestTracker floating />
          <DemoBanner />
          <EventBanner />
          {page !== 'settings' && <AdminMailNotice open={() => go('settings')} />}
          <PageErrorBoundary key={page} where={`page:${page}`} onLeave={() => go('hideout')}>
            <Content page={page} go={go} questMapZone={questMapZone} showQuestOnMap={showQuestOnMap} guildCategory={guildCategory} openGuildStash={openGuildStash} focusStash={focusStash} />
          </PageErrorBoundary>
        </main>
      </div>
      <PageErrorBoundary where="feed">
        <Feed />
      </PageErrorBoundary>
      <XpBar />
      <PinDock />
      <ItemMenuHost />
      <OfflineModal />
      <FellingCards />
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
