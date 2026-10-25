import { useState } from 'react';
import { useMe } from '@/store/hooks';
import { submitReport } from '@/store/actions';
import { Button, Chip, Icon, Sheet, textareaCls } from '@/components/ui';
import { REPORT_REASONS, type Report, type ReportReason } from '@/types';

/** 프로필·게시글·리뷰·채팅 어디서나 쓰는 신고 버튼 */
export function ReportButton({ targetType, targetId, targetLabel, small }: { targetType: Report['targetType']; targetId: string; targetLabel: string; small?: boolean }) {
  const { userId, role } = useMe();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [detail, setDetail] = useState('');
  if (role === 'admin') return null;
  return (
    <>
      {small ? (
        <button onClick={() => setOpen(true)} className="text-[12px] text-ink-500">신고</button>
      ) : (
        <button onClick={() => setOpen(true)} className="w-10 h-10 flex items-center justify-center text-ink-500" aria-label="신고">
          <Icon name="flag" />
        </button>
      )}
      <Sheet open={open} onClose={() => setOpen(false)} title="신고하기">
        <p className="text-xs text-ink-500 mb-3">{targetLabel}</p>
        <div className="text-[13px] font-semibold mb-2">사유</div>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {REPORT_REASONS.map((r) => <Chip key={r} active={reason === r} onClick={() => setReason(r)}>{r}</Chip>)}
        </div>
        <textarea className={textareaCls} placeholder="자세한 내용 (선택)" value={detail} onChange={(e) => setDetail(e.target.value)} />
        <Button full className="mt-4" disabled={!reason} onClick={() => { submitReport({ reporterId: userId, targetType, targetId, targetLabel, reason: reason!, detail }); setOpen(false); setReason(null); setDetail(''); }}>
          신고 접수
        </Button>
        <p className="text-[12px] text-ink-500 mt-2 text-center">신고 내용은 운영팀만 볼 수 있어요.</p>
      </Sheet>
    </>
  );
}
