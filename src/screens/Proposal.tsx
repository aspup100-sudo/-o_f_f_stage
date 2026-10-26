import { useState } from 'react';
import { useMe } from '@/store/hooks';
import { back, navigate } from '@/store/store';
import { respondProposal, sendProposal } from '@/store/actions';
import { brandById, manwon, matchPct, matchScore } from '@/store/logic';
import { BrandCard, BrandLogo, TrustLine } from '@/components/common';
import { Button, Card, Chip, Demo, Empty, Field, inputCls, Segmented, StatusPill, SubHeader, Tag, textareaCls, Ic } from '@/components/ui';
import { REGIONS, type Region } from '@/types';

const PERIODS = ['2026년 11월 중', '2026년 12월 중', '2027년 1월 중', '2027년 봄', '일정 협의'];

export function ProposeScreen({ toBrandId }: { toBrandId: string }) {
  const { db, brand } = useMe();
  const to = brandById(db, toBrandId);
  const [period, setPeriod] = useState(PERIODS[1]);
  const [region, setRegion] = useState<Region | '상관없음'>('상관없음');
  const [budget, setBudget] = useState(70);
  const [size, setSize] = useState(3);
  const [reason, setReason] = useState('');
  if (!to || !brand) return <Empty>잘못된 접근이에요</Empty>;
  return (
    <div className="bg-white min-h-screen">
      <SubHeader title="같이 해요 제안서" />
      <div className="p-4">
        <p className="text-sm text-ink-500 mb-3">그냥 DM이 아니라 제안서로 보내요. 받은 쪽이 "관심 있어요"를 누르면 채팅방이 열려요.</p>
        <div className="mb-5">
          <BrandCard db={db} brand={to} />
        </div>
        <Field label="희망 시기" required>
          <div className="flex flex-wrap gap-1.5">
            {PERIODS.map((p) => <Chip key={p} active={period === p} onClick={() => setPeriod(p)}>{p}</Chip>)}
          </div>
        </Field>
        <Field label="희망 지역" required>
          <div className="flex flex-wrap gap-1.5">
            {(['상관없음', ...REGIONS] as const).map((r) => <Chip key={r} active={region === r} onClick={() => setRegion(r)}>{r}</Chip>)}
          </div>
        </Field>
        <Field label="예상 예산 (1인 분담 기준)" hint={`= ${manwon(budget * 10000)} / 브랜드`}>
          <div className="flex items-center gap-2">
            <input type="number" className={inputCls} value={budget} min={0} step={10} onChange={(e) => setBudget(Number(e.target.value))} />
            <span className="text-sm shrink-0">만원</span>
          </div>
        </Field>
        <Field label="원하는 팀 규모">
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={() => setSize(Math.max(2, size - 1))}>−</Button>
            <span className="font-bold text-lg w-16 text-center">{size}팀</span>
            <Button variant="secondary" onClick={() => setSize(Math.min(8, size + 1))}>+</Button>
          </div>
        </Field>
        <Field label="함께하고 싶은 이유" required hint={`${reason.length}/200`}>
          <textarea className={textareaCls} maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={`${to.name}의 어떤 점이 우리 브랜드와 잘 어울리나요?`} />
        </Field>
        <Button full size="lg" disabled={!reason.trim()} onClick={() => { sendProposal({ fromBrandId: brand.id, toBrandId: to.id, period, region, budgetPerBrand: budget * 10000, teamSize: size, reason }); back(); }}>
          제안서 보내기
        </Button>
      </div>
    </div>
  );
}

export function ProposalsScreen() {
  const { db, brand } = useMe();
  const [tab, setTab] = useState<'recv' | 'sent'>('recv');
  if (!brand) return <Empty>브랜드 계정에서 볼 수 있어요</Empty>;
  const list = db.proposals.filter((p) => (tab === 'recv' ? p.toBrandId === brand.id : p.fromBrandId === brand.id));
  return (
    <div>
      <SubHeader title="제안함" />
      <div className="p-4">
        <Segmented items={[{ key: 'recv', label: '받은 제안' }, { key: 'sent', label: '보낸 제안' }]} value={tab} onChange={setTab} />
        <div className="space-y-3 mt-4">
          {list.length === 0 && <Empty>아직 제안이 없어요</Empty>}
          {list.map((p) => {
            const other = brandById(db, tab === 'recv' ? p.fromBrandId : p.toBrandId)!;
            return (
              <Card key={p.id} className="p-4">
                <div className="flex items-center gap-2.5">
                  <BrandLogo brand={other} size={40} />
                  <button className="flex-1 min-w-0 text-left" onClick={() => navigate({ name: 'brand', id: other.id })}>
                    <div className="font-bold truncate">{tab === 'recv' ? `${other.name}의 제안` : `${other.name}에게`} <span className="text-ink-400 font-normal">›</span></div>
                    <TrustLine db={db} subjectId={other.id} compact />
                  </button>
                  <StatusPill status={p.status === 'sent' ? 'pending' : p.status === 'accepted' ? 'accepted' : 'rejected'} />
                </div>
                {brand && (() => {
                  const m = matchScore(db, brand, other);
                  const pct = matchPct(m.score);
                  return <div className="mt-2 text-[12px] text-brand-700 border-l-2 border-brand-500 px-2.5 py-1.5">궁합 {pct}%{m.reasons[0] ? ` · ${m.reasons[0]}` : ''}</div>;
                })()}
                <div className="text-[13px] text-ink-700 mt-2.5">
                  {p.period} · {p.region} · {p.teamSize}개 브랜드 · <b className="text-ink-900">1곳당 {manwon(p.budgetPerBrand)}</b>
                </div>
                <p className="text-sm text-ink-700 mt-2 leading-relaxed">"{p.reason}"</p>
                {p.status === 'sent' && tab === 'recv' && (
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <Button variant="secondary" onClick={() => respondProposal(p.id, false)}>다음에요</Button>
                    <Button onClick={() => respondProposal(p.id, true)}>관심 있어요</Button>
                  </div>
                )}
                {p.status === 'sent' && tab === 'sent' && (
                  <Button variant="secondary" size="sm" className="mt-3" onClick={() => respondProposal(p.id, true)}>
                    상대가 "관심 있어요" 누르기 <Demo />
                  </Button>
                )}
                {p.status === 'accepted' && p.chatRoomId && (
                  <Button variant="dark" size="sm" className="mt-3" onClick={() => navigate({ name: 'chat', id: p.chatRoomId! })}>채팅방 열기</Button>
                )}
                {p.status === 'declined' && <p className="text-xs text-ink-500 mt-2">정중한 거절 메시지가 자동으로 전달됐어요.</p>}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

