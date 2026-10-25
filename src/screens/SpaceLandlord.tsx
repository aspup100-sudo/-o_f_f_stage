import { useState } from 'react';
import { useMe, guard } from '@/store/hooks';
import { back, navigate, replace } from '@/store/store';
import { setLastMinute, decideSpaceApplication, proposeSpaceToRecruitment, proposeSpaceToTeam, saveSpace, simulateTeamApplication, type SpaceDraft } from '@/store/actions';
import { brandById, manwon, period, soonOpenDays, spaceById, teamById } from '@/store/logic';
import { ScreenTitle, TrustLine } from '@/components/common';
import { Button, Card, Chip, cx, Demo, Empty, Field, inputCls, Segmented, Sheet, StatusPill, SubHeader, Swatch, Tag, textareaCls } from '@/components/ui';
import { FACILITIES, REGIONS } from '@/types';
import { SpaceCard, AvailabilityCalendar } from './Space';
import { TeamIntroPage } from './Team';
import { RecruitCard } from './Recruit';
import { LandlordCompletions } from './Completion';

export function MySpacesTab() {
  const { db, landlord } = useMe();
  const [sel, setSel] = useState<string | null>(null);
  if (!landlord) return <Empty>임대인 계정에서 볼 수 있어요</Empty>;
  const spaces = landlord.spaceIds.map((id) => spaceById(db, id)!).filter(Boolean);
  const current = sel ?? spaces[0]?.id;
  return (
    <div>
      <ScreenTitle right={<Button size="sm" onClick={() => guard(() => navigate({ name: 'spaceEdit' }))}>+ 공간 등록</Button>}>내 공간</ScreenTitle>
      <div className="px-4 space-y-3">
        {spaces.length === 0 && <Empty icon="building">아직 등록한 공간이 없어요. 공간을 등록하고 비는 날을 표시해 보세요.</Empty>}
        {spaces.map((s) => <SpaceCard key={s.id} db={db} s={s} />)}
        {spaces.length > 0 && (
          <Card className="p-4">
            <div className="font-bold mb-2">비는 날 관리</div>
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar mb-3">
              {spaces.map((s) => <Chip key={s.id} active={current === s.id} onClick={() => setSel(s.id)}>{s.name}</Chip>)}
            </div>
            {current && <AvailabilityCalendar key={current} db={db} spaceId={current} editable />}
          </Card>
        )}
        {current && (() => {
          const sp = spaceById(db, current)!;
          const n = soonOpenDays(db, current);
          return (
            <Card className="p-4">
              <div className="font-bold">⚡ 막판 할인</div>
              <p className="text-[12px] text-ink-500 mt-0.5 mb-3">2주 안에 아직 비어 있는 날({n}일)을 할인하면 공간 목록에 할인 표시가 붙어 팀 눈에 잘 띄어요.</p>
              {(() => {
                const savers = db.brands.filter((b) => b.savedSpaces?.includes(current)).length;
                return savers > 0 ? <p className="text-[12px] font-semibold text-red-600 -mt-1.5 mb-3">♥ 이 공간을 찜한 브랜드 {savers}곳에 할인 소식이 바로 가요</p> : null;
              })()}
              <div className="flex gap-1.5">
                {[0, 10, 20, 30].map((v) => (
                  <Chip key={v} active={(sp.lastMinutePct ?? 0) === v} onClick={() => setLastMinute(current, v)}>{v ? `${v}%` : '안 함'}</Chip>
                ))}
              </div>
              {!!sp.lastMinutePct && n > 0 && <p className="text-[12px] text-brand-700 mt-2">하루 {manwon(sp.dailyFee)} → <b>{manwon(sp.dailyFee * (1 - sp.lastMinutePct / 100))}</b></p>}
            </Card>
          );
        })()}
      </div>
    </div>
  );
}

