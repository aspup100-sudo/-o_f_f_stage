import { useState } from 'react';
import { useMe, guard } from '@/store/hooks';
import { navigate } from '@/store/store';
import { answerSpaceQuestion, applySpace, toggleSaveSpace, askSpaceQuestion, openDirectChat, openWeekendsOfMonth, toggleAvailability } from '@/store/actions';
import { displayName, manwon, soonOpenDays, period, popupById, spaceById, teamById, teamsOfBrand, spaceLatLng, trustScore } from '@/store/logic';
import { KakaoMap } from '@/components/KakaoMap';
import { ScreenTitle, TrustLine } from '@/components/common';
import { Avatar, Button, Card, Chip, Segmented, cx, Demo, Empty, Field, GradeBadge, Icon, inputCls, Sheet, StatusPill, SubHeader, Swatch, Tag, textareaCls, Ic } from '@/components/ui';
import { FACILITIES, REGIONS, type Region, type Space } from '@/types';
import type { DB } from '@/data/mock';
import { ReviewGroup } from './BrandProfile';
import { TeamIntroPage } from './Team';
import { DEMO_TODAY } from '@/data/mock';
import { RentalsBrowse } from './Rental';

function SaveSpaceButton({ spaceId, inline }: { spaceId: string; inline?: boolean }) {
  const { brand } = useMe();
  if (!brand) return null;
  const on = !!brand.savedSpaces?.includes(spaceId);
  return (
    <button
      aria-label={on ? '공간 찜 해제' : '공간 찜하기'}
      onClick={(e) => { e.stopPropagation(); guard(() => toggleSaveSpace(brand.id, spaceId)); }}
      className={inline ? 'w-12 h-12 shrink-0 rounded-xl border border-ink-300 flex items-center justify-center' : 'absolute z-10 top-2 right-2 w-9 h-9 rounded-full bg-white/90 shadow flex items-center justify-center'}
    >
      <Icon name="heart" filled={on} className={cx('w-[18px] h-[18px]', on ? 'text-red-500' : 'text-ink-700')} />
    </button>
  );
}

export function SpaceCard({ db, s, onClick }: { db: DB; s: Space; onClick?: () => void }) {
  const ll = db.landlords.find((l) => l.id === s.landlordId)!;
  const openDays = db.availability.filter((a) => a.spaceId === s.id && a.status === 'open' && a.date > DEMO_TODAY).length;
  return (
    <Card className="overflow-hidden" onClick={onClick ?? (() => navigate({ name: 'space', id: s.id }))}>
      <div className="relative flex h-32 gap-0.5">
        <SaveSpaceButton spaceId={s.id} />
        <Swatch hue={s.photoHues[0] ?? 30} pattern="solid" rounded="" className="flex-[2]" label={`${s.areaM2}㎡`} />
        <div className="flex-1 flex flex-col gap-0.5">
          <Swatch hue={s.photoHues[1] ?? 60} pattern="grid" rounded="" className="flex-1" />
          <Swatch hue={s.photoHues[2] ?? 90} pattern="stripe" rounded="" className="flex-1" />
        </div>
      </div>
      <div className="p-3.5">
        <div className="flex items-center gap-1 flex-wrap mb-1">
          <Tag>{s.region}</Tag>
          {s.teamRental && <Tag tone="green">팀 단위 대관 가능</Tag>}
          {s.fashionOnly && <Tag tone="purple">업종 고정(패션)</Tag>}
          {s.lastMinutePct && soonOpenDays(db, s.id) > 0 && <Tag tone="red"><Ic n="bolt" />2주 안 {s.lastMinutePct}% 할인</Tag>}
        </div>
        <div className="font-bold text-[15px]">{s.name}</div>
        <div className="flex items-end justify-between mt-1">
          <div className="text-[12px] text-ink-500">
            {s.areaM2}㎡ · 최소 {s.minDays}일 · 비는 날 {openDays}일
            <div className="mt-1"><TrustLine db={db} subjectId={ll.id} compact /></div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-ink-500">1일 대관료</div>
            <div className="font-extrabold text-brand-600">{manwon(s.dailyFee)}</div>
            {s.teamRental && <div className="text-[11px] text-ink-700 mt-0.5">3곳이 나누면 <b>{manwon(s.dailyFee / 3)}</b></div>}
          </div>
        </div>
      </div>
    </Card>
  );
}

