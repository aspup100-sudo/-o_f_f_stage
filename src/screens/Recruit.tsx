import { useState } from 'react';
import { shareLink } from '@/store/share';
import { useMe, guard } from '@/store/hooks';
import { navigate } from '@/store/store';
import { applyRecruitment, createRecruitment, decideApplication, simulateApplicants, toggleRecruitAlert, toggleSaveRecruit, type RecruitDraft } from '@/store/actions';
import { brandById, manwon, matchPct, matchScore, period, recruitFit, recruitUrgency, slotShare, spaceById } from '@/store/logic';
import { BrandLogo, ScreenTitle, ThemeTagList, TrustLine } from '@/components/common';
import { Button, Card, Chip, cx, Demo, Empty, Field, inputCls, Segmented, Sheet, StatusPill, SubHeader, Tag, textareaCls, Ic, Icon } from '@/components/ui';
import { CATEGORIES, REGIONS, type Category, type Recruitment, type RecruitStatus, type Region, type SlotStatus } from '@/types';
import type { DB } from '@/data/mock';
import { ProposeSpaceButton } from './SpaceLandlord';

const SLOT_STYLE: Record<SlotStatus, string> = {
  모집자: 'bg-ink-900 text-white border-ink-900',
  확정: 'bg-emerald-500 text-white border-emerald-500',
  '협의 중': 'bg-amber-100 text-amber-800 border-amber-300',
  '비어 있음': 'bg-white text-ink-500 border-dashed border-ink-300',
};

export function SaveRecruitButton({ r }: { r: Recruitment }) {
  const { brand } = useMe();
  if (!brand || r.hostBrandId === brand.id) return null;
  const on = !!brand.savedRecruits?.includes(r.id);
  return (
    <button
      aria-label={on ? '찜 해제' : '찜하기'}
      onClick={(e) => { e.stopPropagation(); toggleSaveRecruit(brand.id, r.id); }}
      className={cx('w-8 h-8 -mr-1 -mt-1 rounded-full flex items-center justify-center text-lg', on ? 'text-brand-500' : 'text-ink-400')}
    >
      <Icon name="heart" className="w-5 h-5" filled={on} />
    </button>
  );
}

export function RecruitCard({ db, r, reasons }: { db: DB; r: Recruitment; reasons?: string[] }) {
  const host = brandById(db, r.hostBrandId)!;
  const urgent = recruitUrgency(r);
  const empty = r.slots.filter((s) => s.status === '비어 있음').length;
  const share = slotShare(r.totalBudget, r.slots, 1, r.slotMode);
  const sp = spaceById(db, r.spaceId);
  return (
    <Card className="p-4" onClick={() => navigate({ name: 'recruit', id: r.id })}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <StatusPill status={r.status} />
        <Tag>{r.slotMode === 'hanger' ? '행거 단위' : '카테고리 슬롯'}</Tag>
        {r.spaceConfirmed && <Tag tone="green">공간 확정</Tag>}
        {urgent && <Tag tone="red"><Ic n="flame" />{urgent}</Tag>}
        <span className="flex-1" />
        <SaveRecruitButton r={r} />
      </div>
      <div className="font-bold text-[15px] leading-snug">{r.title}</div>
      <div className="text-[13px] text-ink-500 mt-1 flex items-center flex-wrap"><Ic n="pin" />{r.region}{sp ? ` · ${sp.name}` : ''}<span className="mx-1">·</span><Ic n="calendar" />{period(r.period)}</div>
      <div className="flex items-center gap-1 mt-2.5">
        {r.slots.map((s) => (
          <span key={s.id} className={cx('h-2 flex-1 rounded-full border', SLOT_STYLE[s.status])} />
        ))}
      </div>
      <div className="flex items-end justify-between mt-2.5">
        <div className="flex items-center gap-1.5">
          <BrandLogo brand={host} size={22} />
          <span className="text-[13px] font-medium">{host.name}</span>
        </div>
        <div className="text-right">
          <div className="text-[12px] text-ink-500">{r.slotMode === 'hanger' ? '행거 1개' : '1자리'} 분담금</div>
          <div className="font-extrabold text-brand-600">{manwon(share)}</div>
        </div>
      </div>
      <div className="text-[12px] text-ink-700 mt-1">남은 자리 <b>{empty}</b> / {r.slots.length}</div>
      {reasons && reasons.length > 0 && (
        <div className="mt-2.5 pt-2.5 border-t border-ink-100 space-y-0.5">
          {reasons.slice(0, 3).map((x) => <div key={x} className="text-[12px] text-ink-700 flex"><span className="w-1 h-1 bg-ink-900 mt-[7px] mr-2 shrink-0" />{x}</div>)}
        </div>
      )}
    </Card>
  );
}

