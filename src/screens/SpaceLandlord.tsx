import { geocode, kakaoMapEnabled, openPostcode } from '@/components/KakaoMap';
import { pickPhotos } from '@/components/photoPick';
import { spaceSrc } from '@/data/photos';
import { useEffect, useRef, useState } from 'react';
import { useMe, guard } from '@/store/hooks';
import { askAi, type SpaceOut } from '@/store/ai';
import { back, navigate, replace, toast } from '@/store/store';
import { answerSpaceCheck, setLastMinute, decideSpaceApplication, proposeSpaceToRecruitment, proposeSpaceToTeam, saveSpace, simulateTeamApplication, type SpaceDraft } from '@/store/actions';
import { brandById, daysUntil, manwon, period, soonOpenDays, spaceById, teamById } from '@/store/logic';
import { ScreenTitle, TrustLine } from '@/components/common';
import { AiSource, Button, Card, Chip, cx, Demo, Empty, Field, inputCls, Segmented, Sheet, StatusPill, SubHeader, Swatch, Tag, textareaCls, Ic , Icon } from '@/components/ui';
import { FACILITIES, REGIONS, SPACE_KEYWORDS, SPACE_PROMOS, type Region } from '@/types';
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
        {spaces.length > 0 && (() => {
          const next30 = db.availability.filter((a) => landlord.spaceIds.includes(a.spaceId) && daysUntil(a.date) >= 0 && daysUntil(a.date) < 30);
          const booked = next30.filter((a) => a.status === 'booked').length;
          const open = next30.filter((a) => a.status === 'open').length;
          const savers = db.brands.filter((b) => b.savedSpaces?.some((id) => landlord.spaceIds.includes(id))).length;
          const pct = booked + open ? Math.round((booked / (booked + open)) * 100) : 0;
          return (
            <div className="bg-white rounded border border-ink-300 p-4">
              <div className="text-[12px] text-ink-500">앞으로 30일 내 공간 현황</div>
              <div className="flex items-end gap-2 mt-0.5">
                <span className="text-2xl font-extrabold">{pct}%</span>
                <span className="text-[12px] text-ink-500 mb-1">예약됨 · 비는 날 {open}일</span>
              </div>
              <div className="h-1 bg-ink-100 mt-2 overflow-hidden"><div className="h-full bg-ink-900" style={{ width: `${pct}%` }} /></div>
              <div className="flex gap-2 mt-3 text-[12px]">
                <span className="rounded border border-ink-300 px-2.5 py-1"><Ic n="heart" />찜한 브랜드 {savers}곳</span>
                {open > 0 && <button onClick={() => navigate({ name: 'tab', tab: 'inbox', filter: 'offer' })} className="rounded bg-brand-500 text-white px-2.5 py-1 font-semibold">빈 날 채우러 팀에게 제안 ›</button>}
              </div>
            </div>
          );
        })()}
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
              <div className="font-bold"><Ic n="bolt" />막판 할인</div>
              <p className="text-[12px] text-ink-500 mt-0.5 mb-3">2주 안에 아직 비어 있는 날({n}일)을 할인하면 공간 목록에 할인 표시가 붙어 팀 눈에 잘 띄어요.</p>
              {(() => {
                const savers = db.brands.filter((b) => b.savedSpaces?.includes(current)).length;
                return savers > 0 ? <p className="text-[12px] font-semibold text-red-600 -mt-1.5 mb-3"><Ic n="heart" />이 공간을 찜한 브랜드 {savers}곳에 할인 소식이 바로 가요</p> : null;
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
        {current && <PriceAdvice spaceId={current} />}
      </div>
    </div>
  );
}

/** 대관료·할인 제안: 같은 동네 시세, 요일별 빈 날, 공간 찾는 팀 수로 계산한다 */
function PriceAdvice({ spaceId }: { spaceId: string }) {
  const { db } = useMe();
  const sp = spaceById(db, spaceId);
  if (!sp) return null;
  const peers = db.spaces.filter((x) => x.region === sp.region && x.id !== sp.id && x.areaM2 > 0);
  const perM2 = peers.map((x) => x.dailyFee / x.areaM2).sort((a, b) => a - b);
  const median = perM2.length ? perM2[Math.floor(perM2.length / 2)] : 0;
  const fair = median ? Math.round((median * sp.areaM2) / 10000) * 10000 : 0;
  const diff = fair ? Math.round(((sp.dailyFee - fair) / fair) * 100) : 0;
  const days = db.availability.filter((a) => a.spaceId === sp.id && daysUntil(a.date) >= 0 && daysUntil(a.date) < 60);
  const isWeekend = (iso: string) => { const d = new Date(iso + 'T00:00:00').getDay(); return d === 0 || d === 6; };
  const rate = (list: typeof days) => (list.length ? list.filter((a) => a.status === 'booked').length / list.length : 0);
  const wk = rate(days.filter((a) => !isWeekend(a.date)));
  const we = rate(days.filter((a) => isWeekend(a.date)));
  const seeking = db.recruitments.filter((r) => r.region === sp.region && r.status !== '마감' && !r.spaceConfirmed && r.spaceCheck !== 'pending').length + db.teams.filter((t) => t.region === sp.region && !t.spaceId).length;
  const tips: { text: string; action?: { label: string; on: () => void } }[] = [];
  if (fair) tips.push({ text: `${sp.region} 비슷한 공간 시세로 보면 하루 ${manwon(fair)}이 적정해요. 지금 ${manwon(sp.dailyFee)}은 ${diff === 0 ? '시세와 같아요' : diff > 0 ? `${diff}% 높아요` : `${-diff}% 낮아요`}.` });
  if (days.length && wk + 0.15 < we) {
    const hasPromo = sp.promos?.includes('평일 특가');
    tips.push({
      text: `앞으로 60일 동안 주말은 ${Math.round(we * 100)}% 찼는데 평일은 ${Math.round(wk * 100)}%예요. 평일만 10~15% 낮추면 빈 날이 줄어요.`,
      action: hasPromo ? undefined : { label: '평일 특가 표시하기', on: () => saveSpace(sp.landlordId, { ...sp, promos: [...(sp.promos ?? []), '평일 특가'], keywords: sp.keywords ?? [] }, sp.id) },
    });
  }
  if (seeking > 0) tips.push({ text: `지금 ${sp.region}에서 공간을 찾는 팀·모집글이 ${seeking}곳 있어요. 먼저 제안하면 할인 없이도 채울 수 있어요.` });
  if (!tips.length) return null;
  return (
    <Card className="p-4">
      <div className="font-bold">대관료 제안</div>
      <p className="text-[12px] text-ink-500 mt-0.5">같은 동네 공간 시세와 요일별 예약, 공간 찾는 팀 수로 계산했어요</p>
      <ul className="mt-3 space-y-2.5">
        {tips.map((t) => (
          <li key={t.text} className="text-[13px] text-ink-700">
            <div className="flex"><span className="w-1 h-1 bg-ink-900 mt-[8px] mr-2 shrink-0" />{t.text}</div>
            {t.action && <button onClick={t.action.on} className="ml-3 mt-1 text-[12px] font-semibold text-brand-600">{t.action.label} ›</button>}
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function SpaceEdit({ id }: { id?: string }) {
  const { db, landlord } = useMe();
  const ex = spaceById(db, id);
  const [d, setD] = useState<SpaceDraft>(
    ex
      ? { name: ex.name, region: ex.region, address: ex.address, intro: ex.intro, areaM2: ex.areaM2, dailyFee: ex.dailyFee, minDays: ex.minDays, facilities: ex.facilities, electricKw: ex.electricKw, teamRental: ex.teamRental, fashionOnly: ex.fashionOnly, photoHues: ex.photoHues, photos: ex.photos, lat: ex.lat, lng: ex.lng, promos: ex.promos ?? [], keywords: ex.keywords ?? [] }
      : { name: '', region: '마포구', address: '', intro: '', areaM2: 33, dailyFee: 500000, minDays: 2, facilities: ['행거', '조명'], electricKw: 5, teamRental: true, fashionOnly: true, photoHues: [], promos: [], keywords: [] },
  );
  const [addrOpen, setAddrOpen] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiSrc, setAiSrc] = useState<'ai' | 'example' | null>(null);
  const [geo, setGeo] = useState<'idle' | 'ok' | 'fail'>(ex?.lat ? 'ok' : 'idle');
  const addrBox = useRef<HTMLDivElement>(null);
  const locate = async (address: string) => {
    const p = await geocode(address);
    setGeo(p ? 'ok' : kakaoMapEnabled ? 'fail' : 'idle');
    setD((x) => ({ ...x, lat: p?.[0], lng: p?.[1] }));
  };
  useEffect(() => {
    if (!addrOpen || !addrBox.current) return;
    openPostcode(addrBox.current, ({ address, sigungu }) => {
      setAddrOpen(false);
      setD((x) => ({ ...x, address, region: (REGIONS as readonly string[]).includes(sigungu) ? (sigungu as Region) : x.region }));
      locate(address);
    }).then((ok) => { if (!ok) { setAddrOpen(false); toast('주소 검색을 불러오지 못했어요. 직접 입력해 주세요'); } });
  }, [addrOpen]);
  if (!landlord) return <Empty>임대인 계정에서 볼 수 있어요</Empty>;
  const ok = d.name.trim() && d.address.trim() && d.photoHues.length > 0;
  const missing = ([d.photoHues.length === 0 && '사진', !d.name.trim() && '공간 이름', !d.address.trim() && '주소']).filter(Boolean) as string[];
  return (
    <div className="bg-white min-h-screen">
      <SubHeader title={ex ? '공간 수정' : '공간 등록'} />
      <div className="p-4">
        <Field label="실제 사진" required hint="휴대폰 사진을 골라 올려요. 첫 사진이 대표 사진이 돼요. 누르면 빠져요">
          <div className="flex gap-1.5 flex-wrap">
            {d.photoHues.map((h, i) => (
              <button key={i} onClick={() => setD({ ...d, photoHues: d.photoHues.filter((_, j) => j !== i), photos: d.photos?.filter((_, j) => j !== i) })} className="relative">
                <Swatch src={spaceSrc({ id: id ?? 'new', photos: d.photos }, i)} hue={h} className="w-20 h-20" rounded="rounded" />
                <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-xs">✕</span>
              </button>
            ))}
            <button type="button" onClick={async () => {
              const urls = await pickPhotos(8 - d.photoHues.length);
              if (!urls.length) return;
              const base = Array.from({ length: d.photoHues.length }, (_, i) => d.photos?.[i] ?? '');
              setD({ ...d, photoHues: [...d.photoHues, ...urls.map(() => Math.floor(Math.random() * 360))], photos: [...base, ...urls] });
            }} className="w-20 h-20 rounded border-2 border-dashed border-ink-300 text-ink-500 text-xs flex flex-col items-center justify-center gap-1"><Icon name="camera" className="w-5 h-5" />사진 올리기</button>
          </div>
        </Field>
        <Field label="공간 이름" required><input className={inputCls} value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder="예) 망원 골목창고" /></Field>
        <Field label="지역">
          <div className="flex flex-wrap gap-1.5">{REGIONS.map((r) => <Chip key={r} active={d.region === r} onClick={() => setD({ ...d, region: r })}>{r}</Chip>)}</div>
        </Field>
        <Field label="주소" required hint={geo === 'ok' ? '지도 위치를 찾았어요. 팝업 지도에 이 위치로 표시돼요' : geo === 'fail' ? '지도에서 이 주소를 못 찾았어요. 주소 검색으로 골라 주세요' : '주소 검색으로 고르면 지도 위치가 자동으로 잡혀요'}>
          <div className="flex gap-2">
            <input className={inputCls} value={d.address} onChange={(e) => { setD({ ...d, address: e.target.value, lat: undefined, lng: undefined }); setGeo('idle'); }} onBlur={() => !d.lat && d.address.trim() && locate(d.address)} placeholder="서울 ○○구 ○○로 00" />
            <Button variant="dark" onClick={() => setAddrOpen(true)}>주소 검색</Button>
          </div>
        </Field>
        <Sheet open={addrOpen} onClose={() => setAddrOpen(false)} title="주소 검색">
          <div ref={addrBox} className="h-[460px] -mx-1" />
        </Sheet>
        <Field label="소개">
          <textarea className={textareaCls} value={d.intro} onChange={(e) => setD({ ...d, intro: e.target.value })} placeholder="직접 쓰거나 아래 AI로 초안을 받아 고쳐 쓰세요" />
          <div className="flex items-center gap-2 mt-2">
            <Button size="sm" variant="secondary" disabled={aiBusy} onClick={async () => {
              setAiBusy(true);
              const photos = (d.photos ?? []).filter((x) => x?.startsWith('data:image/')).slice(0, 3);
              const r = await askAi<SpaceOut>('space', {
                이름: d.name, 지역: d.region, 주소: d.address, 면적: `${d.areaM2}㎡`, 설비: d.facilities, 팀단위대관: d.teamRental, 패션전용: d.fashionOnly, 메모: d.intro,
                고를수있는키워드: SPACE_KEYWORDS,
              }, () => ({
                keywords: (d.keywords?.length ? d.keywords : SPACE_KEYWORDS.filter((k) => (k === '1층 코너' && /1층/.test(d.intro + d.address)) || (k === '역세권' && /역/.test(d.intro)))) as string[],
                moods: [],
                intro: `${d.region} ${d.name || '공간'}. ${d.areaM2}㎡(${Math.round(d.areaM2 / 3.3)}평) 규모에 ${d.facilities.join(', ')}이 갖춰져 있어요.${d.teamRental ? ' 여러 브랜드가 함께 쓰는 팀 대관도 받아요.' : ''}`,
              }), photos);
              const kw = r.result.keywords.filter((k): k is (typeof SPACE_KEYWORDS)[number] => (SPACE_KEYWORDS as readonly string[]).includes(k)).slice(0, 5);
              setD((cur) => ({ ...cur, intro: r.result.intro, keywords: kw.length ? kw : cur.keywords }));
              setAiSrc(r.source);
              setAiBusy(false);
            }}>{aiBusy ? '쓰는 중' : '사진 보고 소개·키워드 쓰기'}</Button>
            {aiSrc && <AiSource source={aiSrc} />}
          </div>
        </Field>
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
        <Field label="공간 특징 키워드" hint="카드에 '통창 · 자연광'처럼 한 줄로 보여요. 최대 5개">
          <div className="flex flex-wrap gap-1.5">
            {SPACE_KEYWORDS.map((k) => { const cur = d.keywords ?? []; const on = cur.includes(k); return <Chip key={k} active={on} onClick={() => setD({ ...d, keywords: on ? cur.filter((x) => x !== k) : cur.length >= 5 ? cur : [...cur, k] })}>{k}</Chip>; })}
          </div>
        </Field>
        <Field label="할인·프로모션" hint="진행하는 것만 골라 주세요. 공간 카드 아래에 빨간 선물 표시로 보여요">
          <div className="flex flex-wrap gap-1.5">
            {SPACE_PROMOS.map((k) => { const cur = d.promos ?? []; const on = cur.includes(k); return <Chip key={k} active={on} onClick={() => setD({ ...d, promos: on ? cur.filter((x) => x !== k) : [...cur, k] })}>{k}</Chip>; })}
          </div>
        </Field>
        <Button full size="lg" disabled={!ok} onClick={() => { const sid = saveSpace(landlord.id, d, id); if (id) back(); else replace({ name: 'space', id: sid }); }}>{ex ? '저장' : '등록하고 비는 날 표시하기'}</Button>
        {!ok && missing.length > 0 && <p className="text-[12px] text-ink-500 text-center mt-2">남은 항목: {missing.join(', ')}</p>}
      </div>
    </div>
  );
}

export function InboxTab({ initial }: { initial?: 'offer' }) {
  const { db, landlord } = useMe();
  const [tab, setTab] = useState<'apps' | 'offer'>(initial ?? 'apps');
  const [view, setView] = useState<string | null>(null);
  if (!landlord) return <Empty>임대인 계정에서 볼 수 있어요</Empty>;
  const apps = db.spaceApplications.filter((a) => landlord.spaceIds.includes(a.spaceId));
  const pending = apps.filter((a) => a.status === 'pending' && a.direction === 'team');
  const others = apps.filter((a) => !(a.status === 'pending' && a.direction === 'team'));
  const viewing = db.spaceApplications.find((a) => a.id === view);
  const openRecruits = db.recruitments.filter((r) => r.status !== '마감' && !r.spaceConfirmed && r.spaceCheck !== 'pending');
  const checks = db.recruitments.filter((r) => r.spaceCheck === 'pending' && r.spaceId && landlord.spaceIds.includes(r.spaceId));
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
          {checks.length > 0 && (
            <div>
              <h3 className="text-[17px] font-extrabold tracking-tight mb-2">공간 확정 확인 요청</h3>
              <div className="space-y-2">
                {checks.map((r) => {
                  const host = brandById(db, r.hostBrandId);
                  const sp = spaceById(db, r.spaceId);
                  return (
                    <Card key={r.id} className="p-4">
                      <div className="text-[12px] text-ink-500">{host?.name} · {sp?.name}</div>
                      <div className="font-bold mt-0.5">{period(r.period)} 대관이 확정됐다고 적었어요</div>
                      <button className="text-[12px] text-ink-500 underline underline-offset-2 mt-1" onClick={() => navigate({ name: 'recruit', id: r.id })}>모집글 보기</button>
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" variant="secondary" className="flex-1" onClick={() => answerSpaceCheck(r.id, false)}>아니에요</Button>
                        <Button size="sm" className="flex-1" onClick={() => answerSpaceCheck(r.id, true)}>맞아요, 확정</Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
          {pending.length > 0 && <h3 className="text-[17px] font-extrabold tracking-tight">대기 중인 팀 지원</h3>}
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
          {others.length > 0 && <h3 className="text-[17px] font-extrabold tracking-tight pt-3">지난 내역</h3>}
          {others.map((a) => <AppCard key={a.id} appId={a.id} onOpen={() => setView(a.id)} />)}
        </div>
      )}
      {tab === 'offer' && (
        <div className="px-4">
          <p className="text-[13px] text-ink-500 mb-3">공간이 아직 없는 팀에게 우리 공간을 먼저 제안해 보세요.</p>
          {spacelessTeams.length > 0 && <h3 className="text-[17px] font-extrabold tracking-tight mb-3">공간을 찾는 확정 팀</h3>}
          <div className="space-y-2 mb-5">
            {spacelessTeams.map((t) => (
              <Card key={t.id} className="p-3.5">
                <div className="font-bold">{t.name}</div>
                <div className="text-[13px] text-ink-500">{t.region} · {period(t.period)} · {t.members.length}개 브랜드</div>
                <OfferToTeam teamId={t.id} />
              </Card>
            ))}
          </div>
          <h3 className="text-[17px] font-extrabold tracking-tight mb-3">모집 중인 팀</h3>
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
      <div className="text-[13px] text-ink-500"><Ic n="calendar" />{period(a.dates)} · {t.members.length}개 브랜드</div>
      <div className="flex flex-wrap gap-1 mt-2">
        {t.members.map((m) => <Tag key={m.brandId}>{brandById(db, m.brandId)!.name}</Tag>)}
      </div>
      <p className="text-sm text-ink-700 mt-2">"{a.message}"</p>
      {a.status === 'pending' && (
        <div className="mt-3 rounded border border-ink-300 bg-white px-3 py-2.5 flex items-center justify-between">
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
      <div className="rounded border border-ink-300 p-3 text-sm mb-3">
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
            <button key={s.id} onClick={() => { proposeSpaceToTeam(teamId, s.id); setOpen(false); }} className="w-full text-left rounded border border-ink-300 p-3 text-sm">
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
            <button key={s.id} onClick={() => { const rid = proposeSpaceToRecruitment(recruitmentId, s.id); setOpen(false); navigate({ name: 'chat', id: rid }); }} className={cx('w-full text-left rounded border border-ink-300 p-3 text-sm')}>
              <b>{s.name}</b> · {s.region} · 1일 {manwon(s.dailyFee)}
            </button>
          ))}
        </div>
      </Sheet>
    </>
  );
}