export function SpaceEdit({ id }: { id?: string }) {
  const { db, landlord } = useMe();
  const ex = spaceById(db, id);
  const [d, setD] = useState<SpaceDraft>(
    ex
      ? { name: ex.name, region: ex.region, address: ex.address, intro: ex.intro, areaM2: ex.areaM2, dailyFee: ex.dailyFee, minDays: ex.minDays, facilities: ex.facilities, electricKw: ex.electricKw, teamRental: ex.teamRental, fashionOnly: ex.fashionOnly, photoHues: ex.photoHues }
      : { name: '', region: '마포구', address: '', intro: '', areaM2: 33, dailyFee: 500000, minDays: 2, facilities: ['행거', '조명'], electricKw: 5, teamRental: true, fashionOnly: true, photoHues: [] },
  );
  if (!landlord) return <Empty>임대인 계정에서 볼 수 있어요</Empty>;
  const ok = d.name.trim() && d.address.trim() && d.photoHues.length > 0;
  return (
    <div className="bg-white min-h-screen">
      <SubHeader title={ex ? '공간 수정' : '공간 등록'} />
      <div className="p-4">
        <Field label="실제 사진" required hint="데모에서는 버튼을 누르면 예시 사진이 추가돼요">
          <div className="flex gap-1.5 flex-wrap">
            {d.photoHues.map((h, i) => (
              <button key={i} onClick={() => setD({ ...d, photoHues: d.photoHues.filter((_, j) => j !== i) })} className="relative">
                <Swatch hue={h} className="w-20 h-20" />
                <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-xs">✕</span>
              </button>
            ))}
            <button type="button" onClick={() => setD({ ...d, photoHues: [...d.photoHues, Math.floor(Math.random() * 360)] })} className="w-20 h-20 rounded-xl border-2 border-dashed border-ink-300 text-ink-500 text-xs">+ 사진 (데모)</button>
          </div>
        </Field>
        <Field label="공간 이름" required><input className={inputCls} value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder="예) 망원 골목창고" /></Field>
        <Field label="지역">
          <div className="flex flex-wrap gap-1.5">{REGIONS.map((r) => <Chip key={r} active={d.region === r} onClick={() => setD({ ...d, region: r })}>{r}</Chip>)}</div>
        </Field>
        <Field label="주소" required><input className={inputCls} value={d.address} onChange={(e) => setD({ ...d, address: e.target.value })} placeholder="서울 ○○구 ○○로 00" /></Field>
        <Field label="소개"><textarea className={textareaCls} value={d.intro} onChange={(e) => setD({ ...d, intro: e.target.value })} /></Field>
        <div className="grid grid-cols-3 gap-2">
          <Field label="실측 면적(㎡)"><input type="number" className={inputCls} value={d.areaM2} onChange={(e) => setD({ ...d, areaM2: Number(e.target.value) })} /></Field>
          <Field label="1일 대관료(만원)"><input type="number" className={inputCls} value={d.dailyFee / 10000} onChange={(e) => setD({ ...d, dailyFee: Number(e.target.value) * 10000 })} /></Field>
          <Field label="최소 대관(일)"><input type="number" className={inputCls} value={d.minDays} min={1} onChange={(e) => setD({ ...d, minDays: Number(e.target.value) })} /></Field>
        </div>
        <Field label="설비 체크리스트">
          <div className="flex flex-wrap gap-1.5">
            {FACILITIES.map((f) => <Chip key={f} active={d.facilities.includes(f)} onClick={() => setD({ ...d, facilities: d.facilities.includes(f) ? d.facilities.filter((x) => x !== f) : [...d.facilities, f] })}>{f}</Chip>)}
          </div>
        </Field>
        {d.facilities.includes('전기 용량') && (
          <Field label="전기 용량(kW)"><input type="number" className={inputCls} value={d.electricKw ?? 0} onChange={(e) => setD({ ...d, electricKw: Number(e.target.value) })} /></Field>
        )}
        <Field label="팀 단위 대관">
          <Segmented items={[{ key: 'y', label: '가능' }, { key: 'n', label: '불가' }]} value={d.teamRental ? 'y' : 'n'} onChange={(k) => setD({ ...d, teamRental: k === 'y' })} />
        </Field>
        <Field label="업종 고정(패션)" hint="패션 브랜드만 받으면 이전 팀의 집기·연출을 다음 팀이 이어 쓸 수 있어요">
          <Segmented items={[{ key: 'y', label: '패션 전용' }, { key: 'n', label: '업종 무관' }]} value={d.fashionOnly ? 'y' : 'n'} onChange={(k) => setD({ ...d, fashionOnly: k === 'y' })} />
        </Field>
        <Button full size="lg" disabled={!ok} onClick={() => { const sid = saveSpace(landlord.id, d, id); if (id) back(); else replace({ name: 'space', id: sid }); }}>{ex ? '저장' : '등록하고 비는 날 표시하기'}</Button>
      </div>
    </div>
  );
}