export function RecruitsTab({ initial }: { initial?: '찜' }) {
  const { db, brand } = useMe();
  const [st, setSt] = useState<RecruitStatus | '전체' | '찜'>(initial ?? '전체');
  const [region, setRegion] = useState<Region | '전체'>('전체');
  const saved = brand?.savedRecruits ?? [];
  const list = db.recruitments.filter((r) => (st === '전체' || (st === '찜' ? saved.includes(r.id) : r.status === st)) && (region === '전체' || r.region === region));
  const picks = brand
    ? db.recruitments.map((r) => ({ r, ...recruitFit(db, brand, r) })).filter((x) => x.score >= 5).sort((a, b) => b.score - a.score).slice(0, 3)
    : [];
  return (
    <div>
      <ScreenTitle right={<Button size="sm" onClick={() => guard(() => navigate({ name: 'recruitNew' }))}>+ 모집글 쓰기</Button>}>같이 열기</ScreenTitle>
      <p className="px-4 text-[13px] text-ink-500 -mt-1 mb-2">함께 팝업을 열 팀원을 모아요. 정원이 차면 자동으로 팀이 만들어져요.</p>
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar px-4 pb-2">
        {(['전체', ...(brand ? (['찜'] as const) : []), '모집 중', '협의 중', '마감'] as const).map((s) => (
          <Chip key={s} active={st === s} onClick={() => setSt(s)}>{s === '찜' ? <><Ic n="heart" />찜 {saved.length}</> : s}</Chip>
        ))}
        <span className="w-px bg-ink-300 mx-1" />
        {(['전체', ...REGIONS] as const).map((r) => <Chip key={'r' + r} active={region === r} onClick={() => setRegion(r)}>{r === '전체' ? '모든 지역' : r}</Chip>)}
      </div>
      {brand && region !== '전체' && (() => {
        const on = !!brand.recruitAlertRegions?.includes(region);
        return (
          <div className="mx-4 mb-2 mt-1 flex items-center gap-2 rounded-md bg-white border border-ink-100 px-3 py-2.5">
            <span className="text-[13px] flex-1">{on ? `${region} 새 모집글 알림 받는 중` : `${region}에 새 모집글이 올라오면 알려 드릴까요?`}</span>
            <button onClick={() => toggleRecruitAlert(brand.id, region)} className={cx('h-8 px-3 rounded-md text-[12px] font-bold shrink-0', on ? 'bg-ink-100 text-ink-700' : 'bg-brand-500 text-white')}>{on ? '끄기' : '알림 받기'}</button>
          </div>
        );
      })()}
      {brand && picks.length > 0 && st === '전체' && region === '전체' && (
        <section className="mt-2 mb-4">
          <h2 className="px-4 text-[17px] font-extrabold tracking-tight">내 브랜드와 맞는 모집글</h2>
          <p className="px-4 text-xs text-ink-500 mt-0.5 mb-2.5">빈자리 카테고리, 팝업 가능 기간, 모집자와의 무드로 골랐어요</p>
          <div className="flex gap-2.5 overflow-x-auto no-scrollbar px-4 pb-1">
            {picks.map((x) => (
              <div key={x.r.id} className={picks.length === 1 ? 'w-full' : 'w-[300px] shrink-0'}><RecruitCard db={db} r={x.r} reasons={x.reasons} /></div>
            ))}
          </div>
          <h2 className="px-4 text-[17px] font-extrabold tracking-tight mt-8">전체 모집글</h2>
        </section>
      )}
      <div className="px-4 space-y-3 mt-2">
        {list.map((r) => <RecruitCard key={r.id} db={db} r={r} />)}
        {!list.length && <Empty action={st !== '전체' ? { label: '전체 모집글 보기', onClick: () => setSt('전체') } : undefined}>{st === '찜' ? '찜한 모집글이 없어요. 마음에 드는 글의 하트를 눌러 두세요' : '조건에 맞는 모집글이 없어요'}</Empty>}
      </div>
    </div>
  );
}

