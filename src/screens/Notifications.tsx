import { useMe } from '@/store/hooks';
import { markAllRead, openNotification } from '@/store/actions';
import { Button, cx, Empty, SubHeader } from '@/components/ui';
import type { NotificationType } from '@/types';

const ICON: Record<NotificationType, string> = {
  proposal: '✉️', interest_match: '💛', application_result: '📮', agreement_request: '📝', completion_request: '🤝',
  follow_popup: '🛍️', space_application: '🏠', rental: '📦', system: '🔔',
};

function ago(iso: string) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return '방금';
  if (min < 60) return `${min}분 전`;
  if (min < 60 * 24) return `${Math.round(min / 60)}시간 전`;
  if (min < 60 * 24 * 7) return `${Math.round(min / 1440)}일 전`;
  return iso.slice(5, 10).replace('-', '/');
}

export function NotificationsScreen() {
  const { db, userId } = useMe();
  const list = db.notifications.filter((n) => n.userId === userId);
  const unread = list.filter((n) => !n.read).length;
  return (
    <div className="bg-white min-h-screen">
      <SubHeader title="알림" right={unread > 0 && <Button size="sm" variant="ghost" onClick={() => markAllRead(userId)}>모두 읽음</Button>} />
      {list.length === 0 && <Empty icon="bell">새 알림이 없어요</Empty>}
      <div className="divide-y divide-ink-100">
        {list.map((n) => (
          <button key={n.id} onClick={() => openNotification(n.id)} className={cx('w-full text-left flex gap-3 px-4 py-3.5', !n.read && 'bg-brand-50/60')}>
            <span className="text-xl">{ICON[n.type]}</span>
            <span className="flex-1">
              <span className={cx('block text-sm', !n.read && 'font-semibold')}>{n.text}</span>
              <span className="block text-[11px] text-ink-500 mt-0.5">{ago(n.at)}</span>
            </span>
            {!n.read && <span className="w-2 h-2 rounded-full bg-brand-500 mt-1.5" />}
          </button>
        ))}
      </div>
    </div>
  );
}