export function SpacesTab({ initial }: { initial?: '찜' }) {
  const { db, brand } = useMe();
  const [region, setRegion] = useState<Region | '전체' | '찜'>(initial ?? '전체');
  const [maxFee, setMaxFee] = useState<number>(0);
  const [minArea, setMinArea] = useState(0);
  const [date, setDate] = useState('');
  const [team, setTeam] = useState(false);
  const [fashion, setFashion] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sort, setSort] = useState<'base' | 'fee' | 'open' | 'deal'>('base');
  const openDays = (id: string) => db.availability.filter((a) => a.spaceId === id && a.status === 'open' && a.date > DEMO_TODAY).length;
  const filterCount = (maxFee ? 1 : 0) + (minArea ? 1 : 0) + (team ? 1 : 0) + (fashion ? 1 : 0) + (date ? 1 : 0);
  const list = db.spaces
    .filter((s) => region === '전체' || (region === '찜' ? !!brand?.savedSpaces?.includes(s.id) : s.region === region))
    .filter((s) => !maxFee || s.dailyFee <= maxFee)
    .filter((s) => s.areaM2 >= minArea)
    .filter((s) => !team || s.teamRental)
    .filter((s) => !fashion || s.fashionOnly)
    .filter((s) => !date || db.availability.some((a) => a.spaceId === s.id && a.date === date && a.status === 'open'))
    .sort((a, b) => (sort === 'fee' ? a.dailyFee - b.dailyFee : sort === 'open' ? openDays(b.id) - openDays(a.id) : sort === 'deal' ? (b.lastMinutePct ?? 0) - (a.lastMinutePct ?? 0) : 0));
  const [mode, setMode] = useState<'space' | 'rental'>('space');
  if (mode === 'rental')
    return (
      <div>
        <ScreenTitle>공간·장비</ScreenTitle>
        <div className="px-4 mb-3"><Segmented items={[{ key: 'space', label: '공간 찾기' }, { key: 'rental', label: '장비 렌탈' }]} value={mode} onChange={setMode} /></div>
        <RentalsBrowse />
      </div>
    );
  return (
    <div>
      <ScreenTitle>공간·장비</ScreenTitle>
      <div className="px-4 mb-3"><Segmented items={[{ key: 'space', label: '공간 찾기' }, { key: 'rental', label: '장비 렌탈' }]} value={mode} onChange={setMode} /></div>
      <div className="px-4 mb-3 flex gap-1.5 overflow-x-auto no-scrollbar">
        <button onClick={() => setFilterOpen(true)} className={cx('h-8 px-3 rounded-full border text-xs font-semibold shrink-0 flex items-center gap-1', filterCount ? 'bg-ink-900 text-white border-ink-900' : 'bg-white border-ink-300')}>
          <Icon name="search" className="w-3.5 h-3.5" /> 조건{filterCount > 0 && ` ${filterCount}`}
        </button>
        {(['전체', ...(brand ? (['찜'] as const) : []), ...REGIONS] as const).map((r) => <Chip key={r} active={region === r} onClick={() => setRegion(r)}>{r === '찜' ? <><Ic n="heart" />찜 {brand?.savedSpaces?.length ?? 0}</> : r}</Chip>)}
      </div>
      <Sheet open={filterOpen} onClose={() => setFilterOpen(false)} title="공간 조건">
        <div className="text-[13px] font-semibold mb-2">1일 대관료</div>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {[[0, '전체'], [500000, '50만원 이하'], [1000000, '100만원 이하'], [1500000, '150만원 이하']].map(([v, l]) => (
            <Chip key={l} active={maxFee === v} onClick={() => setMaxFee(v as number)}>{l}</Chip>
          ))}
        </div>
        <div className="text-[13px] font-semibold mb-2">면적</div>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {[[0, '전체'], [30, '30㎡ 이상'], [50, '50㎡ 이상']].map(([v, l]) => (
            <Chip key={l} active={minArea === v} onClick={() => setMinArea(v as number)}>{l}</Chip>
          ))}
        </div>
        <div className="text-[13px] font-semibold mb-2">조건</div>
        <div className="flex flex-wrap gap-1.5 mb-4">
          <Chip active={team} onClick={() => setTeam(!team)}>팀 단위 대관 가능</Chip>
          <Chip active={fashion} onClick={() => setFashion(!fashion)}>업종 고정(패션)</Chip>
        </div>
        <div className="text-[13px] font-semibold mb-2">이 날 비어 있는 공간</div>
        <input type="date" value={date} min="2026-10-26" onChange={(e) => setDate(e.target.value)} className={inputCls + ' mb-5'} />
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => { setMaxFee(0); setMinArea(0); setTeam(false); setFashion(false); setDate(''); }}>초기화</Button>
          <Button full onClick={() => setFilterOpen(false)}>{list.length}곳 보기</Button>
        </div>
      </Sheet>
      <div className="px-4 mb-2 flex items-center justify-between">
        <span className="text-[13px] text-ink-500">공간 <b className="text-ink-900">{list.length}</b>곳</span>
        <select aria-label="공간 정렬" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="h-8 rounded-full border border-ink-300 bg-white px-2.5 text-[12px]">
          <option value="base">기본순</option>
          <option value="fee">대관료 낮은 순</option>
          <option value="open">비는 날 많은 순</option>
          <option value="deal">할인 중 먼저</option>
        </select>
      </div>
      <div className="px-4 space-y-3">
        {list.map((s) => <SpaceCard key={s.id} db={db} s={s} />)}
        {!list.length && <Empty icon="building" action={{ label: '조건 초기화', onClick: () => { setRegion('전체'); setMaxFee(0); setMinArea(0); setTeam(false); setFashion(false); setDate(''); } }}>{region === '찜' ? '찜한 공간이 없어요. 마음에 드는 공간의 하트를 눌러 두세요' : '조건에 맞는 공간이 없어요'}</Empty>}
      </div>
    </div>
  );
}

