import { useState } from 'react';
import { useMe } from '@/store/hooks';
import { navigate } from '@/store/store';
import { checkIn, claimStampReward, STAMP_GOAL, writeComboReview, writeVisitorReview } from '@/store/actions';
import { avg, brandById, displayName, period, popupById, spaceById, teamById } from '@/store/logic';
import { BrandLogo, PopupBannerCard, ScreenTitle, ThemeTagList } from '@/components/common';
import { Button, Card, Chip, cx, Demo, Empty, inputCls, Segmented, Sheet, Stars, StatusPill, SubHeader, Swatch, Tabs, Tag, textareaCls } from '@/components/ui';
import type { DB } from '@/data/mock';
import type { Popup } from '@/types';
import { BrandActions } from './BrandActions';
import { ReportButton } from './Report';

export function ComboReviewList({ db, popupIds }: { db: DB; popupIds: string[] }) {
  const list = db.comboReviews.filter((c) => popupIds.includes(c.popupId));
  if (!list.length) return <div className="text-sm text-ink-500 py-2">아직 조합 리뷰가 없어요</div>;
  return (
    <div className="space-y-2">
      {list.map((c) => (
        <Card key={c.id} className="p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold">{displayName(db, c.authorId)} <span className="text-ink-500 font-normal">· 방문 인증</span></span>
            <Stars value={c.rating} size="w-3.5 h-3.5" />
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            <Tag tone={c.good ? 'orange' : 'gray'}>{c.good ? '💛 이 조합 좋았어요' : '조금 아쉬웠어요'}</Tag>
            {c.pairs.map(([a, b]) => <Tag key={a + b} tone="purple">{brandById(db, a)?.name} × {brandById(db, b)?.name}</Tag>)}
          </div>
          <p className="text-sm text-ink-700 mt-1.5">{c.comment}</p>
        </Card>
      ))}
    </div>
  );
}