export function InboxTab() {
  const { db, landlord } = useMe();
  const [tab, setTab] = useState<'apps' | 'offer'>('apps');
  const [view, setView] = useState<string | null>(null);
  if (!landlord) return <Empty>임대인 계정에서 볼 수 있어요</Empty>;
  const apps = db.spaceApplications.filter((a) => landlord.spaceIds.includes(a.spaceId));
  const pending = apps.filter((a) => a.status === 'pending' && a.direction === 'team');
  const others = apps.filter((a) => !(a.status === 'pending' && a.direction === 'team'));
  const viewing = db.spaceApplications.find((a) => a.id === view);
  const openRecruits = db.recruitments.filter((r) => r.status !== '마감' && !r.spaceConfirmed);
  const spacelessTeams = db.teams.filter((t) => t.confirmed && t.stage === '준비 중' && !t.spaceId);

  return (
    <div>
      <ScreenTitle>받은 지원</ScreenTitle>
      <div className="px-4 mb-3">
        <Segmented items={[{ key: 'apps', label: `팀 지원 ${pending.length}` }, { key: 'offer', label: `팀에게 먼저 제안 ${openRecruits.length + spacelessTeams.length}` }]} value={tab} onChange={setTab} />
      </div>
      {tab === 'apps' && (
        <div className="px-4 space-y-3">
          <LandlordCompletions />
          {pending.length > 0 && <h3 className="font-bold">대기 중인 팀 지원</h3>}
          {pending.length === 0 && (
            <Empty icon="inbox" action={openRecruits.length + spacelessTeams.length > 0 ? { label: `공간 찾는 팀 ${openRecruits.length + spacelessTeams.length}곳에 먼저 제안하기`, onClick: () => setTab('offer') } : undefined}>
              대기 중인 지원이 없어요
            </Empty>
          )}
          {pending.length === 0 && landlord.spaceIds[0] && db.recruitments.some((r) => !r.teamId && r.status !== '마감') && (
            <Button full variant="secondary" onClick={() => simulateTeamApplication(landlord.spaceIds[0])}>
              {spaceById(db, landlord.spaceIds[0])?.name}에 팀 지원 받아 보기 <Demo />
            </Button>
          )}
          {pending.map((a) => <AppCard key={a.id} appId={a.id} onOpen={() => setView(a.id)} />)}
          {others.length > 0 && <h3 className="font-bold pt-3">지난 내역</h3>}
          {others.map((a) => <AppCard key={a.id} appId={a.id} onOpen={() => setView(a.id)} />)}
        </div>
      )}
      {tab === 'offer' && (
        <div className="px-4">
          <p className="text-[13px] text-ink-500 mb-3">공간이 아직 없는 팀에게 우리 공간을 먼저 제안해 보세요.</p>
          {spacelessTeams.length > 0 && <h3 className="font-bold mb-2">공간을 찾는 확정 팀</h3>}
          <div className="space-y-2 mb-5">
            {spacelessTeams.map((t) => (
              <Card key={t.id} className="p-3.5">
                <div className="font-bold">{t.name}</div>
                <div className="text-[13px] text-ink-500">{t.region} · {period(t.period)} · {t.members.length}개 브랜드</div>
                <OfferToTeam teamId={t.id} />
              </Card>
            ))}
          </div>
          <h3 className="font-bold mb-2">모집 중인 팀</h3>
          <div className="space-y-3">
            {openRecruits.map((r) => (
              <div key={r.id}>
                <RecruitCard db={db} r={r} />
                <div className="mt-1.5"><ProposeSpaceButton recruitmentId={r.id} /></div>
              </div>
            ))}
          </div>
        </div>
      )}
      <Sheet open={!!viewing} onClose={() => setView(null)} title="지원한 팀 살펴보기">
        {viewing && <AppDetail appId={viewing.id} onDone={() => setView(null)} />}
      </Sheet>
    </div>
  );
}

function AppCard({ appId, onOpen }: { appId: string; onOpen: () => void }) {
  const { db } = useMe();
  const a = db.spaceApplications.find((x) => x.id === appId)!;
  const t = teamById(db, a.teamId)!;
  const sp = spaceById(db, a.spaceId)!;
  const days = Math.round((new Date(a.dates.end).getTime() - new Date(a.dates.start).getTime()) / 86400000) + 1;
  return (
    <Card className="p-4" onClick={onOpen}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <StatusPill status={a.status} />
          {a.direction === 'landlord' && <Tag>내가 제안</Tag>}
        </div>
        <span className="text-[12px] text-ink-500">{sp.name}</span>
      </div>
      <div className="font-bold text-lg mt-1">{t.name}</div>
      <div className="text-[13px] text-ink-500">📅 {period(a.dates)} · {t.members.length}개 브랜드</div>
      <div className="flex flex-wrap gap-1 mt-2">
        {t.members.map((m) => <Tag key={m.brandId}>{brandById(db, m.brandId)!.name}</Tag>)}
      </div>
      <p className="text-sm text-ink-700 mt-2">"{a.message}"</p>
      {a.status === 'pending' && (
        <div className="mt-3 rounded-xl bg-brand-50 px-3 py-2.5 flex items-center justify-between">
          <span className="text-[12px] text-ink-500">수락하면 예상 대관료 ({days}일)</span>
          <span className="font-extrabold text-brand-600">{manwon(sp.dailyFee * days)}</span>
        </div>
      )}
      <div className="text-[12px] text-brand-600 font-semibold mt-2">{a.status === 'pending' && a.direction === 'team' ? '무드보드·등급·이력 보고 수락하기 ›' : '무드보드·등급·이력 보기 ›'}</div>
    </Card>
  );
}

