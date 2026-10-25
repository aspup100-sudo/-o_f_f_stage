import { useState } from 'react';
import { useMe } from '@/store/hooks';
import { navigate, replace, toast } from '@/store/store';
import {
  addCommonItem, agreeAgreement, remindPayment, autoFillShifts, cycleShift, fillAgreementExamples, removeCommonItem, renameTeam, setMemberHangers, setMemberRole,
  setMoodHeadline, simulateOthersAgree, toggleMoodPick, togglePaid, togglePromo, updateAgreementItem, updateCost,
} from '@/store/actions';
import { brandById, daysUntil, dday, manwon, md, period, spaceById, teamById, teamCost, teamPrep, teamsOfBrand, won } from '@/store/logic';
import { ProgressBar } from './Today';
import { BrandLogo, LookbookGrid, ScreenTitle, ThemeTagList, TrustLine } from '@/components/common';
import { Button, Card, cx, Demo, Empty, Icon, inputCls, Segmented, Sheet, StatusPill, SubHeader, Swatch, Tabs, Tag, textareaCls } from '@/components/ui';
import { AGREEMENT_ITEMS, type AgreementKey, type Team } from '@/types';
import type { DB } from '@/data/mock';
import { TeamSpaceTab } from './TeamSpaceApply';
import { TeamWrapUp } from './Completion';
import { TeamRentalTab } from './Rental';