export function PopupDetail({ id }: { id: string }) {
  const { db, role, userId } = useMe();
  const p = popupById(db, id);
  const [code, setCode] = useState('');
  const [tab, setTab] = useState<'popup' | 'brand' | 'combo'>('combo');
  const [writing, setWriting] = useState<null | 'popup' | 'brand' | 'combo'>(null);
  if (!p) return <Empty>팝업을 찾을 수 없어요</Empty>;
  const team = teamById(db, p.teamId)!;
  const sp = spaceById(db, p.spaceId)!;
  const brands = team.members.map((m) => brandById(db, m.brandId)!);
  const visited = db.visits.some((v) => v.popupId === p.id && v.userId === userId);
  const popupReviews = db.reviews.filter((r) => !r.hidden && r.kind === 'visitor_popup' && r.targetId === p.id);
  const brandReviews = db.reviews.filter((r) => !r.hidden && r.kind === 'visitor_brand' && r.popupId === p.id);
  const combos = db.comboReviews.filter((c) => c.popupId === p.id);
  const allRatings = [...popupReviews.map((r) => r.scores['전체']), ...combos.map((c) => c.rating)];
  const visitorsCount = db.visits.filter((v) => v.popupId === p.id).length;

  return (
    <div className="bg-white min-h-screen">
      <SubHeader title={p.title} />
      <div className="flex h-36">
        {brands.map((b) => <Swatch key={b.id} hue={b.logoHue} pattern="stripe" rounded="" className="flex-1" />)}
      </div>
      <div className="p-4">
        <div className="flex items-center gap-1.5 mb-1">
          <StatusPill status={p.status} />
          <Tag>{team.round}회차</Tag>
          {allRatings.length > 0 && <Tag tone="yellow">★ {avg(allRatings).toFixed(1)}</Tag>}
        </div>
        <h1 className="text-xl font-extrabold">{p.title}</h1>
        <div className="text-[13px] text-ink-500">팀 <button className="underline underline-offset-2" onClick={() => navigate({ name: 'team', id: team.id })}>{team.name}</button> · 방문 인증 {visitorsCount}명</div>
        <div className="mt-4 rounded-2xl border border-ink-100 divide-y divide-ink-100 text-sm">
          <div className="flex px-3.5 py-2.5"><span className="w-20 text-ink-500">일정</span><span className="font-semibold">{p.period.start} ~ {p.period.end}</span></div>
          <div className="flex px-3.5 py-2.5"><span className="w-20 text-ink-500">운영 시간</span><span className="font-semibold">{p.hours}</span></div>
          <button className="flex px-3.5 py-2.5 w-full text-left" onClick={() => navigate({ name: 'space', id: sp.id })}><span className="w-20 text-ink-500 shrink-0">위치</span><span className="font-semibold">{sp.name} <span className="font-normal text-ink-500">· {sp.address}</span> ›</span></button>
        </div>

        {role === 'visitor' && (
          <div className="mt-4">
            {visited ? (
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-800">
                <div className="font-bold">✅ 방문 인증 완료</div>
                <div className="text-sm mt-0.5">스탬프가 적립됐어요. 이제 리뷰를 남길 수 있어요.</div>
              </div>
            ) : (
              <div className="rounded-2xl bg-ink-900 text-white p-4">
                <div className="font-bold">현장에서 방문 인증하기</div>
                <div className="text-[13px] text-white/70 mt-0.5">QR 대신 매장에 붙은 6자리 코드를 입력해요 <Demo /></div>
                <div className="flex gap-2 mt-3">
                  <input className="flex-1 h-11 px-3 rounded-xl text-ink-900 text-lg tracking-[0.3em] font-bold outline-none" inputMode="numeric" maxLength={6} placeholder="000000" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
                  <Button disabled={code.length !== 6} onClick={() => checkIn(p.id, userId, code) && setCode('')}>인증</Button>
                </div>
                <button className="text-[12px] text-amber-300 mt-2 underline underline-offset-2" onClick={() => setCode(p.code)}>(데모) 현장 코드 {p.code} 자동 입력</button>
              </div>
            )}
          </div>
        )}

        <h3 className="font-bold mt-6 mb-2">참여 브랜드 {brands.length}</h3>
        <div className="space-y-2">
          {brands.map((b) => (
            <Card key={b.id} className="p-3 flex items-center gap-3">
              <BrandLogo brand={b} size={44} />
              <button className="flex-1 text-left min-w-0" onClick={() => navigate({ name: 'brand', id: b.id })}>
                <div className="font-bold text-sm">{b.name}</div>
                <ThemeTagList tags={b.tags} limit={3} />
              </button>
              <BrandActions brandId={b.id} />
            </Card>
          ))}
        </div>

        <div className="flex items-center justify-between mt-6 mb-2">
          <h3 className="font-bold">방문객 리뷰</h3>
          {role === 'visitor' && (
            <span className="text-[12px] text-ink-500">{visited ? '방문 인증 완료' : '방문 인증한 사람만 쓸 수 있어요'}</span>
          )}
        </div>
        <Tabs items={[{ key: 'combo', label: `조합 리뷰 ${combos.length}` }, { key: 'popup', label: `팝업 ${popupReviews.length}` }, { key: 'brand', label: `브랜드별 ${brandReviews.length}` }]} value={tab} onChange={setTab} />
        <div className="pt-3">
          {tab === 'combo' && <ComboReviewList db={db} popupIds={[p.id]} />}
          {tab !== 'combo' && (
            <div className="space-y-2">
              {(tab === 'popup' ? popupReviews : brandReviews).map((r) => (
                <Card key={r.id} className="p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold">{displayName(db, r.authorId)}{r.kind === 'visitor_brand' && <span className="text-ink-500 font-normal"> → {brandById(db, r.targetId)?.name}</span>}</span>
                    <Stars value={r.scores['전체']} size="w-3.5 h-3.5" />
                  </div>
                  <p className="text-sm text-ink-700 mt-1">{r.comment}</p>
                  <div className="text-right"><ReportButton targetType="review" targetId={r.id} targetLabel={`리뷰: "${r.comment.slice(0, 20)}"`} small /></div>
                </Card>
              ))}
              {!(tab === 'popup' ? popupReviews : brandReviews).length && <div className="text-sm text-ink-500 py-2">아직 리뷰가 없어요</div>}
            </div>
          )}
          {role === 'visitor' && (
            <Button full variant={visited ? 'primary' : 'secondary'} disabled={!visited} className="mt-3" onClick={() => setWriting(tab)}>
              {visited ? (tab === 'combo' ? '조합 리뷰 쓰기' : tab === 'popup' ? '팝업 리뷰 쓰기' : '브랜드 리뷰 쓰기') : '🔒 방문 인증 후 리뷰를 쓸 수 있어요'}
            </Button>
          )}
        </div>
      </div>
      <ReviewSheet popup={p} kind={writing} onClose={() => setWriting(null)} />
    </div>
  );
}

