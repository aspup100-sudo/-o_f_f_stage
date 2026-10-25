import { useState } from 'react';
import type { Role, Route } from '@/types';
import { useApp, navigate, switchRole, resetDemo, update } from '@/store/store';
import { useMe } from '@/store/hooks';
import { chatUnread, josa } from '@/store/logic';
import { Icon, cx, Sheet, Button, Demo } from '@/components/ui';
import { renderRoute } from '@/screens';
import { startMatchChat } from '@/store/actions';
import { TABS, ROLE_LABEL } from '@/config';

function TopBar() {
  const { db, userId, role } = useMe();
  const unread = db.notifications.filter((n) => n.userId === userId && !n.read).length;
  const rooms = db.chatRooms.filter((r) => r.memberIds.includes(userId)).reduce((n, r) => n + chatUnread(db, r.id, userId), 0);
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-ink-100 h-14 flex items-center px-4">
      <button onClick={() => navigate({ name: 'tab', tab: role === 'admin' ? 'stats' : 'explore' })} className="flex items-center gap-1.5">
        <img src="./logo.png" alt="OFF STAGE 로고" className="w-7 h-7 rounded-lg object-cover" />
        <span className="font-black text-[16px] tracking-tight whitespace-nowrap">OFF STAGE</span>
      </button>
      <div className="flex-1" />
      <SyncDot />
      <RoleSwitcher />
      {role !== 'admin' && (
        <button onClick={() => navigate({ name: 'chatList' })} className="relative w-10 h-10 flex items-center justify-center" aria-label="채팅">
          <Icon name="chat" className="w-6 h-6" />
          {rooms > 0 && <span className="absolute top-1 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-brand-500 text-white text-[10px] font-bold flex items-center justify-center">{rooms}</span>}
        </button>
      )}
      <button onClick={() => navigate({ name: 'notifications' })} className="relative w-10 h-10 flex items-center justify-center" aria-label="알림">
        <Icon name="bell" className="w-6 h-6" />
        {unread > 0 && (
          <span className="absolute top-1 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-brand-500 text-white text-[10px] font-bold flex items-center justify-center">{unread}</span>
        )}
      </button>
    </header>
  );
}

/** 서버 동기화 상태. 서버를 안 쓰면 아무것도 안 보인다. */
function SyncDot() {
  const sync = useApp((s) => s.session.sync);
  if (!sync || sync === 'local') return null;
  const [cls, label] = sync === 'online' ? ['bg-emerald-500', '서버 연결됨'] : sync === 'loading' ? ['bg-amber-400 animate-pulse', '서버에서 불러오는 중'] : ['bg-red-500', '서버 연결 안 됨 · 이 기기에만 저장 중'];
  return <span title={label} aria-label={label} className={cx('w-2 h-2 rounded-full shrink-0 ml-1', cls)} />;
}

function BottomTabs({ current }: { current?: string }) {
  const role = useApp((s) => s.session.role);
  const tabs = TABS[role];
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-30 bg-white border-t border-ink-100 pb-[env(safe-area-inset-bottom)]">
      <div className="flex">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => navigate({ name: 'tab', tab: t.key })} className={cx('flex-1 h-16 flex flex-col items-center justify-center gap-1 text-[11px] font-medium', current === t.key ? 'text-ink-900' : 'text-ink-500')}>
            <Icon name={t.icon} className="w-6 h-6" filled={false} />
            {t.label}
          </button>
        ))}
      </div>
    </nav>
  );
}

