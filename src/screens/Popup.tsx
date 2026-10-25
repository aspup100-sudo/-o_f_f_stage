import { useState } from 'react';
import { useMe } from '@/store/hooks';
import { shareLink } from '@/store/share';
import { navigate } from '@/store/store';
import { checkIn, claimStampReward, followAll, STAMP_GOAL, toggleWaitlist, writeComboReview, writeVisitorReview } from '@/store/actions';
import { avg, brandById, dday, md, displayName, period, popupById, spaceById, teamById, waitCount } from '@/store/logic';
import { BrandLogo, PopupBannerCard, ScreenTitle, ThemeTagList } from '@/components/common';
import { Button, Card, Chip, cx, Demo, Empty, inputCls, Segmented, Sheet, Stars, StatusPill, SubHeader, Swatch, Tabs, Tag, textareaCls } from '@/components/ui';
import type { DB } from '@/data/mock';
import type { Popup } from '@/types';
import { BrandActions } from './BrandActions';
import { ReportButton } from './Report';

type ReviewSort = 'new' | 'high' | 'low';
const REVIEW_SORTS: { key: ReviewSort; label: string }[] = [{ key: 'new', label: '최신순' }, { key: 'high', label: '별점 높은 순' }, { key: 'low', label: '별점 낮은 순' }];
const sortBy = <T,>(list: T[], sort: ReviewSort, rating: (x: T) => number, at: (x: T) => string) =>
  [...list].sort((a, b) => (sort === 'new' ? at(b).localeCompare(at(a)) : sort === 'high' ? rating(b) - rating(a) : rating(a) - rating(b)));