export function RecruitDetail({ id }: { id: string }) {
  const { db, brand, role } = useMe();
  const r = db.recruitments.find((x) => x.id === id);
  const [applyOpen, setApplyOpen] = useState(false);
  const [slotId, setSlotId] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  if (!r) return <Empty>모집글을 찾을 수 없어요</Empty>;
  const host = brandById(db, r.hostBrandId)!;
  const isHost = brand?.id === r.hostBrandId;
  const sp = spaceById(db, r.spaceId);
  const apps = db.recruitApplications.filter((a) => a.recruitmentId === r.id);
  const myApp = brand && apps.find((a) => a.brandId === brand.id && a.status !== 'rejected');
  const inSlot = brand && r.slots.some((s) => s.brandId === brand.id);
  const empties = r.slots.filter((s) => s.status === '비어 있음');
  const totalHangers = r.slots.reduce((s, x) => s + x.hangers, 0);

  return (
    <div className="bg-white min-h-screen">
      <SubHeader
        title="모집글"
        right={
          <div className="flex items-center gap-3 pr-2 pt-1">
            {r.status !== '마감' && <button className="text-[13px] font-semibold text-ink-700" onClick={() => shareLink(r.title, `${r.title} · 빈자리 ${empties.length}개 · OFF STAGE에서 같이 열 브랜드를 찾아요`)}>공유</button>}
            <SaveRecruitButton r={r} />
          </div>
        }
      />
      <div className="p-4">
        <div className="flex items-center gap-1.5 mb-2">
          <StatusPill status={r.status} />
          <Tag>{r.slotMode === 'hanger' ? '행거 단위' : '카테고리 슬롯'}</Tag>
        </div>
        <h1 className="text-xl font-extrabold leading-snug">{r.title}</h1>
        <p className="text-sm text-ink-700 mt-2 leading-relaxed">{r.intro}</p>
        <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
          <Info label="희망 지역" value={r.region} />
          <Info label="일정" value={period(r.period)} />
          <Info label="총 예산" value={manwon(r.totalBudget)} />
          <Info label={r.slotMode === 'hanger' ? '행거 1개 분담금' : '1자리 분담금'} value={manwon(slotShare(r.totalBudget, r.slots, 1, r.slotMode))} accent />
        </div>
        <div className="mt-3 rounded-md border border-ink-100 p-3 text-sm">
          <div className="text-[12px] text-ink-500 mb-0.5">공간</div>
          {r.spaceConfirmed && sp ? (
            <button className="font-semibold underline underline-offset-2" onClick={() => navigate({ name: 'space', id: sp.id })}><Ic n="check" />확정: {sp.name} ›</button>
          ) : (
            <span className="font-semibold">아직 미정 · 팀이 꾸려지면 함께 찾아요</span>
          )}
        </div>

        {brand && !isHost && !inSlot && (() => {
          // 이미 자리를 잡은 브랜드들과 나의 평균 궁합
          const members = [...new Set(r.slots.map((x) => x.brandId).filter((id): id is string => !!id && id !== brand.id))].map((id) => brandById(db, id)!).filter(Boolean);
          if (!members.length) return null;
          const scores = members.map((b) => ({ b, m: matchScore(db, brand, b) }));
          const pct = matchPct(scores.reduce((sum, x) => sum + x.m.score, 0) / scores.length);
          const fit = recruitFit(db, brand, r);
          return (
            <div className="mt-4 border border-ink-900 p-4">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold">이 팀과 {brand.name}의 궁합</span>
                <span className="text-[13px] font-extrabold text-brand-600">{pct}%</span>
              </div>
              <div className="h-2 rounded-full bg-white mt-2 overflow-hidden"><div className="h-full bg-brand-500" style={{ width: `${pct}%` }} /></div>
              <div className="flex flex-wrap gap-1 mt-2.5">
                {scores.map(({ b, m }) => <span key={b.id} className="text-[12px] bg-white rounded-md px-2 py-0.5">{b.name} {matchPct(m.score)}%</span>)}
              </div>
              {fit.reasons.length > 0 && <div className="mt-2 space-y-0.5">{fit.reasons.slice(0, 2).map((x) => <div key={x} className="text-[12px] text-ink-700 flex"><span className="w-1 h-1 bg-ink-900 mt-[7px] mr-2 shrink-0" />{x}</div>)}</div>}
            </div>
          );
        })()}

        <h3 className="text-[17px] font-extrabold tracking-tight mt-9 mb-3">자리 구성 <span className="text-ink-500 text-sm font-normal">{r.slots.length - empties.length}/{r.slots.length}</span></h3>
        <div className={cx('grid gap-2', r.slotMode === 'hanger' ? 'grid-cols-3' : 'grid-cols-2')}>
          {r.slots.map((s) => {
            const b = brandById(db, s.brandId);
            return (
              <div key={s.id} className={cx('rounded-md border p-2.5 min-h-[72px] flex flex-col justify-between', SLOT_STYLE[s.status])}>
                <div className="text-[12px] font-bold">{r.slotMode === 'hanger' ? <><Ic n="hanger" />{s.label}</> : s.label}</div>
                <div>
                  <div className="text-[12px] opacity-80">{s.status}</div>
                  {b && <div className="text-[12px] font-semibold truncate">{b.name}</div>}
                </div>
              </div>
            );
          })}
        </div>
        {r.slotMode === 'hanger' && <p className="text-[12px] text-ink-500 mt-2">분담금은 행거 수에 비례해요 (총 {totalHangers}개).</p>}

        <h3 className="text-[17px] font-extrabold tracking-tight mt-9 mb-3">모집자</h3>
        <Card className="p-3 flex items-center gap-3" onClick={() => navigate({ name: 'brand', id: host.id })}>
          <BrandLogo brand={host} size={44} />
          <div className="flex-1">
            <div className="font-bold">{host.name}</div>
            <TrustLine db={db} subjectId={host.id} compact />
          </div>
          <span className="text-ink-400">›</span>
        </Card>

        {isHost && (
          <>
            <div className="flex items-center justify-between mt-6 mb-2">
              <h3 className="text-[17px] font-extrabold tracking-tight">지원자 {apps.length}</h3>
              {empties.length > 0 && (
                <Button size="sm" variant="secondary" onClick={() => simulateApplicants(r.id)}>지원자 불러오기 <Demo /></Button>
              )}
            </div>
            {apps.length === 0 && <div className="text-sm text-ink-500 py-3">아직 지원자가 없어요.</div>}
            <div className="space-y-2">
              {apps.map((a) => {
                const b = brandById(db, a.brandId)!;
                const slot = r.slots.find((s) => s.id === a.slotId);
                return (
                  <Card key={a.id} className="p-3.5">
                    <div className="flex items-center gap-2.5">
                      <BrandLogo brand={b} size={40} />
                      <button className="flex-1 text-left" onClick={() => navigate({ name: 'brand', id: b.id })}>
                        <div className="font-bold text-sm">{b.name} <span className="text-ink-500 font-normal text-xs">· {slot?.label} 지원</span></div>
                        <TrustLine db={db} subjectId={b.id} compact />
                      </button>
                      <StatusPill status={a.status} />
                    </div>
                    {(() => {
                      const m = matchScore(db, host, b);
                      return (
                        <div className="mt-2 border-l-2 border-brand-500 bg-white px-2.5 py-1.5 text-[12px] text-brand-700">
                          <b>나와 궁합 {matchPct(m.score)}%</b>{m.reasons[0] ? ` · ${m.reasons[0]}` : ''}
                        </div>
                      );
                    })()}
                    <div className="mt-2"><ThemeTagList tags={b.tags} limit={5} /></div>
                    <p className="text-sm text-ink-700 mt-2">"{a.message}"</p>
                    {a.status === 'pending' && (
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <Button variant="secondary" size="sm" onClick={() => decideApplication(a.id, false)}>거절</Button>
                        <Button size="sm" onClick={() => decideApplication(a.id, true)}>수락</Button>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </>
        )}
        {r.teamId && (isHost || inSlot) && (
          <Button full variant="dark" className="mt-4" onClick={() => navigate({ name: 'team', id: r.teamId! })}>팀 공간으로 가기</Button>
        )}
      </div>

      {role === 'brand' && !isHost && !inSlot && r.status !== '마감' && (
        <div className="sticky bottom-0 bg-white border-t border-ink-100 p-3 pb-safe">
          {myApp ? (
            <Button full disabled>지원 완료 · 모집자 검토 중</Button>
          ) : (
            <Button full size="lg" disabled={!empties.length} onClick={() => guard(() => { setSlotId(empties[0]?.id ?? null); setApplyOpen(true); })}>
              {empties.length ? '지원하기' : '빈 자리가 없어요'}
            </Button>
          )}
        </div>
      )}
      {role === 'landlord' && r.status !== '마감' && (
        <div className="sticky bottom-0 bg-white border-t border-ink-100 p-3 pb-safe">
          <ProposeSpaceButton recruitmentId={r.id} />
        </div>
      )}

      <Sheet open={applyOpen} onClose={() => setApplyOpen(false)} title="지원하기">
        <Field label="원하는 자리">
          <div className="flex flex-wrap gap-1.5">
            {empties.map((s) => <Chip key={s.id} active={slotId === s.id} onClick={() => setSlotId(s.id)}>{s.label}</Chip>)}
          </div>
        </Field>
        <Field label="지원 메시지" hint={`${msg.length}/200`}>
          <textarea className={textareaCls} maxLength={200} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="어떤 상품으로 함께하고 싶은지 알려 주세요" />
        </Field>
        {brand && (
          <div className="mb-4">
            <div className="text-[13px] font-semibold text-ink-700 mb-1.5">자동 첨부되는 내 프로필</div>
            <Card className="p-3 flex items-center gap-2.5">
              <BrandLogo brand={brand} size={36} />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm">{brand.name}</div>
                <TrustLine db={db} subjectId={brand.id} compact />
              </div>
              <Tag>룩북 {brand.lookbook.length}장</Tag>
            </Card>
          </div>
        )}
        <Button full size="lg" disabled={!slotId || !msg.trim()} onClick={() => { applyRecruitment(r.id, brand!.id, slotId!, msg); setApplyOpen(false); setMsg(''); }}>지원서 보내기</Button>
      </Sheet>
    </div>
  );
}

function Info({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded border border-ink-300 p-3">
      <div className="text-[12px] text-ink-500">{label}</div>
      <div className={cx('font-bold mt-0.5', accent && 'text-brand-600')}>{value}</div>
    </div>
  );
}

export function RecruitNew() {
  const { db, brand } = useMe();
  const myCat = (brand?.tags.categories[0] ?? '의류') as Category;
  const [d, setD] = useState<RecruitDraft>({
    title: '', intro: '', region: '성동구', period: { start: '2026-12-11', end: '2026-12-13' }, totalBudget: 2400000,
    spaceConfirmed: false, spaceId: undefined, slotMode: 'category',
    categorySlots: [{ category: myCat, count: 1 }, { category: myCat === '주얼리' ? '의류' : '주얼리', count: 1 }, { category: '가방', count: 1 }],
    hostCategory: myCat, hangerCount: 6, hostHangers: 2,
  });
  const slotsPreview = d.slotMode === 'category' ? d.categorySlots.reduce((s, c) => s + c.count, 0) : d.hangerCount;
  const share = slotsPreview ? d.totalBudget / slotsPreview : 0;
  const ok = d.title.trim() && slotsPreview >= 2 && (!d.spaceConfirmed || d.spaceId) && (d.slotMode === 'hanger' || d.categorySlots.some((c) => c.category === d.hostCategory && c.count > 0));
  const regionSpaces = db.spaces.filter((s) => s.region === d.region);
  const days = Math.max(1, Math.round((new Date(d.period.end).getTime() - new Date(d.period.start).getTime()) / 86400000) + 1);
  const avgFee = regionSpaces.length ? regionSpaces.reduce((sum, x) => sum + x.dailyFee, 0) / regionSpaces.length : 0;

  // 내 브랜드 태그로 제목·소개 초안을 만든다
  const fillDraft = () => {
    if (!brand) return;
    const mood = brand.tags.moods[0] ?? '감각적인';
    const want = d.categorySlots.map((c) => c.category).filter((c) => c !== myCat);
    setD({
      ...d,
      title: `${d.region} ${mood} 무드 공동 팝업, 같이 열 브랜드 찾아요`,
      intro: `${brand.name}입니다. ${brand.intro}\n${mood} 무드로 ${d.region}에서 ${days}일 동안 함께 팝업을 열 ${want.join('·') || '다른 카테고리'} 브랜드를 찾아요. 고객층은 ${brand.tags.ages.join(', ') || '20~30대'}, 가격대는 ${brand.tags.price}예요.`,
      totalBudget: avgFee ? Math.round((avgFee * days) / 10000) * 10000 : d.totalBudget,
    });
  };

  return (
    <div className="bg-white min-h-screen">
      <SubHeader title="모집글 쓰기" />
      <div className="p-4">
        {brand && (
          <button onClick={fillDraft} className="w-full mb-4 border border-ink-900 px-4 py-3 text-left flex items-center gap-3">
            <Icon name="pencil" className="w-6 h-6 shrink-0 text-brand-600" />
            <span className="flex-1">
              <span className="block text-sm font-bold">내 브랜드 정보로 초안 채우기</span>
              <span className="block text-[12px] text-ink-500">무드·고객층 태그로 제목과 소개를 쓰고, {d.region} 평균 대관료로 예산을 잡아요</span>
            </span>
          </button>
        )}
        <Field label="제목" required>
          <input className={inputCls} value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} placeholder="예) 연말 성수 공동 팝업 같이 해요" />
        </Field>
        <Field label="소개">
          <textarea className={textareaCls} value={d.intro} onChange={(e) => setD({ ...d, intro: e.target.value })} placeholder="어떤 무드의 팝업인지, 어떤 브랜드를 찾는지" />
        </Field>
        <Field label="희망 지역">
          <div className="flex flex-wrap gap-1.5">
            {REGIONS.map((r) => <Chip key={r} active={d.region === r} onClick={() => setD({ ...d, region: r, spaceId: undefined })}>{r}</Chip>)}
          </div>
        </Field>
        <Field label="일정">
          <div className="flex items-center gap-2">
            <input type="date" className={inputCls} value={d.period.start} onChange={(e) => setD({ ...d, period: { ...d.period, start: e.target.value } })} />
            <span>~</span>
            <input type="date" className={inputCls} value={d.period.end} onChange={(e) => setD({ ...d, period: { ...d.period, end: e.target.value } })} />
          </div>
        </Field>
        <Field label="총 예산" hint={avgFee ? `${d.region} 공간 평균 대관료 ${manwon(avgFee)}/일 × ${days}일 ≈ ${manwon(avgFee * days)}` : '대관료와 공통비를 합친 예상 금액'}>
          <div className="flex items-center gap-2">
            <input type="number" className={inputCls} step={10} value={d.totalBudget / 10000} onChange={(e) => setD({ ...d, totalBudget: Number(e.target.value) * 10000 })} />
            <span className="text-sm shrink-0">만원</span>
          </div>
          {avgFee > 0 && days > 0 && Math.abs(d.totalBudget - avgFee * days) > 100000 && (
            <button type="button" className="mt-1.5 text-[12px] font-semibold text-brand-600" onClick={() => setD({ ...d, totalBudget: Math.round((avgFee * days) / 10000) * 10000 })}>
              평균 예상액 {manwon(Math.round((avgFee * days) / 10000) * 10000)}으로 바꾸기 ›
            </button>
          )}
        </Field>
        <Field label="공간 확정 여부">
          <Segmented items={[{ key: 'no', label: '아직 미정' }, { key: 'yes', label: '확정됨' }]} value={d.spaceConfirmed ? 'yes' : 'no'} onChange={(k) => setD({ ...d, spaceConfirmed: k === 'yes' })} />
          {d.spaceConfirmed && (
            <div className="mt-2 space-y-1.5">
              {regionSpaces.map((s) => (
                <button key={s.id} type="button" onClick={() => setD({ ...d, spaceId: s.id })} className={cx('w-full text-left rounded-md border p-3 text-sm', d.spaceId === s.id ? 'border-ink-900 bg-ink-100' : 'border-ink-300')}>
                  <b>{s.name}</b> <span className="text-ink-500">· 1일 {manwon(s.dailyFee)} · {s.areaM2}㎡</span>
                </button>
              ))}
              {!regionSpaces.length && <p className="text-xs text-ink-500">{d.region}에 등록된 공간이 없어요.</p>}
            </div>
          )}
        </Field>
        <Field label="자리 구성 방식">
          <Segmented items={[{ key: 'category', label: '카테고리 슬롯' }, { key: 'hanger', label: '행거 단위' }]} value={d.slotMode} onChange={(k) => setD({ ...d, slotMode: k })} />
        </Field>
        {d.slotMode === 'category' ? (
          <div className="mb-4 -mt-1">
            {d.categorySlots.map((c, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <select className={inputCls} value={c.category} onChange={(e) => setD({ ...d, categorySlots: d.categorySlots.map((x, j) => (j === i ? { ...x, category: e.target.value as Category } : x)) })}>
                  {CATEGORIES.map((cat) => <option key={cat}>{cat}</option>)}
                </select>
                <Button variant="secondary" onClick={() => setD({ ...d, categorySlots: d.categorySlots.map((x, j) => (j === i ? { ...x, count: Math.max(0, x.count - 1) } : x)) })}>−</Button>
                <span className="w-12 text-center font-bold">{c.count}자리</span>
                <Button variant="secondary" onClick={() => setD({ ...d, categorySlots: d.categorySlots.map((x, j) => (j === i ? { ...x, count: x.count + 1 } : x)) })}>+</Button>
              </div>
            ))}
            <button type="button" className="text-sm text-brand-600 font-semibold" onClick={() => setD({ ...d, categorySlots: [...d.categorySlots, { category: '기타 액세서리', count: 1 }] })}>+ 카테고리 추가</button>
            <div className="mt-3 text-[13px] font-semibold text-ink-700 mb-1.5">내가 쓸 자리</div>
            <div className="flex flex-wrap gap-1.5">
              {[...new Set(d.categorySlots.filter((c) => c.count > 0).map((c) => c.category))].map((c) => <Chip key={c} active={d.hostCategory === c} onClick={() => setD({ ...d, hostCategory: c })}>{c}</Chip>)}
            </div>
          </div>
        ) : (
          <div className="mb-4 -mt-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm w-20">전체 행거</span>
              <Button variant="secondary" onClick={() => setD({ ...d, hangerCount: Math.max(2, d.hangerCount - 1), hostHangers: Math.min(d.hostHangers, d.hangerCount - 2) })}>−</Button>
              <span className="w-12 text-center font-bold">{d.hangerCount}개</span>
              <Button variant="secondary" onClick={() => setD({ ...d, hangerCount: d.hangerCount + 1 })}>+</Button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm w-20">내 행거</span>
              <Button variant="secondary" onClick={() => setD({ ...d, hostHangers: Math.max(1, d.hostHangers - 1) })}>−</Button>
              <span className="w-12 text-center font-bold">{d.hostHangers}개</span>
              <Button variant="secondary" onClick={() => setD({ ...d, hostHangers: Math.min(d.hangerCount - 1, d.hostHangers + 1) })}>+</Button>
            </div>
            <div className="grid grid-cols-6 gap-1 mt-3">
              {Array.from({ length: d.hangerCount }).map((_, i) => (
                <div key={i} className={cx('h-10 rounded-lg border text-[11px] flex items-center justify-center', i < d.hostHangers ? SLOT_STYLE['모집자'] : SLOT_STYLE['비어 있음'])}>{i + 1}</div>
              ))}
            </div>
          </div>
        )}
        <div className="border border-ink-900 p-4 mb-4">
          <div className="text-[13px] text-brand-700">{d.slotMode === 'hanger' ? '행거 1개' : '1자리'} 분담금 (자동 계산)</div>
          <div className="text-2xl font-extrabold text-brand-700">{manwon(share)}</div>
          <div className="text-[12px] text-brand-700/80">총 {manwon(d.totalBudget)} ÷ {slotsPreview}{d.slotMode === 'hanger' ? '개 행거' : '자리'}</div>
          {d.slotMode === 'hanger' && <div className="text-[12px] text-brand-700/80 mt-0.5">내 부담: {manwon(share * d.hostHangers)} (행거 {d.hostHangers}개)</div>}
        </div>
        <Button full size="lg" disabled={!ok} onClick={() => createRecruitment(brand!.id, d)}>모집글 올리기</Button>
      </div>
    </div>
  );
}