function RoleSwitcher() {
  const [open, setOpen] = useState(false);
  const { db, role, userId } = useMe();
  const accounts = (r: Role) => db.users.filter((u) => u.role === r && (r !== 'brand' || db.brands.some((b) => b.userId === u.id)) && (r !== 'landlord' || db.landlords.some((l) => l.userId === u.id)));
  return (
    <>
      <button onClick={() => setOpen(true)} title="역할 전환(데모)" className="h-8 pl-2 pr-2.5 mr-1 ml-2 shrink-0 whitespace-nowrap rounded-full bg-ink-900 text-white text-[11px] font-bold flex items-center gap-1">
        <Icon name="swap" className="w-3.5 h-3.5" />
        {ROLE_LABEL[role]} · 전환(데모)
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={<>역할 전환 <Demo /></>}>
        <p className="text-xs text-ink-500 mb-3">실제 서비스에서는 한 계정이 하나의 역할만 가집니다. 데모에서는 시점을 바로 바꿔 볼 수 있어요.</p>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {(['brand', 'landlord', 'visitor', 'rental', 'admin'] as Role[]).map((r) => (
            <button key={r} onClick={() => { switchRole(r); setOpen(false); }} className={cx('h-14 rounded-xl border text-sm font-bold', role === r ? 'bg-ink-900 text-white border-ink-900' : 'bg-white border-ink-300')}>
              {ROLE_LABEL[r]}
            </button>
          ))}
        </div>
        {(role === 'brand' || role === 'landlord' || role === 'visitor' || role === 'rental') && (
          <>
            <div className="text-[13px] font-semibold mb-2">{ROLE_LABEL[role]} 계정 고르기</div>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {accounts(role).map((u) => (
                <button key={u.id} onClick={() => { switchRole(role, u.id); setOpen(false); }} className={cx('px-3 h-8 rounded-full text-xs border', userId === u.id ? 'bg-brand-500 text-white border-brand-500' : 'bg-white border-ink-300')}>
                  {u.name}
                  {u.verifyStatus === 'pending' && ' (인증 대기)'}
                </button>
              ))}
            </div>
          </>
        )}
        <div className="flex gap-2">
          <Button variant="secondary" full onClick={() => { update((s) => { s.session.stack = [{ name: 'onboarding' }]; s.session.onboarding = { step: 0 }; }); setOpen(false); }}>
            새 계정으로 가입해 보기
          </Button>
          <Button variant="danger" full onClick={() => { resetDemo(); setOpen(false); }}>
            데모 데이터 초기화
          </Button>
        </div>
      </Sheet>
    </>
  );
}

function Toast() {
  const t = useApp((s) => s.session.toast);
  if (!t) return null;
  return (
    <div className="fixed z-[60] top-16 left-1/2 -translate-x-1/2 max-w-[400px] w-[calc(100%-32px)] bg-ink-900 text-white text-sm rounded-xl px-4 py-3 shadow-xl text-center">
      {t.text}
    </div>
  );
}

function VerifyGate() {
  const open = useApp((s) => !!s.session.gate);
  const close = () => update((s) => { s.session.gate = false; });
  return (
    <Sheet open={open} onClose={close} title="사업자 인증이 필요해요">
      <div className="text-sm text-ink-700 leading-relaxed mb-4">
        모집·제안·지원·채팅은 사업자 인증을 마친 브랜드와 임대인만 이용할 수 있어요. 인증 전에는 둘러보기만 가능합니다.
        <br />
        인증은 보통 하루 안에 완료돼요.
      </div>
      <Button full onClick={() => { close(); navigate({ name: 'tab', tab: 'me' }); }}>
        내 정보에서 인증 상태 보기
      </Button>
    </Sheet>
  );
}

function MatchModal() {
  const { db, brand } = useMe();
  const target = useApp((s) => s.session.match);
  const t = db.brands.find((b) => b.id === target);
  const close = () => update((s) => { s.session.match = undefined; });
  if (!t || !brand) return null;
  return (
    <Sheet open onClose={close} title="서로 관심을 표시했어요 💛">
      <div className="flex items-center justify-center gap-3 py-4">
        <span className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl" style={{ background: `hsl(${brand.logoHue} 45% 55%)` }}>{brand.name[0]}</span>
        <span className="text-2xl text-rose-500">♥</span>
        <span className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl" style={{ background: `hsl(${t.logoHue} 45% 55%)` }}>{t.name[0]}</span>
      </div>
      <p className="text-center text-sm text-ink-700 mb-5">{josa(brand.name, '과', '와')} {josa(t.name, '이', '가')} 서로에게 관심을 눌렀어요. 먼저 인사해 볼까요?</p>
      <div className="flex gap-2">
        <Button variant="secondary" full onClick={close}>나중에</Button>
        <Button full onClick={() => startMatchChat(brand.id, t.id)}>채팅 시작하기</Button>
      </div>
    </Sheet>
  );
}

export default function App() {
  const stack = useApp((s) => s.session.stack);
  const route: Route = stack[stack.length - 1] ?? { name: 'tab', tab: 'explore' };
  const isTab = route.name === 'tab';
  const isOnboarding = route.name === 'onboarding';
  return (
    <div className="min-h-screen flex justify-center">
      <div className="relative w-full max-w-[430px] min-h-screen bg-ink-100/60 bg-[#fafaf9] shadow-xl">
        {isTab && <TopBar />}
        <main className={cx((isTab || !isOnboarding) && 'main-safe')}>{renderRoute(route)}</main>
        {isTab && <BottomTabs current={route.name === 'tab' ? route.tab : undefined} />}
        <Toast />
        <VerifyGate />
        <MatchModal />
      </div>
    </div>
  );
}
