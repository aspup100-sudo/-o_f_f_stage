import { useMe } from '@/store/hooks';
import { markAllRead, openNotification } from '@/store/actions';
import { Button, cx, Empty, SubHeader } from '@/components/ui';
import type { NotificationType } from '@/types';

const ICON: Record<NotificationType, string> = {
  proposal: '✉️', interest_match: '💛', application_result: '📮', agreement_request: '📝', completion_request: '🤝',
  follow_popup: '🛍️', space_application: '🏠', system: '🔔',
};

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
              <span className="block text-[11px] text-ink-500 mt-0.5">{n.at.replace('T', ' ').slice(0, 16)}</span>
            </span>
            {!n.read && <span className="w-2 h-2 rounded-full bg-brand-500 mt-1.5" />}
          </button>
        ))}
      </div>
    </div>
  );
}
