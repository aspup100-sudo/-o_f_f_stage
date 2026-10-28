// 데모용 역할 전환. 내 정보 화면 맨 위에 두고, 관리자 화면에서만 상단에 둔다.
import { useState } from 'react';
import type { Role } from '@/types';
import { switchRole, resetDemo, update } from '@/store/store';
import { useMe } from '@/store/hooks';
import { Icon, cx, Sheet, Button, Demo } from '@/components/ui';
import { ROLE_LABEL, roleOn } from '@/config';

export function RoleSwitcher({ row }: { row?: boolean }) {
  const [open, setOpen] = useState(false);
  const { db, role, userId } = useMe();
  const accounts = (r: Role) => db.users.filter((u) => u.role === r && (r !== 'brand' || db.brands.some((b) => b.userId === u.id)) && (r !== 'landlord' || db.landlords.some((l) => l.userId === u.id)));
  return (
    <>
      {row ? (
        <button onClick={() => setOpen(true)} title="역할 전환(데모)" className="w-full flex items-center justify-between border-b border-ink-200 py-3 text-left">
          <span className="text-[14px] font-bold">지금 {ROLE_LABEL[role]}로 보는 중 <Demo /></span>
          <span className="text-[13px] font-semibold text-ink-700 flex items-center gap-1"><Icon name="swap" className="w-3.5 h-3.5" />역할 바꾸기</span>
        </button>
      ) : (
      <button onClick={() => setOpen(true)} title="역할 전환(데모)" className="h-8 pl-2 pr-2.5 mr-0.5 ml-2 shrink-0 whitespace-nowrap rounded border border-ink-300 text-ink-700 text-[11px] font-semibold flex items-center gap-1">
        <Icon name="swap" className="w-3.5 h-3.5" />
        {ROLE_LABEL[role]} 전환
      </button>
      )}
      <Sheet open={open} onClose={() => setOpen(false)} title={<>역할 전환 <Demo /></>}>
        <p className="text-xs text-ink-500 mb-3">실제 서비스에서는 한 계정이 하나의 역할만 가집니다. 데모에서는 시점을 바로 바꿔 볼 수 있어요.</p>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {(['brand', 'landlord', 'visitor', 'rental', 'admin'] as Role[]).filter(roleOn).map((r) => (
            <button key={r} onClick={() => { switchRole(r); setOpen(false); }} className={cx('h-14 rounded border text-sm font-bold', role === r ? 'bg-ink-900 text-white border-ink-900' : 'bg-white border-ink-300')}>
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