const MONTHS = ['2026-10', '2026-11', '2026-12', '2027-01'];

export function AvailabilityCalendar({ db, spaceId, editable }: { db: DB; spaceId: string; editable?: boolean }) {
  const [mi, setMi] = useState(1);
  const ym = MONTHS[mi];
  const first = new Date(ym + '-01T00:00:00');
  const start = first.getDay();
  const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells: (string | null)[] = [...Array(start).fill(null), ...Array.from({ length: days }, (_, i) => `${ym}-${String(i + 1).padStart(2, '0')}`)];
  const stat = (d: string) => db.availability.find((a) => a.spaceId === spaceId && a.date === d)?.status;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <button disabled={mi === 0} onClick={() => setMi(mi - 1)} className="w-8 h-8 disabled:opacity-30">‹</button>
        <div className="font-bold">{first.getFullYear()}년 {first.getMonth() + 1}월</div>
        <button disabled={mi === MONTHS.length - 1} onClick={() => setMi(mi + 1)} className="w-8 h-8 disabled:opacity-30">›</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-ink-500 mb-1">
        {'일월화수목금토'.split('').map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={'e' + i} />;
          const st = stat(d);
          const past = d <= DEMO_TODAY;
          return (
            <button
              key={d}
              disabled={!editable || past || st === 'booked'}
              onClick={() => toggleAvailability(spaceId, d)}
              className={cx(
                'aspect-square rounded-lg text-[12px] font-semibold flex items-center justify-center',
                past ? 'text-ink-300' : st === 'open' ? 'bg-emerald-100 text-emerald-800' : st === 'booked' ? 'bg-ink-300/60 text-ink-500 line-through' : 'bg-white border border-ink-100 text-ink-700',
              )}
            >
              {Number(d.slice(8))}
            </button>
          );
        })}
      </div>
      <div className="flex gap-3 text-[11px] text-ink-500 mt-2">
        <span><span className="inline-block w-2.5 h-2.5 rounded bg-emerald-200 mr-1" />비는 날</span>
        <span><span className="inline-block w-2.5 h-2.5 rounded bg-ink-300 mr-1" />예약됨</span>
        <span><span className="inline-block w-2.5 h-2.5 rounded border border-ink-300 mr-1" />미정</span>
      </div>
      {editable && (
        <div className="flex items-center justify-between mt-2">
          <p className="text-[11px] text-ink-500">날짜를 눌러 비는 날을 켜고 끄세요.</p>
          <Button size="sm" variant="secondary" onClick={() => openWeekendsOfMonth(spaceId, ym)}>이 달 주말 모두 열기</Button>
        </div>
      )}
    </div>
  );
}