export function ComboReviewList({ db, popupIds, sort = 'new' }: { db: DB; popupIds: string[]; sort?: ReviewSort }) {
  const list = sortBy(db.comboReviews.filter((c) => popupIds.includes(c.popupId)), sort, (c) => c.rating, (c) => c.createdAt);
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
  const [sort, setSort] = useState<ReviewSort>('new');
  const [brandFilter, setBrandFilter] = useState<string | null>(null);
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
      <SubHeader title={p.title} right={<button className="text-[13px] font-semibold text-ink-700" onClick={() => shareLink(p.title, `${p.title} · ${sp.name} ${md(p.period.start)}~${md(p.period.end)} · OFF STAGE에서 같이 가요`)}>공유</button>} />
      <div className="relative h-44">
        <div className="absolute inset-0 flex">
          {brands.map((b) => <Swatch key={b.id} hue={b.logoHue} pattern="stripe" rounded="" className="flex-1" />)}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <div className="absolute left-4 right-4 bottom-3 flex items-end justify-between gap-3">
          <div className="flex -space-x-2.5">
            {brands.map((b) => (
              <span key={b.id} className="rounded-full ring-2 ring-white bg-white"><BrandLogo brand={b} size={36} /></span>
            ))}
          </div>
          <span className="text-white text-[13px] font-bold drop-shadow">
            {p.status === '예정' ? `오픈 ${dday(p.period.start)}` : p.status === '진행 중' ? `마감 ${dday(p.period.end)}` : '종료된 팝업'}
          </span>
        </div>
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

        {p.status === '예정' && (
          <div className="mt-4 rounded-2xl bg-brand-50 border border-brand-100 p-4 flex items-center gap-3">
            <div className="flex-1">
              <div className="font-bold text-[15px]">오픈 {dday(p.period.start)} · <span className="text-brand-600">{waitCount(p)}명</span>이 기다려요</div>
              <div className="text-[12px] text-ink-500 mt-0.5">알림을 켜 두면 전날 저녁과 오픈 당일에 알려 드려요</div>
            </div>
            {role === 'visitor' && (() => {
              const on = !!p.waiters?.includes(userId);
              return (
                <button onClick={() => toggleWaitlist(p.id, userId)} className={cx('h-10 px-3.5 rounded-full text-sm font-bold shrink-0', on ? 'bg-white border border-brand-200 text-brand-600' : 'bg-brand-500 text-white')}>
                  {on ? '🔔 알림 켜짐' : '🔔 알림 받기'}
                </button>
              );
            })()}
          </div>
        )}

        {role === 'visitor' && p.status !== '예정' && (
          <div className="mt-4">
            {visited ? (
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-800">
                <div className="font-bold">✅ 방문 인증 완료</div>
                <div className="text-sm mt-0.5">스탬프가 적립됐어요. 이제 리뷰를 남길 수 있어요.</div>
                {(() => {
                  const me = db.visitors.find((v) => v.userId === userId);
                  const rest = brands.filter((b) => !me?.following.includes(b.id));
                  if (!me || !rest.length) return null;
                  return (
                    <button onClick={() => followAll(userId, rest.map((b) => b.id))} className="mt-3 w-full h-10 rounded-xl bg-emerald-600 text-white text-sm font-bold">
                      오늘 본 브랜드 {rest.length}곳 한 번에 팔로우
                    </button>
                  );
                })()}
              </div>
            ) : (
              <div className="rounded-2xl bg-ink-900 text-white p-4">
                <div className="font-bold">현장에서 방문 인증하기</div>
                <div className="text-[13px] text-white/70 mt-0.5">QR 대신 매장에 붙은 6자리 코드를 입력해요 <Demo /></div>
                <div className="flex gap-2 mt-3">
                  <input className="flex-1 min-w-0 h-11 px-3 rounded-xl text-ink-900 text-lg tracking-[0.3em] font-bold outline-none" inputMode="numeric" maxLength={6} placeholder="000000" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
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
          {(tab === 'combo' ? combos.length : tab === 'popup' ? popupReviews.length : brandReviews.length) > 1 && (
            <div className="flex items-center gap-1.5 mb-2.5 overflow-x-auto no-scrollbar">
              {tab === 'brand' && (
                <>
                  <Chip active={!brandFilter} onClick={() => setBrandFilter(null)}>전체</Chip>
                  {brands.filter((b) => brandReviews.some((r) => r.targetId === b.id)).map((b) => (
                    <Chip key={b.id} active={brandFilter === b.id} onClick={() => setBrandFilter(brandFilter === b.id ? null : b.id)}>{b.name}</Chip>
                  ))}
                </>
              )}
              <select aria-label="리뷰 정렬" value={sort} onChange={(e) => setSort(e.target.value as ReviewSort)} className="ml-auto shrink-0 h-8 rounded-full border border-ink-300 bg-white px-2.5 text-[12px]">
                {REVIEW_SORTS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
              </select>
            </div>
          )}
          {tab === 'combo' && <ComboReviewList db={db} popupIds={[p.id]} sort={sort} />}
          {tab !== 'combo' && (
            <div className="space-y-2">
              {sortBy((tab === 'popup' ? popupReviews : brandReviews.filter((r) => !brandFilter || r.targetId === brandFilter)), sort, (r) => r.scores['전체'], (r) => r.createdAt).map((r) => (
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
        {(() => {
          const others = db.popups.filter((x) => x.id !== p.id && x.status !== '종료');
          if (!others.length) return null;
          const stamped = db.stamps.find((x) => x.userId === userId)?.popupIds ?? [];
          return (
            <>
              <h3 className="font-bold mt-7 mb-1">다른 공동 팝업도 가 보세요</h3>
              {role === 'visitor' && <p className="text-[12px] text-ink-500 mb-2">아직 안 간 곳에서 인증하면 스탬프가 하나 더 쌓여요</p>}
              <div className="flex gap-2.5 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
                {others.map((x) => (
                  <div key={x.id} className="relative">
                    <PopupBannerCard db={db} popup={x} />
                    {role === 'visitor' && !stamped.includes(x.id) && <span className="absolute top-2 right-2 text-[10px] font-bold bg-white text-brand-600 rounded-full px-2 py-0.5 shadow">+1 스탬프</span>}
                  </div>
                ))}
              </div>
            </>
          );
        })()}
      </div>
      <ReviewSheet popup={p} kind={writing} onClose={() => setWriting(null)} />
    </div>
  );
}

const RATING_LABEL: Record<number, string> = { 1: '별로예요', 2: '아쉬워요', 3: '보통이에요', 4: '좋아요', 5: '최고예요' };

const QUICK_PHRASES: Record<'popup' | 'brand' | 'combo', string[]> = {
  combo: ['브랜드끼리 분위기가 잘 맞았어요.', '한 번에 여러 브랜드를 봐서 좋았어요.', '동선이 자연스러웠어요.'],
  popup: ['공간이 예뻤어요.', '직원분들이 친절했어요.', '사진 찍기 좋았어요.', '대기 없이 들어갔어요.'],
  brand: ['제품 퀄리티가 좋았어요.', '설명을 잘 해 주셨어요.', '가격이 괜찮았어요.', '다음 팝업도 갈래요.'],
};

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
      <div className="flex items-center gap-3">
        <Stars value={rating} onChange={setRating} size="w-8 h-8" />
        <span className="text-sm font-bold text-brand-600">{RATING_LABEL[rating]}</span>
      </div>
      <div className="text-[13px] font-semibold mt-4 mb-2">이런 점이 좋았어요 <span className="font-normal text-ink-500">(눌러서 넣기)</span></div>
      <div className="flex flex-wrap gap-1.5">
        {QUICK_PHRASES[kind ?? 'popup'].map((q) => {
          const on = comment.includes(q);
          return (
            <Chip key={q} active={on} onClick={() => setComment(on ? comment.replace(q, '').replace(/\s{2,}/g, ' ').trim() : (comment.trim() ? `${comment.trim()} ${q}` : q))}>{q}</Chip>
          );
        })}
      </div>
      <textarea className={textareaCls + ' mt-3'} value={comment} maxLength={200} onChange={(e) => setComment(e.target.value)} placeholder="한 줄 후기를 남겨 주세요" />
      <div className="text-right text-[11px] text-ink-500 mt-1">{comment.length}/200</div>
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
          <div className="relative w-full aspect-square rounded-3xl overflow-hidden bg-[#eef1ea] border border-ink-100">
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
                  {p.status === '진행 중' ? '● ' : `${dday(p.period.start)} · `}{p.title}
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
                <div
                  key={i}
                  className={cx('aspect-square rounded-full border-2 flex flex-col items-center justify-center text-center p-1', p ? 'border-white/80' : 'border-dashed border-white/30')}
                  style={p ? { background: `hsl(${brandById(db, teamById(db, p.teamId)?.members[0]?.brandId ?? '')?.logoHue ?? 250} 45% 45%)`, transform: `rotate(${(i % 2 ? 1 : -1) * (6 + i * 3)}deg)` } : undefined}
                >
                  {p ? (
                    <>
                      <span className="text-[9px] font-bold tracking-widest opacity-80">OFF STAGE</span>
                      <span className="text-[11px] font-extrabold leading-tight mt-0.5 line-clamp-2">{p.title}</span>
                      <span className="text-[9px] opacity-80 mt-0.5">{md(p.period.start)}</span>
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
        <StampLevels n={n} />
        {live.length > 0 && (
          <>
            <h3 className="font-bold mt-6 mb-2">지금 스탬프 받을 수 있는 팝업</h3>
            <div className="space-y-3">{live.map((p) => <PopupBannerCard key={p.id} db={db} popup={p} wide />)}</div>
          </>
        )}
        <h3 className="font-bold mt-6 mb-2">방문 기록</h3>
        {st.popupIds.length === 0 && <Empty icon="stamp" action={{ label: '근처 팝업 찾아보기', onClick: () => navigate({ name: 'tab', tab: 'map' }) }}>아직 방문한 팝업이 없어요</Empty>}
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

// 방문 수에 따라 오르는 탐험가 등급. 첫 배지 이후에도 계속 모을 이유를 준다.
export const STAMP_LEVELS = [
  { at: 3, name: '팝업 입문자', emoji: '🌱', perk: '혜택 배지' },
  { at: 6, name: '골목 탐험가', emoji: '🧭', perk: '오픈 하루 전 미리 알림' },
  { at: 10, name: '팝업 마스터', emoji: '👑', perk: '프로필에 마스터 표시' },
];

function StampLevels({ n }: { n: number }) {
  const next = STAMP_LEVELS.find((l) => n < l.at);
  return (
    <div className="mt-3 rounded-2xl bg-white border border-ink-100 p-4">
      <div className="flex items-center justify-between">
        <span className="font-bold text-[15px]">탐험가 등급</span>
        <span className="text-[12px] text-ink-500">총 {n}곳 방문 <Demo /></span>
      </div>
      <div className="flex items-center mt-3">
        {STAMP_LEVELS.map((l, i) => (
          <div key={l.at} className="flex items-center flex-1 last:flex-none">
            <div className={cx('w-11 h-11 rounded-full flex items-center justify-center text-xl shrink-0', n >= l.at ? 'bg-brand-500' : 'bg-ink-100 grayscale opacity-60')}>{l.emoji}</div>
            {i < STAMP_LEVELS.length - 1 && (
              <div className="flex-1 h-1 mx-1 rounded-full bg-ink-100 overflow-hidden">
                <div className="h-full bg-brand-500" style={{ width: `${Math.max(0, Math.min(1, (n - l.at) / (STAMP_LEVELS[i + 1].at - l.at))) * 100}%` }} />
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 text-[11px] mt-1.5">
        {STAMP_LEVELS.map((l, i) => (
          <span key={l.at} className={cx(i === 1 && 'text-center', i === 2 && 'text-right', n >= l.at ? 'font-bold text-ink-900' : 'text-ink-500')}>{l.name}<br />{l.at}곳</span>
        ))}
      </div>
      <p className="text-[13px] text-ink-700 mt-3">
        {next ? <>다음 등급 <b>{next.name}</b>까지 <b className="text-brand-600">{next.at - n}곳</b> 남았어요 · {next.perk}</> : '모든 등급을 달성했어요! 👑'}
      </p>
    </div>
  );
}
