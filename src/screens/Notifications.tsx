import { RENTAL_ON } from '@/config';
import { useState } from 'react';
import { useMe } from '@/store/hooks';
import { markAllRead, openNotification, setMuted } from '@/store/actions';
import { Button, cx, Empty, Sheet, SubHeader, Icon } from '@/components/ui';
import type { NotificationType } from '@/types';

const ICON: Record<NotificationType, string> = {
  proposal: 'mail', interest_match: 'heart', application_result: 'inbox', agreement_request: 'pencil', completion_request: 'check',
  follow_popup: 'bag', space_application: 'building', rental: 'box', new_recruit: 'megaphone', system: 'bell',
};

export function ago(iso: string) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return '방금';
  if (min < 60) return `${min}분 전`;
  if (min < 60 * 24) return `${Math.round(min / 60)}시간 전`;
  if (min < 60 * 24 * 7) return `${Math.round(min / 1440)}일 전`;
  return iso.slice(5, 10).replace('-', '/');
}

const GROUPS: { label: string; desc: string; types: NotificationType[] }[] = [
  { label: '제안·관심', desc: '같이 해요 제안, 서로 관심 표시', types: ['proposal', 'interest_match'] },
  { label: '새 모집글', desc: '알림 켠 지역에 올라온 모집글', types: ['new_recruit'] },
  { label: '팀·지원', desc: '모집 지원 결과, 약속서, 공간 지원, 성사 확인', types: ['application_result', 'agreement_request', 'space_application', 'completion_request'] },
  { label: '팝업 소식', desc: '팔로우한 브랜드와 관심 동네의 새 팝업', types: ['follow_popup'] },
  ...(RENTAL_ON ? [{ label: '장비 렌탈', desc: '렌탈 요청과 확정', types: ['rental'] as NotificationType[] }] : []),
];

function NotiSettings({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, userId } = useMe();
  const muted = user?.mutedTypes ?? [];
  return (
    <Sheet open={open} onClose={onClose} title="알림 설정">
      <div className="divide-y divide-ink-100">
        {GROUPS.map((g) => {
          const on = !g.types.every((t) => muted.includes(t));
          return (
            <div key={g.label} className="flex items-center gap-3 py-3">
              <div className="flex-1">
                <div className="text-sm font-semibold">{g.label}</div>
                <div className="text-[12px] text-ink-500">{g.desc}</div>
              </div>
              <button role="switch" aria-checked={on} aria-label={g.label} onClick={() => setMuted(userId, g.types, on)} className={cx('w-12 h-7 rounded-full p-0.5 transition-colors', on ? 'bg-brand-500' : 'bg-ink-300')}>
                <span className={cx('block w-6 h-6 rounded-full bg-white shadow transition-transform', on && 'translate-x-5')} />
              </button>
            </div>
          );
        })}
      </div>
      <p className="text-[12px] text-ink-500 mt-2">운영 공지와 신고 처리 결과는 끌 수 없어요.</p>
    </Sheet>
  );
}

export function NotificationsScreen() {
  const { db, userId } = useMe();
  const [settings, setSettings] = useState(false);
  const list = db.notifications.filter((n) => n.userId === userId);
  const unread = list.filter((n) => !n.read).length;
  return (
    <div className="bg-white min-h-screen">
      <SubHeader
        title="알림"
        right={
          <div className="flex items-center gap-1">
            {unread > 0 && <Button size="sm" variant="ghost" onClick={() => markAllRead(userId)}>모두 읽음</Button>}
            <Button size="sm" variant="ghost" onClick={() => setSettings(true)}>설정</Button>
          </div>
        }
      />
      <NotiSettings open={settings} onClose={() => setSettings(false)} />
      {list.length === 0 && <Empty icon="bell">새 알림이 없어요</Empty>}
      {[{ title: '새 알림', items: list.filter((n) => !n.read) }, { title: '지난 알림', items: list.filter((n) => n.read) }].map((g) =>
        g.items.length ? (
          <section key={g.title}>
            <div className="px-4 pt-4 pb-1.5 text-[13px] font-bold text-ink-500">{g.title}</div>
            <div className="divide-y divide-ink-100">
              {g.items.map((n) => (
                <button key={n.id} onClick={() => openNotification(n.id)} className={cx('w-full text-left flex gap-3 px-4 py-3.5', !n.read && 'bg-brand-50/60')}>
                  <span className="w-9 h-9 rounded-full bg-ink-100 text-ink-700 flex items-center justify-center shrink-0"><Icon name={ICON[n.type]} className="w-[18px] h-[18px]" /></span>
                  <span className="flex-1">
                    <span className={cx('block text-sm', !n.read && 'font-semibold')}>{n.text}</span>
                    <span className="block text-[12px] text-ink-500 mt-0.5">{ago(n.at)}</span>
                  </span>
                  {!n.read && <span className="w-2 h-2 rounded-full bg-brand-500 mt-1.5" />}
                </button>
              ))}
            </div>
          </section>
        ) : null,
      )}
    </div>
  );
}