export function SpaceDetail({ id }: { id: string }) {
  const { db, role, brand, userId, landlord } = useMe();
  const s = spaceById(db, id);
  const [applyOpen, setApplyOpen] = useState(false);
  const [q, setQ] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [photo, setPhoto] = useState(0);
  if (!s) return <Empty>공간을 찾을 수 없어요</Empty>;
  const ll = db.landlords.find((l) => l.id === s.landlordId)!;
  const isOwner = landlord?.id === s.landlordId;
  const llTrust = trustScore(db, ll.id);
  const reviews = db.reviews.filter((r) => !r.hidden && r.kind === 'brand_to_space' && r.targetId === s.id);
  const qnas = db.spaceQnas.filter((x) => x.spaceId === s.id);
  const past = s.pastPopupIds.map((p) => popupById(db, p)).filter(Boolean);

  return (
    <div className="bg-white min-h-screen">
      <SubHeader title={s.name} right={isOwner && <Button size="sm" variant="secondary" onClick={() => navigate({ name: 'spaceEdit', id: s.id })}>수정</Button>} />
      <div className="relative">
        <Swatch hue={s.photoHues[photo] ?? 30} pattern={(['solid', 'grid', 'stripe'] as const)[photo % 3]} rounded="" className="h-56" label={`사진 ${photo + 1}/${s.photoHues.length} · 실제 사진 자리`} />
        <div className="absolute bottom-2 right-2 flex gap-1">
          {s.photoHues.map((h, i) => (
            <button key={i} onClick={() => setPhoto(i)} className={cx('w-10 h-10 rounded-lg border-2', photo === i ? 'border-white' : 'border-transparent opacity-70')}>
              <Swatch hue={h} className="w-full h-full" rounded="rounded-md" />
            </button>
          ))}
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-center gap-1 flex-wrap mb-1.5">
          <Tag>{s.region}</Tag>
          {s.teamRental && <Tag tone="green">팀 단위 대관 가능</Tag>}
          {s.fashionOnly && <Tag tone="purple">업종 고정(패션)</Tag>}
        </div>
        <h1 className="text-xl font-extrabold">{s.name}</h1>
        <div className="text-[13px] text-ink-500 mt-0.5"><Ic n="pin" />{s.address}</div>
        {(() => {
          const [lat, lng] = spaceLatLng(s);
          return <KakaoMap pins={[{ id: s.id, lat, lng, label: s.name, tone: 'selected' }]} onSelect={() => {}} className="mt-3 w-full h-40 overflow-hidden border border-ink-300" fallback={null} />;
        })()}
        <p className="text-sm text-ink-700 mt-3 leading-relaxed">{s.intro}</p>
        <div className="grid grid-cols-3 mt-4 text-center border border-ink-300 divide-x divide-ink-300">
          <div className="py-2.5"><div className="text-[11px] text-ink-500">실측 면적</div><div className="font-bold">{s.areaM2}㎡ <span className="text-[11px] text-ink-500 font-normal">({(s.areaM2 / 3.3).toFixed(0)}평)</span></div></div>
          <div className="py-2.5"><div className="text-[11px] text-ink-500">1일 대관료</div><div className="font-bold text-brand-600">{manwon(s.dailyFee)}</div>{s.lastMinutePct && soonOpenDays(db, s.id) > 0 && <div className="text-[10px] text-red-600 font-bold">2주 안 {manwon(s.dailyFee * (1 - s.lastMinutePct / 100))}</div>}</div>
          <div className="py-2.5"><div className="text-[11px] text-ink-500">최소 대관</div><div className="font-bold">{s.minDays}일</div></div>
        </div>
        {s.fashionOnly && (
          <div className="mt-3 rounded-xl bg-violet-50 text-violet-800 text-[13px] p-3">
            <Ic n="shirt" />업종 고정(패션) 공간이에요. 이전 팀의 집기·연출을 이어 쓸 수 있는지 채팅으로 확인해 보세요.
          </div>
        )}

        <h3 className="font-bold mt-6 mb-2">설비</h3>
        <div className="grid grid-cols-2 gap-1.5">
          {FACILITIES.map((f) => {
            const has = s.facilities.includes(f);
            return (
              <div key={f} className={cx('flex items-center gap-2 text-sm rounded-lg px-3 py-2', has ? 'bg-emerald-50 text-emerald-800' : 'bg-ink-100/50 text-ink-300 line-through')}>
                <Icon name={has ? 'check' : 'x'} className="w-4 h-4" />
                {f}{f === '전기 용량' && has && s.electricKw ? ` ${s.electricKw}kW` : ''}
              </div>
            );
          })}
        </div>

        {role === 'brand' && s.facilities.length < FACILITIES.length && (
          <button onClick={() => navigate({ name: 'rentals' })} className="mt-2 w-full text-left text-[13px] rounded-xl bg-brand-50 text-brand-700 px-3 py-2.5 font-semibold">
            <Ic n="box" />없는 설비는 렌탈 제휴가로 빌릴 수 있어요 ›
          </button>
        )}

        <h3 className="font-bold mt-6 mb-2">비는 날</h3>
        <AvailabilityCalendar db={db} spaceId={s.id} editable={isOwner} />

        <h3 className="font-bold mt-6 mb-2">과거 팝업 이력</h3>
        {past.length === 0 && <div className="text-sm text-ink-500">아직 이력이 없어요</div>}
        <div className="space-y-1.5">
          {past.map((p) => (
            <button key={p!.id} onClick={() => navigate({ name: 'popup', id: p!.id })} className="w-full text-left rounded-xl border border-ink-100 px-3 py-2.5 text-sm flex items-center justify-between">
              <span><b>{p!.title}</b> <span className="text-ink-500">· {period(p!.period)}</span></span>
              <StatusPill status={p!.status} />
            </button>
          ))}
        </div>

        <h3 className="font-bold mt-6 mb-2">임대인</h3>
        <Card className="p-3.5 flex items-center gap-3">
          <Avatar name={ll.name} hue={150} size={44} />
          <div className="flex-1 min-w-0">
            <div className="font-bold">{ll.name}</div>
            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-ink-700">
              <GradeBadge grade={llTrust.grade} small /> 인증 대관 {llTrust.verifiedPopups}회{llTrust.avgRating !== null && ` · 평균 ${llTrust.avgRating.toFixed(1)}`}
            </div>
          </div>
        </Card>
        <div className="mt-4">
          <ReviewGroup title="브랜드가 남긴 공간 후기" reviews={reviews} />
        </div>

        <h3 className="font-bold mt-6 mb-2">공간 Q&A <span className="text-ink-500 font-normal text-sm">{qnas.length}</span></h3>
        <div className="space-y-2">
          {qnas.map((x) => (
            <div key={x.id} className="rounded-xl border border-ink-100 p-3 text-sm">
              <div><b className="text-brand-600">Q</b> {x.question} <span className="text-[11px] text-ink-500">· {displayName(db, x.authorId)}</span></div>
              {x.answer ? (
                <div className="mt-1.5 text-ink-700"><b className="text-emerald-600">A</b> {x.answer}</div>
              ) : isOwner ? (
                <div className="flex gap-1.5 mt-2">
                  <input className={inputCls + ' h-9'} placeholder="답변 입력" value={answers[x.id] ?? ''} onChange={(e) => setAnswers({ ...answers, [x.id]: e.target.value })} />
                  <Button size="sm" className="h-9" disabled={!answers[x.id]} onClick={() => answerSpaceQuestion(x.id, answers[x.id])}>답변</Button>
                </div>
              ) : (
                <div className="mt-1.5 text-[12px] text-ink-500">답변을 기다리고 있어요</div>
              )}
            </div>
          ))}
        </div>
        {!isOwner && role !== 'admin' && (
          <div className="mt-3">
            <div className="flex gap-1.5">
              <input className={inputCls} placeholder="모두가 볼 수 있는 질문을 남겨요" value={q} onChange={(e) => setQ(e.target.value)} />
              <Button variant="dark" disabled={!q.trim()} onClick={() => { askSpaceQuestion(s.id, userId, q.trim()); setQ(''); }}>질문</Button>
            </div>
            {role !== 'visitor' && (
              <button className="text-[13px] text-ink-700 underline underline-offset-2 mt-2" onClick={() => guard(() => openDirectChat(ll.userId, `${s.name} 문의`, { type: 'space', refId: s.id }))}>
                <Ic n="lock" />가격 협상 등은 비공개로 묻기 (채팅)
              </button>
            )}
          </div>
        )}
        {(() => {
          const similar = db.spaces
            .filter((x) => x.id !== s.id)
            .sort((a, b) => Number(b.region === s.region) - Number(a.region === s.region) || Math.abs(a.dailyFee - s.dailyFee) - Math.abs(b.dailyFee - s.dailyFee))
            .slice(0, 4);
          return similar.length ? (
            <div className="mt-6">
              <h3 className="font-bold mb-2">다른 공간도 비교해 보세요</h3>
              <div className="flex gap-2.5 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
                {similar.map((x) => (
                  <button key={x.id} onClick={() => navigate({ name: 'space', id: x.id })} className="w-[150px] shrink-0 text-left">
                    <Swatch hue={x.photoHues[0] ?? 30} pattern="solid" className="w-full h-24" rounded="rounded-xl" />
                    <div className="text-[13px] font-bold mt-1.5 truncate">{x.name}</div>
                    <div className="text-[11px] text-ink-500">{x.region} · {x.areaM2}㎡</div>
                    <div className="text-[12px] font-bold text-brand-600">1일 {manwon(x.dailyFee)}{x.lastMinutePct ? <span className="text-rose-500"> · {x.lastMinutePct}%↓</span> : null}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : null;
        })()}
      </div>
      {role === 'brand' && (
        <div className="sticky bottom-0 bg-white border-t border-ink-100 p-3 pb-safe flex gap-2">
          <SaveSpaceButton spaceId={s.id} inline />
          {s.teamRental ? (
            <Button full size="lg" onClick={() => guard(() => setApplyOpen(true))}>우리 팀으로 지원하기</Button>
          ) : (
            <Button full size="lg" variant="secondary" onClick={() => guard(() => openDirectChat(ll.userId, `${s.name} 문의`, { type: 'space', refId: s.id }))}>팀 단위 대관 불가 · 채팅으로 문의하기</Button>
          )}
        </div>
      )}
      {brand && <ApplySheet open={applyOpen} onClose={() => setApplyOpen(false)} space={s} brandId={brand.id} />}
    </div>
  );
}

function ApplySheet({ open, onClose, space, brandId }: { open: boolean; onClose: () => void; space: Space; brandId: string }) {
  const { db } = useMe();
  const teams = teamsOfBrand(db, brandId).filter((t) => t.stage === '준비 중');
  const [teamId, setTeamId] = useState<string | null>(null);
  const team = teamById(db, teamId ?? teams.find((t) => t.confirmed)?.id);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [msg, setMsg] = useState('');
  const s0 = start || team?.period.start || '';
  const e0 = end || team?.period.end || '';
  const days = s0 && e0 ? Math.round((new Date(e0).getTime() - new Date(s0).getTime()) / 86400000) + 1 : 0;
  const openCount = db.availability.filter((a) => a.spaceId === space.id && a.status === 'open' && a.date >= s0 && a.date <= e0).length;
  const already = team && db.spaceApplications.some((a) => a.teamId === team.id && a.spaceId === space.id && a.status === 'pending');
  return (
    <Sheet open={open} onClose={onClose} title="우리 팀으로 지원하기">
      {teams.length === 0 && <Empty icon="team">준비 중인 팀이 없어요. 같이 열기에서 팀을 먼저 꾸려 보세요.</Empty>}
      {teams.length > 0 && (
        <>
          <Field label="지원할 팀">
            <div className="space-y-1.5">
              {teams.map((t) => (
                <button key={t.id} disabled={!t.confirmed} onClick={() => { setTeamId(t.id); setStart(''); setEnd(''); }} className={cx('w-full text-left rounded-xl border p-3 text-sm disabled:opacity-50', team?.id === t.id ? 'border-ink-900 bg-ink-100' : 'border-ink-300')}>
                  <b>{t.name}</b> · {t.members.length}개 브랜드
                  {!t.confirmed && <div className="text-[11px] text-red-500">약속서 전원 동의 후 지원할 수 있어요</div>}
                </button>
              ))}
            </div>
          </Field>
          {team && (
            <>
              <Field label="희망 날짜" hint={`최소 ${space.minDays}일부터 빌릴 수 있어요`}>
                <div className="flex items-center gap-2">
                  <input type="date" className={cx(inputCls, 'min-w-0')} value={s0} onChange={(e) => setStart(e.target.value)} />
                  <span>~</span>
                  <input type="date" className={cx(inputCls, 'min-w-0')} value={e0} onChange={(e) => setEnd(e.target.value)} />
                </div>
              </Field>
              {days > 0 && (
                <div className="rounded-xl bg-ink-100/70 p-3 mb-4">
                  <div className="grid grid-cols-3 text-center gap-1">
                    <div><div className="text-[11px] text-ink-500">기간</div><div className="font-bold">{days}일</div></div>
                    <div><div className="text-[11px] text-ink-500">비어 있는 날</div><div className={cx('font-bold', openCount < days && 'text-amber-600')}>{openCount}일</div></div>
                    <div><div className="text-[11px] text-ink-500">예상 대관료</div><div className="font-bold">{manwon(space.dailyFee * days)}</div></div>
                  </div>
                  <div className="text-[12px] text-ink-700 mt-2 text-center">
                    {team.members.length}개 브랜드가 나누면 한 곳당 약 <b className="text-brand-600">{manwon(Math.round((space.dailyFee * days) / team.members.length / 10000) * 10000)}</b>
                  </div>
                  {openCount < days && <div className="text-[11px] text-amber-700 mt-1.5 text-center">일부 날짜는 이미 예약됐거나 열려 있지 않아요. 임대인과 조율이 필요할 수 있어요.</div>}
                  {space.lastMinutePct ? <div className="text-[11px] text-ink-500 mt-1 text-center">2주 안 날짜는 {space.lastMinutePct}% 할인이 따로 적용돼요</div> : null}
                </div>
              )}
              <Field label="메시지">
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[`${team.name} 팀입니다. 공간 분위기가 저희 무드와 잘 맞아요!`, '설치·철수는 영업시간 밖에 깔끔하게 할게요.', '방문객 동선과 SNS 홍보 계획도 준비돼 있어요.'].map((q) => (
                    <Chip key={q} onClick={() => setMsg((m) => (m ? `${m} ${q}` : q))}>{q.length > 18 ? q.slice(0, 17) + '…' : q}</Chip>
                  ))}
                </div>
                <textarea className={textareaCls} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="우리 팀과 팝업을 소개해 주세요" />
              </Field>
              <div className="text-[13px] font-semibold text-ink-700 mb-1.5">함께 첨부되는 팀 소개 페이지</div>
              <div className="max-h-64 overflow-y-auto rounded-2xl border border-ink-100 p-2 mb-4">
                <TeamIntroPage db={db} team={team} compact />
              </div>
              <Button full size="lg" disabled={!!already || days < space.minDays} onClick={() => { applySpace(team.id, space.id, { start: s0, end: e0 }, msg || `${team.name} 팀입니다. 함께하고 싶어요!`); onClose(); navigate({ name: 'team', id: team.id, sub: 'space' }); }}>
                {already ? '이미 지원했어요' : days < space.minDays ? `최소 ${space.minDays}일 이상이어야 해요` : '지원서 보내기'}
              </Button>
            </>
          )}
        </>
      )}
      <p className="text-[11px] text-ink-500 mt-3 text-center">OFF STAGE는 대관 계약 수수료를 받지 않아요. <Demo /></p>
    </Sheet>
  );
}
