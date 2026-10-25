import type { ReactNode } from 'react';
import type { Route } from '@/types';
import { Empty } from '@/components/ui';
import Explore from './Explore';
import Onboarding from './Onboarding';
import BrandProfileScreen from './BrandProfile';
import MeScreen from './Me';
import { ProposeScreen, ProposalsScreen } from './Proposal';
import { ChatListScreen, ChatScreen } from './Chat';
import { RecruitsTab, RecruitDetail, RecruitNew } from './Recruit';
import { MyTeamTab, TeamScreen } from './Team';
import { SpacesTab, SpaceDetail } from './Space';
import { MySpacesTab, SpaceEdit, InboxTab } from './SpaceLandlord';
import { PopupDetail, MapTab, StampsTab } from './Popup';
import { NotificationsScreen } from './Notifications';
import { ShowcaseDetail, ShowcaseNew } from './Showcase';
import { QnaDetail, QnaNew } from './Qna';
import { StatsTab, VerifyTab, ReportsTab } from './Admin';
import { MagazineAdminTab, MagazineDetail, MagazineNew } from './Magazine';
import { MyItemsTab, OrdersTab, RentalItemEdit, RentalPartnerScreen, RentalsScreen } from './Rental';

function renderTab(tab: string, filter?: string): ReactNode {
  switch (tab) {
    case 'explore': return <Explore />;
    case 'me': return <MeScreen />;
    case 'recruits': return <RecruitsTab key={filter} initial={filter === '찜' ? '찜' : undefined} />;
    case 'myteam': return <MyTeamTab />;
    case 'spaces': return <SpacesTab key={filter} initial={filter === '찜' ? '찜' : undefined} />;
    case 'myspaces': return <MySpacesTab />;
    case 'inbox': return <InboxTab key={filter} initial={filter === 'offer' ? 'offer' : undefined} />;
    case 'map': return <MapTab />;
    case 'stats': return <StatsTab />;
    case 'verify': return <VerifyTab />;
    case 'reports': return <ReportsTab />;
    case 'stamps': return <StampsTab />;
    case 'myitems': return <MyItemsTab />;
    case 'magazineAdmin': return <MagazineAdminTab />;
    case 'orders': return <OrdersTab />;
    default:
      return <Empty>화면을 찾을 수 없어요</Empty>;
  }
}

export function renderRoute(route: Route): ReactNode {
  switch (route.name) {
    case 'tab': return renderTab(route.tab, route.filter);
    case 'onboarding': return <Onboarding />;
    case 'brand': return <BrandProfileScreen key={route.id} id={route.id} />;
    case 'propose': return <ProposeScreen toBrandId={route.toBrandId} />;
    case 'proposals': return <ProposalsScreen />;
    case 'chatList': return <ChatListScreen />;
    case 'chat': return <ChatScreen key={route.id} id={route.id} />;
    case 'recruit': return <RecruitDetail key={route.id} id={route.id} />;
    case 'recruitNew': return <RecruitNew />;
    case 'space': return <SpaceDetail key={route.id} id={route.id} />;
    case 'spaceEdit': return <SpaceEdit key={route.id ?? 'new'} id={route.id} />;
    case 'popup': return <PopupDetail key={route.id} id={route.id} />;
    case 'notifications': return <NotificationsScreen />;
    case 'showcase': return <ShowcaseDetail key={route.id} id={route.id} />;
    case 'showcaseNew': return <ShowcaseNew teamId={route.teamId} />;
    case 'qna': return <QnaDetail key={route.id} id={route.id} />;
    case 'qnaNew': return <QnaNew />;
    case 'magazine': return <MagazineDetail key={route.id} id={route.id} />;
    case 'magazineNew': return <MagazineNew />;
    case 'rentals': return <RentalsScreen teamId={route.teamId} />;
    case 'rentalPartner': return <RentalPartnerScreen key={route.id} id={route.id} teamId={route.teamId} />;
    case 'rentalItemEdit': return <RentalItemEdit key={route.id ?? 'new'} id={route.id} />;
    case 'team': return <TeamScreen key={route.id} id={route.id} sub={route.sub} />;
    default:
      return <Empty>화면을 찾을 수 없어요</Empty>;
  }
}