function ReviewSheet({ popup, kind, onClose }: { popup: Popup; kind: null | 'popup' | 'brand' | 'combo'; onClose: () => void }) {
  const { db } = useMe();
  const team = teamById(db, popup.teamId)!;
  const brands = team.members.map((m) => brandById(db, m.brandId)!);
  const pairs: [string, string][] = [];
  brands.forEach((a, i) => brands.slice(i + 1).forEach((b) => pairs.push([a.id, b.id])));
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [good, setGood] = useState<'good' | 'bad'>('good');
  const [picked, setPicked] = useState<string[]>([]);
  const [target, setTarget] = useState(brands[0]?.id);
  const reset = () => { setRating(5); setComment(''); setPicked([]); onClose(); };
  return (
    <Sheet open={!!kind} onClose={onClose} title={kind === 'combo' ? '조합 리뷰' : kind === 'popup' ? '팝업 리뷰' : '브랜드 리뷰'}>
      {kind === 'combo' && (
        <>
          <p className="text-[13px] text-ink-500 mb-3">브랜드들이 함께 있어서 좋았는지 알려 주세요. 조합 리뷰는 브랜드 추천에 반영돼요.</p>
          <Segmented items={[{ key: 'good', label: '💛 이 조합 좋았어요' }, { key: 'bad', label: '조금 아쉬웠어요' }]} value={good} onChange={setGood} />
          <div className="text-[13px] font-semibold mt-4 mb-2">어떤 브랜드끼리 잘 어울렸나요? (여러 개 선택)</div>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {pairs.map(([a, b]) => {
              const k = `${a}|${b}`;
              return <Chip key={k} active={picked.includes(k)} onClick={() => setPicked(picked.includes(k) ? picked.filter((x) => x !== k) : [...picked, k])}>{brandById(db, a)!.name} × {brandById(db, b)!.name}</Chip>;
            })}
          </div>
        </>
      )}
      {kind === 'brand' && (
        <div className="mb-4">
          <div className="text-[13px] font-semibold mb-2">어떤 브랜드인가요?</div>
          <div className="flex flex-wrap gap-1.5">{brands.map((b) => <Chip key={b.id} active={target === b.id} onClick={() => setTarget(b.id)}>{b.name}</Chip>)}</div>
        </div>
      )}
      <div className="text-[13px] font-semibold mb-1.5">별점</div>
      <Stars value={rating} onChange={setRating} size="w-8 h-8" />
      <textarea className={textareaCls + ' mt-4'} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="한 줄 후기를 남겨 주세요" />
      <Button
        full size="lg" className="mt-4"
        disabled={!comment.trim() || (kind === 'combo' && good === 'good' && !picked.length)}
        onClick={() => {
          if (kind === 'combo') writeComboReview(popup.id, good === 'good', picked.map((k) => k.split('|') as [string, string]), rating, comment);
          else if (kind === 'popup') writeVisitorReview(popup.id, 'visitor_popup', popup.id, rating, comment);
          else if (kind === 'brand' && target) writeVisitorReview(popup.id, 'visitor_brand', target, rating, comment);
          reset();
        }}
      >
        리뷰 등록
      </Button>
    </Sheet>
  );
}

const REGION_LABELS = [
  { name: '마포구', x: 18, y: 50 },
  { name: '종로구', x: 47, y: 16 },
  { name: '용산구', x: 47, y: 78 },
  { name: '성동구', x: 76, y: 40 },
];

export function MapTab() {
  const { db } = useMe();
  const [view, setView] = useState<'map' | 'list'>('map');
  const [sel, setSel] = useState<string | null>(null);
  const popups = db.popups.filter((p) => p.status !== '종료');
  const selected = popups.find((p) => p.id === sel) ?? popups[0];
  return (
    <div>
      <ScreenTitle>팝업 지도</ScreenTitle>
      <div className="px-4 mb-3">
        <Segmented items={[{ key: 'map', label: '지도' }, { key: 'list', label: '목록' }]} value={view} onChange={setView} />
      </div>
      {view === 'map' && (
        <div className="px-4">
          <div className="relative w-full aspect-[4/5] rounded-3xl overflow-hidden bg-[#eef1ea] border border-ink-100">
            <svg viewBox="0 0 100 125" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
              <path d="M0 98 C 20 92, 35 104, 55 100 S 85 92, 100 98 L100 112 C 80 106, 60 116, 40 112 S 10 108, 0 112 Z" fill="#bfdbea" />
              <path d="M10 0 L 30 60 M 50 0 L 52 125 M 0 55 L 100 50 M 70 0 L 85 125" stroke="#ffffff" strokeWidth="1.6" fill="none" />
              <rect x="56" y="18" width="12" height="10" rx="2" fill="#d5e5cc" />
              <rect x="80" y="62" width="14" height="10" rx="2" fill="#d5e5cc" />
            </svg>
            <span className="absolute text-[10px] text-sky-700 font-semibold" style={{ left: '40%', top: '84%' }}>한강</span>
            {REGION_LABELS.map((r) => (
              <span key={r.name} className="absolute text-[11px] font-bold text-ink-500 -translate-x-1/2" style={{ left: `${r.x}%`, top: `${r.y}%` }}>{r.name}</span>
            ))}
            {popups.map((p) => (
              <button key={p.id} onClick={() => setSel(p.id)} className="absolute -translate-x-1/2 -translate-y-full flex flex-col items-center" style={{ left: `${p.mapX}%`, top: `${p.mapY}%` }}>
                <span className={cx('px-2 py-1 rounded-full text-[11px] font-bold shadow whitespace-nowrap', selected?.id === p.id ? 'bg-ink-900 text-white' : p.status === '진행 중' ? 'bg-brand-500 text-white' : 'bg-white text-ink-900 border border-ink-300')}>
                  {p.status === '진행 중' ? '● ' : ''}{p.title}
                </span>
                <span className={cx('w-2 h-2 rotate-45 -mt-1', selected?.id === p.id ? 'bg-ink-900' : p.status === '진행 중' ? 'bg-brand-500' : 'bg-white')} />
              </button>
            ))}
          </div>
          <p className="text-[11px] text-ink-500 mt-1.5 text-center">지도 API 대신 간략한 지도로 표시해요 <Demo /></p>
          {selected && <div className="mt-3"><PopupBannerCard db={db} popup={selected} wide /></div>}
        </div>
      )}
      {view === 'list' && (
        <div className="px-4 space-y-3">
          {popups.map((p) => <PopupBannerCard key={p.id} db={db} popup={p} wide />)}
          <h3 className="font-bold pt-3">지난 팝업</h3>
          {db.popups.filter((p) => p.status === '종료').map((p) => <PopupBannerCard key={p.id} db={db} popup={p} wide />)}
        </div>
      )}
    </div>
  );
}