function AppDetail({ appId, onDone }: { appId: string; onDone: () => void }) {
  const { db } = useMe();
  const a = db.spaceApplications.find((x) => x.id === appId)!;
  const t = teamById(db, a.teamId)!;
  const sp = spaceById(db, a.spaceId)!;
  const days = Math.round((new Date(a.dates.end).getTime() - new Date(a.dates.start).getTime()) / 86400000) + 1;
  return (
    <div>
      <div className="rounded-xl bg-ink-100/60 p-3 text-sm mb-3">
        <b>{sp.name}</b> · {period(a.dates)} ({days}일) · 예상 대관료 {manwon(sp.dailyFee * days)}
      </div>
      <h4 className="font-bold text-sm mb-1.5">팀원 등급</h4>
      <div className="space-y-1.5 mb-4">
        {t.members.map((m) => {
          const b = brandById(db, m.brandId)!;
          return (
            <div key={m.brandId} className="flex items-center justify-between text-sm">
              <span className="font-semibold">{b.name}</span>
              <TrustLine db={db} subjectId={b.id} compact />
            </div>
          );
        })}
      </div>
      <h4 className="font-bold text-sm mb-1.5">팀 무드보드</h4>
      <TeamIntroPage db={db} team={t} compact />
      {a.status === 'pending' && a.direction === 'team' && (
        <div className="grid grid-cols-2 gap-2 mt-4 sticky bottom-0 bg-white py-2">
          <Button variant="secondary" onClick={() => { decideSpaceApplication(a.id, false); onDone(); }}>거절</Button>
          <Button onClick={() => { decideSpaceApplication(a.id, true); onDone(); }}>수락</Button>
        </div>
      )}
      {a.status === 'pending' && a.direction === 'landlord' && <p className="text-sm text-ink-500 mt-3">팀의 답을 기다리고 있어요.</p>}
    </div>
  );
}

function OfferToTeam({ teamId }: { teamId: string }) {
  const { db, landlord } = useMe();
  const [open, setOpen] = useState(false);
  const spaces = landlord ? landlord.spaceIds.map((id) => spaceById(db, id)!).filter(Boolean) : [];
  const sent = db.spaceApplications.some((a) => a.teamId === teamId && a.direction === 'landlord' && landlord?.spaceIds.includes(a.spaceId));
  return (
    <>
      <Button size="sm" className="mt-2" disabled={sent} onClick={() => guard(() => setOpen(true))}>{sent ? '제안함' : '우리 공간 제안하기'}</Button>
      <Sheet open={open} onClose={() => setOpen(false)} title="어떤 공간을 제안할까요?">
        <div className="space-y-2">
          {spaces.map((s) => (
            <button key={s.id} onClick={() => { proposeSpaceToTeam(teamId, s.id); setOpen(false); }} className="w-full text-left rounded-xl border border-ink-300 p-3 text-sm">
              <b>{s.name}</b> · 1일 {manwon(s.dailyFee)}
            </button>
          ))}
        </div>
      </Sheet>
    </>
  );
}

export function ProposeSpaceButton({ recruitmentId }: { recruitmentId: string }) {
  const { db, landlord } = useMe();
  const [open, setOpen] = useState(false);
  const spaces = landlord ? landlord.spaceIds.map((id) => spaceById(db, id)!).filter(Boolean) : [];
  if (!landlord) return null;
  return (
    <>
      <Button full variant="dark" onClick={() => guard(() => setOpen(true))}>우리 공간 제안하기</Button>
      <Sheet open={open} onClose={() => setOpen(false)} title="어떤 공간을 제안할까요?">
        {spaces.length === 0 && <Empty>먼저 공간을 등록해 주세요</Empty>}
        <div className="space-y-2">
          {spaces.map((s) => (
            <button key={s.id} onClick={() => { const rid = proposeSpaceToRecruitment(recruitmentId, s.id); setOpen(false); navigate({ name: 'chat', id: rid }); }} className={cx('w-full text-left rounded-xl border border-ink-300 p-3 text-sm')}>
              <b>{s.name}</b> · {s.region} · 1일 {manwon(s.dailyFee)}
            </button>
          ))}
        </div>
      </Sheet>
    </>
  );
}