export function MyTeamTab() {
  const { db, brand } = useMe();
  if (!brand) return <Empty>브랜드 계정에서 볼 수 있어요</Empty>;
  const teams = teamsOfBrand(db, brand.id);
  const order = { '운영 중': 0, '준비 중': 1, 종료: 2 } as const;
  return (
    <div>
      <ScreenTitle>내 팀</ScreenTitle>
      <div className="px-4 space-y-3">
        {teams.length === 0 && (
          <Empty icon="team">
            아직 팀이 없어요.
            <Button size="sm" className="mt-2" onClick={() => navigate({ name: 'tab', tab: 'recruits' })}>같이 열기에서 팀 찾기</Button>
          </Empty>
        )}
        {[...teams].sort((a, b) => order[a.stage] - order[b.stage]).map((t) => {
          const ag = db.agreements.find((a) => a.teamId === t.id);
          const sp = spaceById(db, t.spaceId);
          const prep = teamPrep(db, t, brand.id);
          return (
            <Card key={t.id} className="p-4" onClick={() => navigate({ name: 'team', id: t.id })}>
              <div className="flex items-center gap-1.5">
                {t.stage === '준비 중' && <span className="text-[11px] font-black text-white bg-brand-500 px-2 py-0.5 rounded-full">{dday(t.period.start)}</span>}
                <StatusPill status={t.stage} />
                {t.confirmed ? <Tag tone="green">팀 확정</Tag> : <Tag tone="yellow">약속서 {ag?.agreedBy.length ?? 0}/{t.members.length} 동의</Tag>}
                {t.leaderBrandId === brand.id && <Tag>내가 팀장</Tag>}
              </div>
              <div className="font-bold text-lg mt-1.5">{t.name}</div>
              <div className="text-[13px] text-ink-500">📅 {period(t.period)} · 📍 {sp?.name ?? `${t.region} · 공간 미정`}</div>
              <div className="flex items-center gap-3 mt-3">
                <div className="flex -space-x-2">
                  {t.members.map((m) => {
                    const b = brandById(db, m.brandId)!;
                    return <span key={m.brandId} className="ring-2 ring-white rounded-full"><BrandLogo brand={b} size={32} /></span>;
                  })}
                </div>
                {t.stage === '준비 중' && (
                  <div className="flex-1">
                    <div className="flex justify-between text-[11px] text-ink-500 mb-1"><span>오픈 준비</span><span className="font-bold text-ink-900">{prep.done}/{prep.steps.length}</span></div>
                    <ProgressBar pct={prep.pct} />
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

const SUBS = [
  { key: 'members', label: '멤버' },
  { key: 'agreement', label: '약속서' },
  { key: 'cost', label: '분담금' },
  { key: 'moodboard', label: '무드보드' },
  { key: 'space', label: '공간 지원' },
  { key: 'rental', label: '렌탈' },
  { key: 'shift', label: '근무표' },
  { key: 'promo', label: '홍보 키트' },
  { key: 'wrap', label: '마무리' },
];

export function TeamScreen({ id, sub = 'members' }: { id: string; sub?: string }) {
  const { db, brand, role } = useMe();
  const team = teamById(db, id);
  const [renaming, setRenaming] = useState(false);
  const [prepOpen, setPrepOpen] = useState(false);
  const [name, setName] = useState('');
  if (!team) return <Empty>팀을 찾을 수 없어요</Empty>;
  const isMember = !!brand && team.members.some((m) => m.brandId === brand.id);
  const isLeader = brand?.id === team.leaderBrandId;
  const ag = db.agreements.find((a) => a.teamId === team.id)!;
  const sp = spaceById(db, team.spaceId);
  const room = db.chatRooms.find((r) => r.context?.type === 'team' && r.context.refId === team.id);

  if (!isMember) {
    return (
      <div className="bg-white min-h-screen">
        <SubHeader title={team.name} />
        <TeamIntroPage db={db} team={team} />
        {role !== 'brand' && <p className="text-center text-xs text-ink-500 pb-6">팀 공간 세부 내용은 팀원만 볼 수 있어요.</p>}
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      <SubHeader
        title={team.name}
        right={room && (
          <button onClick={() => navigate({ name: 'chat', id: room.id })} className="w-10 h-10 flex items-center justify-center" aria-label="팀 채팅">
            <Icon name="chat" />
          </button>
        )}
      />
      <div className="px-4 pt-3 pb-3 bg-gradient-to-b from-brand-50 to-white">
        <div className="flex items-center gap-1.5">
          <StatusPill status={team.stage} />
          {team.confirmed ? <Tag tone="green">팀 확정</Tag> : <Tag tone="yellow">약속서 {ag.agreedBy.length}/{team.members.length} 동의</Tag>}
          <Tag>{team.round}회차</Tag>
        </div>
        <div className="flex items-center gap-2 mt-1.5">
          <h1 className="text-xl font-extrabold">{team.name}</h1>
          {isLeader && <button onClick={() => { setName(team.name); setRenaming(true); }} className="text-ink-500"><Icon name="edit" className="w-4 h-4" /></button>}
        </div>
        <div className="text-[13px] text-ink-700 mt-0.5">📅 {period(team.period)} · 📍 {sp ? sp.name : `${team.region} · 공간 미정`}</div>
        {team.stage === '준비 중' && (() => {
          const prep = teamPrep(db, team, brand!.id);
          return (
            <button onClick={() => setPrepOpen(true)} className="w-full mt-3 rounded-2xl bg-white border border-brand-100 px-3.5 py-3 text-left">
              <div className="flex items-center justify-between text-[13px]">
                <span className="font-bold">오픈 {dday(team.period.start)} · 준비 {prep.done}/{prep.steps.length}</span>
                <span className="text-brand-600 text-[12px] font-semibold">체크리스트 ›</span>
              </div>
              <ProgressBar pct={prep.pct} className="mt-2" />
            </button>
          );
        })()}
      </div>
      <Tabs className="sticky top-12 z-10" items={SUBS} value={sub} onChange={(k) => replace({ name: 'team', id, sub: k })} />
      <div className="p-4 pb-10">
        {sub === 'members' && <MembersTab team={team} isLeader={isLeader} />}
        {sub === 'agreement' && <AgreementTab team={team} myBrandId={brand!.id} />}
        {sub === 'cost' && <CostTab team={team} myBrandId={brand!.id} isLeader={isLeader} />}
        {sub === 'moodboard' && <MoodboardTab team={team} myBrandId={brand!.id} />}
        {sub === 'space' && <TeamSpaceTab team={team} />}
        {sub === 'rental' && <TeamRentalTab team={team} />}
        {sub === 'shift' && <ShiftTab team={team} />}
        {sub === 'promo' && <PromoTab team={team} myBrandId={brand!.id} />}
        {sub === 'wrap' && <TeamWrapUp team={team} />}
      </div>
      <Sheet open={prepOpen} onClose={() => setPrepOpen(false)} title="오픈 준비 체크리스트">
        <div className="divide-y divide-ink-100">
          {teamPrep(db, team, brand!.id).steps.map((x) => (
            <button key={x.key} onClick={() => { setPrepOpen(false); replace({ name: 'team', id, sub: x.sub }); }} className="w-full flex items-center gap-3 py-3 text-left">
              <span className={cx('w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-black shrink-0', x.done ? 'bg-emerald-500 text-white' : 'border-2 border-ink-300')}>{x.done ? '✓' : ''}</span>
              <span className={cx('flex-1 text-[14px]', x.done ? 'text-ink-500 line-through' : 'font-semibold')}>{x.label}</span>
              {!x.done && x.mine && <Tag tone="orange">내 차례</Tag>}
            </button>
          ))}
        </div>
        <p className="text-[12px] text-ink-500 mt-3">항목을 누르면 해당 탭으로 이동해요.</p>
      </Sheet>
      <Sheet open={renaming} onClose={() => setRenaming(false)} title="팀 이름 바꾸기">
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
        <Button full className="mt-3" disabled={!name.trim()} onClick={() => { renameTeam(team.id, name.trim()); setRenaming(false); }}>저장</Button>
      </Sheet>
    </div>
  );
}

function MembersTab({ team, isLeader }: { team: Team; isLeader: boolean }) {
  const { db } = useMe();
  const ag = db.agreements.find((a) => a.teamId === team.id);
  const split = db.costSplits.find((c) => c.teamId === team.id);
  const shift = db.shifts.find((x) => x.teamId === team.id);
  const chip = (ok: boolean, label: string) => (
    <span className={cx('text-[11px] px-2 h-6 inline-flex items-center rounded-md font-semibold', ok ? 'bg-emerald-50 text-emerald-700' : 'bg-ink-100 text-ink-500')}>{ok ? '✓' : '…'} {label}</span>
  );
  return (
    <div className="space-y-2.5">
      {team.members.map((m) => {
        const b = brandById(db, m.brandId)!;
        return (
          <Card key={m.brandId} className="p-3.5">
            <div className="flex items-center gap-3">
              <BrandLogo brand={b} size={44} />
              <button className="flex-1 text-left min-w-0" onClick={() => navigate({ name: 'brand', id: b.id })}>
                <div className="font-bold flex items-center gap-1">{b.name} {m.brandId === team.leaderBrandId && <Tag tone="orange">팀장</Tag>}</div>
                <TrustLine db={db} subjectId={b.id} compact />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
              <div className="rounded-lg bg-ink-100/60 px-3 py-2">
                <div className="text-[11px] text-ink-500">자리</div>
                <div className="font-semibold">{m.slotLabel} · 행거 {m.hangers}개</div>
              </div>
              <div className="rounded-lg bg-ink-100/60 px-3 py-2">
                <div className="text-[11px] text-ink-500">역할</div>
                {isLeader ? (
                  <input className="w-full bg-transparent font-semibold outline-none" defaultValue={m.role} onBlur={(e) => setMemberRole(team.id, m.brandId, e.target.value)} />
                ) : (
                  <div className="font-semibold">{m.role}</div>
                )}
              </div>
            </div>
            {team.stage !== '종료' && (
              <div className="flex flex-wrap gap-1 mt-2.5">
                {chip(!!ag?.agreedBy.includes(m.brandId), '약속서')}
                {chip(!!split?.paid.includes(m.brandId), '분담금')}
                {chip(!!shift && Object.values(shift.assign).includes(m.brandId), `근무 ${shift ? Object.values(shift.assign).filter((x) => x === m.brandId).length : 0}회`)}
                {chip(team.promoChecked.includes(m.brandId), '홍보')}
              </div>
            )}
          </Card>
        );
      })}
      {isLeader && <p className="text-[11px] text-ink-500">팀장은 역할 칸을 눌러 바로 고칠 수 있어요.</p>}
    </div>
  );
}

function AgreementTab({ team, myBrandId }: { team: Team; myBrandId: string }) {
  const { db } = useMe();
  const ag = db.agreements.find((a) => a.teamId === team.id)!;
  const [editing, setEditing] = useState<AgreementKey | null>(null);
  const [draft, setDraft] = useState('');
  const filled = AGREEMENT_ITEMS.filter((i) => ag.items[i.key].trim()).length;
  const iAgreed = ag.agreedBy.includes(myBrandId);
  return (
    <div>
      <Card className="p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="font-bold">동의 현황</div>
          <span className="text-sm font-bold">{ag.agreedBy.length}/{team.members.length}</span>
        </div>
        <div className="h-2 rounded-full bg-ink-100 overflow-hidden mb-3">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(ag.agreedBy.length / team.members.length) * 100}%` }} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {team.members.map((m) => {
            const b = brandById(db, m.brandId)!;
            const ok = ag.agreedBy.includes(m.brandId);
            return <Tag key={m.brandId} tone={ok ? 'green' : 'gray'}>{ok ? '✓' : '…'} {b.name}</Tag>;
          })}
        </div>
        {ag.locked && <p className="text-sm text-emerald-700 font-semibold mt-3">🎉 전원 동의로 팀이 확정됐어요. 약속서는 이제 고칠 수 없어요.</p>}
      </Card>
      {!ag.locked && (
        <div className="flex items-center justify-between mb-2">
          <p className="text-[12px] text-ink-500">9개 항목을 함께 채우고 전원이 동의해야 팀이 확정돼요. 내용을 고치면 동의가 초기화돼요.</p>
        </div>
      )}
      {!ag.locked && filled < 9 && (
        <Button size="sm" variant="secondary" className="mb-3" onClick={() => fillAgreementExamples(team.id)}>빈 항목 예시 문구로 채우기</Button>
      )}
      <div className="space-y-2">
        {AGREEMENT_ITEMS.map((it, i) => {
          const v = ag.items[it.key];
          return (
            <Card key={it.key} className="p-3.5">
              <div className="flex items-start gap-2">
                <span className={cx('w-6 h-6 rounded-full text-[12px] font-bold flex items-center justify-center shrink-0', v ? 'bg-ink-900 text-white' : 'bg-ink-100 text-ink-500')}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-sm">{it.title}</div>
                    {!ag.locked && <button className="text-[12px] text-brand-600 font-semibold" onClick={() => { setDraft(v); setEditing(it.key); }}>{v ? '수정' : '작성'}</button>}
                  </div>
                  <div className="text-[11px] text-ink-500">{it.hint}</div>
                  {v ? <p className="text-sm text-ink-700 mt-1.5 leading-relaxed">{v}</p> : <p className="text-sm text-red-400 mt-1.5">아직 비어 있어요</p>}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      {!ag.locked && (
        <div className="sticky bottom-0 bg-white pt-3 pb-1 mt-3 space-y-2">
          <Button full size="lg" disabled={filled < 9 || iAgreed} onClick={() => agreeAgreement(team.id, myBrandId)}>
            {iAgreed ? '동의 완료 · 다른 팀원을 기다리는 중' : filled < 9 ? `${9 - filled}개 항목을 더 채워야 해요` : '약속서 내용에 동의합니다'}
          </Button>
          {filled === 9 && ag.agreedBy.length < team.members.length && (
            <Button full variant="secondary" onClick={() => simulateOthersAgree(team.id, myBrandId)}>다른 팀원 동의 받기 <Demo /></Button>
          )}
        </div>
      )}
      <Sheet open={!!editing} onClose={() => setEditing(null)} title={AGREEMENT_ITEMS.find((x) => x.key === editing)?.title}>
        <p className="text-xs text-ink-500 mb-2">{AGREEMENT_ITEMS.find((x) => x.key === editing)?.hint}</p>
        <textarea className={textareaCls + ' min-h-[140px]'} value={draft} onChange={(e) => setDraft(e.target.value)} />
        <Button full className="mt-3" onClick={() => { updateAgreementItem(team.id, editing!, draft); setEditing(null); }}>저장</Button>
      </Sheet>
    </div>
  );
}

function CostTab({ team, myBrandId, isLeader }: { team: Team; myBrandId: string; isLeader: boolean }) {
  const { db } = useMe();
  const { total, shares, split } = teamCost(db, team);
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  if (!split) return null;
  const paidSum = split.paid.reduce((s, b) => s + (shares[b] ?? 0), 0);
  return (
    <div className="space-y-4">
      <Segmented items={[{ key: 'equal', label: '균등 분담' }, { key: 'hanger', label: '행거 비례' }]} value={split.mode} onChange={(k) => updateCost(team.id, { mode: k })} />
      <Card className="p-4">
        <div className="flex justify-between items-center text-sm mb-2">
          <span>대관료</span>
          <div className="flex items-center gap-1">
            <input type="number" className="w-24 h-8 px-2 rounded-lg border border-ink-300 text-right text-sm" value={split.spaceFee / 10000} step={10} onChange={(e) => updateCost(team.id, { spaceFee: Number(e.target.value) * 10000 })} />
            <span>만원</span>
          </div>
        </div>
        <div className="text-[12px] text-ink-500 mb-1">공통비 항목</div>
        {split.commonItems.map((c) => (
          <div key={c.id} className="flex justify-between items-center text-sm py-1">
            <span>{c.label}</span>
            <span className="flex items-center gap-2">{won(c.amount)} <button onClick={() => removeCommonItem(team.id, c.id)} className="text-ink-500"><Icon name="x" className="w-4 h-4" /></button></span>
          </div>
        ))}
        <div className="flex gap-1.5 mt-2">
          <input className={inputCls + ' h-9'} placeholder="항목 (예: 쇼핑백)" value={label} onChange={(e) => setLabel(e.target.value)} />
          <input className={inputCls + ' h-9 w-28'} type="number" placeholder="금액(원)" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Button size="sm" variant="dark" className="h-9" disabled={!label || !amount} onClick={() => { addCommonItem(team.id, label, Number(amount)); setLabel(''); setAmount(''); }}>추가</Button>
        </div>
        <div className="flex justify-between font-extrabold mt-3 pt-3 border-t border-ink-100">
          <span>총액</span>
          <span>{won(total)}</span>
        </div>
      </Card>
      {shares[myBrandId] !== undefined && total > 0 && (
        <div className="rounded-2xl bg-ink-900 text-white p-4">
          <div className="text-[12px] text-white/60">혼자 열었다면 {won(total)}</div>
          <div className="text-lg font-extrabold mt-0.5">같이 열어서 내 몫은 <span className="text-brand-400">{won(shares[myBrandId])}</span></div>
          <div className="text-[12px] text-white/70 mt-0.5">{Math.round((1 - shares[myBrandId] / total) * 100)}% 아꼈어요 · {won(total - shares[myBrandId])} 절약</div>
        </div>
      )}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold">각자 분담금</h3>
          <span className="text-xs text-ink-500">납부 기한 {md(split.dueDate)}</span>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 h-1.5 rounded-full bg-ink-100 overflow-hidden"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${total ? (paidSum / total) * 100 : 0}%` }} /></div>
          <span className="text-[11px] font-semibold text-emerald-700">{split.paid.length}/{team.members.length}곳 납부</span>
        </div>
        <Card className="divide-y divide-ink-100">
          {team.members.map((m) => {
            const b = brandById(db, m.brandId)!;
            const paid = split.paid.includes(m.brandId);
            return (
              <div key={m.brandId} className="flex items-center gap-2.5 px-3.5 py-3">
                <button onClick={() => (m.brandId === myBrandId || isLeader) && togglePaid(team.id, m.brandId)} className={cx('w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0', paid ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-ink-300')}>
                  {paid && <Icon name="check" className="w-4 h-4" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{b.name}</div>
                  {split.mode === 'hanger' && (
                    <div className="flex items-center gap-1 text-[11px] text-ink-500">
                      행거
                      <button className="w-5 h-5 rounded border border-ink-300" onClick={() => setMemberHangers(team.id, m.brandId, m.hangers - 1)}>−</button>
                      <b>{m.hangers}</b>
                      <button className="w-5 h-5 rounded border border-ink-300" onClick={() => setMemberHangers(team.id, m.brandId, m.hangers + 1)}>+</button>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-bold text-sm">{won(shares[m.brandId] ?? 0)}</div>
                  <div className={cx('text-[11px]', paid ? 'text-emerald-600' : 'text-ink-500')}>{paid ? '납부 완료' : '미납'}</div>
                </div>
              </div>
            );
          })}
        </Card>
        {isLeader && split.paid.length < team.members.length && (
          <Button full variant="secondary" className="mt-3" onClick={() => remindPayment(team.id)}>💰 미납 {team.members.length - split.paid.length}곳에 납부 알림 보내기</Button>
        )}
        <p className="text-[12px] text-ink-500 mt-2">모인 금액 {won(paidSum)} / {won(total)} · 실제 결제는 이뤄지지 않아요. OFF STAGE는 거래 수수료를 받지 않아요.</p>
      </div>
    </div>
  );
}

/** 무드보드로 자동 생성되는 팀 소개 페이지. 공간 지원 시 첨부된다. */
export function TeamIntroPage({ db, team, compact }: { db: DB; team: Team; compact?: boolean }) {
  const mb = db.moodboards.find((m) => m.teamId === team.id);
  const pastPopups = db.popups.filter((p) => p.teamId === team.id && p.status === '종료');
  const allMoods = [...new Set(team.members.flatMap((m) => brandById(db, m.brandId)!.tags.moods))];
  return (
    <div className={compact ? '' : 'p-4'}>
      <div className="rounded-2xl overflow-hidden border border-ink-100">
        <div className="grid grid-cols-3 gap-0.5">
          {team.members.flatMap((m) => (mb?.picks[m.brandId] ?? []).slice(0, 1)).concat(team.members.flatMap((m) => (mb?.picks[m.brandId] ?? []).slice(1, 2))).slice(0, 6).map((id) => {
            const im = db.lookbookImages.find((i) => i.id === id);
            return im ? <Swatch key={id} hue={im.hue} pattern={im.pattern} className="aspect-square" rounded="" /> : null;
          })}
        </div>
        <div className="p-4 bg-ink-900 text-white">
          <div className="text-[11px] text-white/60">팀 소개 · {team.members.length}개 브랜드</div>
          <div className="text-lg font-extrabold">{team.name}</div>
          <div className="text-sm text-white/80 mt-0.5">"{mb?.headline}"</div>
          <div className="flex flex-wrap gap-1 mt-2">
            {allMoods.map((m) => <span key={m} className="text-[11px] px-2 py-0.5 rounded bg-white/15">#{m}</span>)}
          </div>
        </div>
      </div>
      <div className="space-y-3 mt-3">
        {team.members.map((m) => {
          const b = brandById(db, m.brandId)!;
          return (
            <div key={m.brandId} className="rounded-2xl border border-ink-100 p-3 bg-white">
              <div className="flex items-center gap-2 mb-2">
                <BrandLogo brand={b} size={32} />
                <button className="flex-1 text-left" onClick={() => navigate({ name: 'brand', id: b.id })}>
                  <div className="font-bold text-sm">{b.name} <span className="text-ink-500 font-normal text-xs">· {m.slotLabel}</span></div>
                  <TrustLine db={db} subjectId={b.id} compact />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {(mb?.picks[m.brandId] ?? []).map((id) => {
                  const im = db.lookbookImages.find((i) => i.id === id);
                  return im ? <Swatch key={id} hue={im.hue} pattern={im.pattern} label={im.label} className="aspect-square" rounded="rounded-lg" /> : null;
                })}
              </div>
              {!compact && <div className="mt-2"><ThemeTagList tags={b.tags} limit={5} /></div>}
            </div>
          );
        })}
      </div>
      <div className="mt-3 rounded-2xl bg-ink-100/60 p-3 text-sm">
        <div className="font-bold mb-1">팀의 공동 팝업 이력</div>
        {pastPopups.length ? pastPopups.map((p) => <div key={p.id} className="text-ink-700">· {p.title} ({period(p.period)}, {spaceById(db, p.spaceId)?.name})</div>) : <div className="text-ink-500">이번이 첫 공동 팝업이에요</div>}
      </div>
    </div>
  );
}

function MoodboardTab({ team, myBrandId }: { team: Team; myBrandId: string }) {
  const { db } = useMe();
  const mb = db.moodboards.find((m) => m.teamId === team.id)!;
  const me = brandById(db, myBrandId)!;
  const mine = mb.picks[myBrandId] ?? [];
  const [preview, setPreview] = useState(false);
  return (
    <div>
      <p className="text-[13px] text-ink-500 mb-3">각 멤버가 룩북에서 3장씩 고르면 팀 소개 페이지가 자동으로 만들어져요. 공간에 지원할 때 이 페이지가 함께 첨부돼요.</p>
      <div className="mb-3">
        <div className="text-[13px] font-semibold mb-1">한 줄 소개</div>
        <input className={inputCls} defaultValue={mb.headline} onBlur={(e) => setMoodHeadline(team.id, e.target.value)} />
      </div>
      <div className="flex items-center justify-between mb-2">
        <div className="font-bold text-sm">내 룩북에서 고르기 <span className={cx(mine.length === 3 ? 'text-emerald-600' : 'text-brand-600')}>{mine.length}/3</span></div>
      </div>
      {me.lookbook.length ? <LookbookGrid db={db} ids={me.lookbook} picked={mine} onPick={(id) => toggleMoodPick(team.id, myBrandId, id)} /> : <Empty>룩북 사진이 없어요. 내 정보에서 인스타그램을 연동해 보세요.</Empty>}
      <div className="mt-4 mb-2 font-bold text-sm">멤버별 선택 현황</div>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {team.members.map((m) => {
          const n = (mb.picks[m.brandId] ?? []).length;
          return <Tag key={m.brandId} tone={n === 3 ? 'green' : 'yellow'}>{brandById(db, m.brandId)!.name} {n}/3</Tag>;
        })}
      </div>
      <Button full variant="dark" onClick={() => setPreview(true)}>팀 소개 페이지 미리보기</Button>
      <Sheet open={preview} onClose={() => setPreview(false)} title="팀 소개 페이지">
        <TeamIntroPage db={db} team={team} compact />
      </Sheet>
    </div>
  );
}

function ShiftTab({ team }: { team: Team }) {
  const { db, brand } = useMe();
  const sh = db.shifts.find((s) => s.teamId === team.id)!;
  const colors = ['bg-orange-100 text-orange-800', 'bg-sky-100 text-sky-800', 'bg-emerald-100 text-emerald-800', 'bg-violet-100 text-violet-800', 'bg-rose-100 text-rose-800', 'bg-amber-100 text-amber-800'];
  const colorOf = (bid?: string) => colors[team.members.findIndex((m) => m.brandId === bid) % colors.length];
  const counts = team.members.map((m) => ({ m, n: Object.values(sh.assign).filter((x) => x === m.brandId).length }));
  const ended = team.stage === '종료';
  const mine = Object.entries(sh.assign).filter(([, v]) => v === brand?.id).map(([k]) => k).sort();
  const dow = (d: string) => '일월화수목금토'[new Date(d + 'T00:00:00').getDay()];
  return (
    <div>
      {brand && (
        <div className="mb-4 rounded-2xl bg-brand-50 p-4">
          <div className="text-[13px] font-bold">내 근무 {mine.length}회</div>
          {mine.length ? (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {mine.map((k) => { const [d, t] = k.split('|'); return <span key={k} className="text-[12px] font-semibold bg-white rounded-lg px-2 py-1">{md(d)}({dow(d)}) {t}</span>; })}
            </div>
          ) : (
            <p className="text-[12px] text-ink-500 mt-1">아직 배정된 근무가 없어요. 빈칸을 눌러 내 근무를 정해 보세요.</p>
          )}
        </div>
      )}
      <div className="flex items-center justify-between mb-2">
        <p className="text-[13px] text-ink-500">칸을 누를 때마다 담당 브랜드가 바뀌어요.</p>
        {!ended && <Button size="sm" variant="secondary" onClick={() => autoFillShifts(team.id)}>자동 배정</Button>}
      </div>
      <div className="overflow-x-auto -mx-4 px-4">
        <table className="text-[12px] border-separate border-spacing-1">
          <thead>
            <tr>
              <th className="text-left text-ink-500 font-medium pr-1">날짜</th>
              {sh.timeSlots.map((t) => <th key={t} className="text-ink-500 font-medium min-w-[120px]">{t}</th>)}
            </tr>
          </thead>
          <tbody>
            {sh.dates.map((d) => (
              <tr key={d}>
                <td className="font-semibold pr-1 whitespace-nowrap">{md(d)} ({dow(d)})</td>
                {sh.timeSlots.map((t) => {
                  const k = `${d}|${t}`;
                  const bid = sh.assign[k];
                  const b = brandById(db, bid);
                  return (
                    <td key={t}>
                      <button disabled={ended} onClick={() => cycleShift(team.id, k)} className={cx('w-full h-10 rounded-lg font-semibold', b ? colorOf(bid) : 'border border-dashed border-ink-300 text-ink-300', bid && bid === brand?.id && 'ring-2 ring-brand-500')}>
                        {b ? b.name : '+ 배정'}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 font-bold text-sm mb-2">근무 횟수</div>
      <div className="flex flex-wrap gap-1.5">
        {counts.map(({ m, n }) => <span key={m.brandId} className={cx('text-[12px] px-2 h-6 inline-flex items-center rounded-md font-medium', colorOf(m.brandId))}>{brandById(db, m.brandId)!.name} {n}회</span>)}
      </div>
    </div>
  );
}

function PromoTab({ team, myBrandId }: { team: Team; myBrandId: string }) {
  const { db } = useMe();
  const sp = spaceById(db, team.spaceId);
  const brands = team.members.map((m) => brandById(db, m.brandId)!);
  const pop = db.popups.find((p) => p.teamId === team.id && p.status !== '종료') ?? db.popups.find((p) => p.teamId === team.id);
  const tagName = team.name.replace(/\s/g, '');
  const hashtags = [`#${tagName}`, `#${tagName}${team.round}회`, '#offstage', '#공동팝업', `#${team.region}팝업`, ...brands.map((b) => `#${b.name.replace(/\s/g, '')}`)];
  const poster = `[${team.name} ${team.round}회] ${brands.length}개 브랜드가 함께 여는 팝업

📅 ${period(team.period)} ${pop ? `· ${pop.hours}` : ''}
📍 ${sp ? `${sp.name} (${sp.address})` : `${team.region} (장소 확정 후 공지)`}

함께하는 브랜드
${brands.map((b) => `· ${b.name} — ${b.tags.categories.join('/')}`).join('\n')}

${db.moodboards.find((m) => m.teamId === team.id)?.headline ?? ''}

${hashtags.join(' ')}`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(poster); toast('포스터 문구를 복사했어요'); } catch { toast('복사가 안 되는 환경이에요. 문구를 길게 눌러 복사해 주세요'); }
  };
  return (
    <div>
      <div className="rounded-2xl overflow-hidden border border-ink-100 mb-3">
        <div className="relative h-40">
          <div className="absolute inset-0 flex">
            {brands.map((b) => <Swatch key={b.id} hue={b.logoHue} pattern="stripe" rounded="" className="flex-1" />)}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/10" />
          <div className="absolute left-4 right-4 bottom-3 text-white">
            <div className="text-[10px] font-bold tracking-[0.2em] opacity-80">OFF STAGE · 공동 팝업</div>
            <div className="text-xl font-extrabold leading-tight mt-0.5">{team.name}</div>
            <div className="text-[12px] opacity-90 mt-0.5">{period(team.period)} · {sp?.name ?? team.region}</div>
            <div className="text-[11px] opacity-80 mt-0.5 truncate">{brands.map((b) => b.name).join(' × ')}</div>
          </div>
        </div>
        <div className="p-4">
          <div className="text-[11px] text-ink-500">공통 포스터 문구 (자동 생성)</div>
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed mt-1 select-text">{poster}</pre>
        </div>
      </div>
      <Button full variant="dark" onClick={copy}>문구 복사하기</Button>
      <div className="mt-5 font-bold mb-1">"각자 같은 날 게시" 체크리스트</div>
      <p className="text-[12px] text-ink-500 mb-2">약속서 8번 홍보 의무: {db.agreements.find((a) => a.teamId === team.id)?.items.promo || '아직 정하지 않았어요'}</p>
      {(() => {
        // 기본 권장일: 오픈 3일 전
        const d = new Date(team.period.start + 'T00:00:00');
        d.setDate(d.getDate() - 3);
        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const left = daysUntil(iso);
        return (
          <div className="mb-2 rounded-xl bg-brand-50 px-3.5 py-2.5 flex items-center justify-between">
            <span className="text-[13px] font-semibold">📣 게시일 {md(iso)}({'일월화수목금토'[d.getDay()]}) 오후 7시</span>
            <span className="text-[12px] font-extrabold text-brand-600">{left > 0 ? `D-${left}` : left === 0 ? '오늘' : '지남'}</span>
          </div>
        );
      })()}
      <Card className="divide-y divide-ink-100">
        {brands.map((b) => {
          const on = team.promoChecked.includes(b.id);
          return (
            <button key={b.id} disabled={b.id !== myBrandId} onClick={() => togglePromo(team.id, b.id)} className="w-full flex items-center gap-3 px-3.5 py-3 text-left">
              <span className={cx('w-6 h-6 rounded-md border-2 flex items-center justify-center', on ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-ink-300')}>{on && <Icon name="check" className="w-4 h-4" />}</span>
              <span className="flex-1 text-sm font-semibold">{b.name}{b.id === myBrandId && <span className="text-ink-500 font-normal"> (나)</span>}</span>
              <span className={cx('text-xs', on ? 'text-emerald-600' : 'text-ink-500')}>{on ? '게시 완료' : '대기'}</span>
            </button>
          );
        })}
      </Card>
      <p className="text-[12px] text-ink-500 mt-2">{team.promoChecked.length}/{brands.length} 게시 완료</p>
    </div>
  );
}