export function StampsTab() {
  const { db, userId } = useMe();
  const st = db.stamps.find((s) => s.userId === userId) ?? { popupIds: [], rewardClaimed: false, userId };
  const n = st.popupIds.length;
  const live = db.popups.filter((p) => p.status === '진행 중' && !st.popupIds.includes(p.id));
  return (
    <div>
      <ScreenTitle>스탬프</ScreenTitle>
      <div className="px-4">
        <div className="rounded-3xl bg-ink-900 text-white p-5">
          <div className="text-sm text-white/70">서로 다른 공동 팝업 {STAMP_GOAL}곳을 방문하면 혜택 배지 <Demo /></div>
          <div className="text-3xl font-extrabold mt-1">{Math.min(n, STAMP_GOAL)} / {STAMP_GOAL}</div>
          <div className="grid grid-cols-3 gap-3 mt-4">
            {Array.from({ length: STAMP_GOAL }).map((_, i) => {
              const p = popupById(db, st.popupIds[i]);
              return (
                <div key={i} className={cx('aspect-square rounded-full border-2 flex flex-col items-center justify-center text-center p-1', p ? 'border-brand-400 bg-brand-500/20' : 'border-dashed border-white/30')}>
                  {p ? (
                    <>
                      <span className="text-2xl">🏷️</span>
                      <span className="text-[10px] leading-tight mt-0.5 line-clamp-2">{p.title}</span>
                    </>
                  ) : (
                    <span className="text-white/40 text-xs">{i + 1}</span>
                  )}
                </div>
              );
            })}
          </div>
          {n >= STAMP_GOAL && (
            st.rewardClaimed ? (
              <div className="mt-4 rounded-xl bg-amber-300 text-amber-950 p-3 text-center font-bold">🏅 공동 팝업 탐험가 배지 보유 중</div>
            ) : (
              <Button full className="mt-4" onClick={() => claimStampReward(userId)}>혜택 배지 받기</Button>
            )
          )}
        </div>
        {n > STAMP_GOAL && <p className="text-[12px] text-ink-500 mt-2">총 {n}곳 방문했어요.</p>}
        {live.length > 0 && (
          <>
            <h3 className="font-bold mt-6 mb-2">지금 스탬프 받을 수 있는 팝업</h3>
            <div className="space-y-3">{live.map((p) => <PopupBannerCard key={p.id} db={db} popup={p} wide />)}</div>
          </>
        )}
        <h3 className="font-bold mt-6 mb-2">방문 기록</h3>
        {st.popupIds.length === 0 && <Empty icon="stamp">아직 방문한 팝업이 없어요</Empty>}
        <div className="space-y-2">
          {st.popupIds.map((pid) => {
            const p = popupById(db, pid)!;
            const v = db.visits.find((x) => x.popupId === pid && x.userId === userId);
            return (
              <Card key={pid} className="p-3.5 flex items-center justify-between" onClick={() => navigate({ name: 'popup', id: pid })}>
                <div>
                  <div className="font-semibold text-sm">{p.title}</div>
                  <div className="text-[12px] text-ink-500">{period(p.period)} · {v?.at.slice(0, 10)} 인증</div>
                </div>
                <span className="text-ink-300">›</span>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
