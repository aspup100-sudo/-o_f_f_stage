import { useState } from 'react';
import { useMe, guard } from '@/store/hooks';
import { back, navigate, switchRole } from '@/store/store';
import { advanceRental, decideRental, lowerPartnerPrice, openDirectChat, rateRental, requestRental, saveRentalItem, toggleRentalItem } from '@/store/actions';
import { brandById, dday, discountPct, josa, missingForSpace, partnerRating, period, rentalDays, rentalQuote, spaceById, teamById, teamsOfBrand, won } from '@/store/logic';
import { ScreenTitle } from '@/components/common';
import { Avatar, Button, Card, Chip, cx, Demo, Empty, Field, inputCls, Segmented, Sheet, Stars, SubHeader, Swatch, Tag, textareaCls, Ic } from '@/components/ui';
import { RENTAL_CATEGORIES, REGIONS, type RentalCategory, type RentalItem, type RentalOrder, type RentalOrderStatus, type Team } from '@/types';
import { DEMO_TODAY, type DB } from '@/data/mock';

const STATUS: Record<RentalOrderStatus, { label: string; tone: 'yellow' | 'green' | 'blue' | 'gray' | 'red' }> = {
  requested: { label: '확인 대기', tone: 'yellow' },
  confirmed: { label: '예약 확정', tone: 'green' },
  delivered: { label: '배송·설치 완료', tone: 'blue' },
  returned: { label: '반납 완료', tone: 'gray' },
  rejected: { label: '거절', tone: 'red' },
};

function Price({ it, big }: { it: RentalItem; big?: boolean }) {
  return (
    <div className="text-right">
      <div className="text-[12px] text-ink-500 line-through tabular-nums">{won(it.dailyPrice)}</div>
      <div className={cx('font-extrabold text-brand-600 tabular-nums', big ? 'text-lg' : 'text-[15px]')}>
        <span className="text-[12px] mr-0.5 text-rose-500">{discountPct(it)}%</span>
        {won(it.partnerPrice)}
      </div>
      <div className="text-[11px] text-ink-500">1일 · OFF STAGE 제휴가</div>
    </div>
  );
}

function WinWinBanner() {
  return (
    <div className="bg-white border border-ink-900 p-4">
      <div className="text-[12px] text-ink-500">렌탈 제휴</div>
      <div className="font-extrabold text-lg leading-snug mt-0.5">집기는 사지 말고, 제휴가로 빌려요</div>
      <div className="grid grid-cols-2 gap-2 mt-3 text-[12px]">
        <div className="rounded-md border border-ink-300 p-2.5">
          <div className="font-bold">소규모 브랜드</div>
          <div className="text-ink-500 mt-0.5">일반 대여가보다 30~40% 싸게, 팀이 나눠 내면 더 가볍게</div>
        </div>
        <div className="rounded-md border border-ink-300 p-2.5">
          <div className="font-bold">렌탈 업체</div>
          <div className="text-ink-500 mt-0.5">놀고 있는 행거·조명이 매주 팝업에서 다시 돌아가요</div>
        </div>
      </div>
      <p className="text-[12px] text-ink-500 mt-2">OFF STAGE는 렌탈 거래에서도 수수료를 받지 않아요.</p>
    </div>
  );
}

export function PartnerCard({ db, partnerId, teamId }: { db: DB; partnerId: string; teamId?: string }) {
  const p = db.rentalPartners.find((x) => x.id === partnerId)!;
  const items = db.rentalItems.filter((i) => i.partnerId === p.id && i.active);
  const r = partnerRating(db, p.id);
  const maxOff = Math.max(0, ...items.map(discountPct));
  return (
    <Card className="p-3.5" onClick={() => navigate({ name: 'rentalPartner', id: p.id, teamId })}>
      <div className="flex items-center gap-3">
        <Avatar name={p.name} hue={p.hue} size={44} />
        <div className="flex-1 min-w-0">
          <div className="font-bold">{p.name}</div>
          <div className="text-[12px] text-ink-500">
            {r.avg !== null ? `★ ${r.avg.toFixed(1)} · ` : ''}팝업 대여 {r.done}회 · {p.regions.join('·')}
          </div>
        </div>
        <Tag tone="red">최대 {maxOff}%↓</Tag>
      </div>
      <div className="flex gap-1.5 mt-3 overflow-x-auto no-scrollbar">
        {items.slice(0, 4).map((it) => (
          <div key={it.id} className="w-24 shrink-0">
            <Swatch hue={it.hue} pattern="grid" className="h-16" rounded="rounded-lg" />
            <div className="text-[12px] mt-1 truncate">{it.name}</div>
            <div className="text-[12px] font-bold text-brand-600 tabular-nums">{won(it.partnerPrice)}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/** 브랜드: 렌탈 제휴 둘러보기 */
export function RentalsBrowse({ teamId, embedded }: { teamId?: string; embedded?: boolean }) {
  const { db, brand } = useMe();
  const [cat, setCat] = useState<RentalCategory | '전체'>('전체');
  // 팀 화면 밖에서 열어도, 준비 중인 내 팀 공간 기준으로 없는 설비를 짚어 준다
  const team = teamById(db, teamId) ?? (brand ? teamsOfBrand(db, brand.id).find((t) => t.stage === '준비 중' && t.spaceId) : undefined);
  teamId = team?.id;
  const missing = missingForSpace(db, team?.spaceId);
  const items = db.rentalItems.filter((i) => i.active && (cat === '전체' || i.category === cat));
  const partners = db.rentalPartners.filter((p) => cat === '전체' || items.some((i) => i.partnerId === p.id));
  return (
    <div className={embedded ? '' : 'px-4'}>
      <WinWinBanner />
      {team && missing.length > 0 && (
        <div className="mt-3 border border-ink-900 p-3.5">
          <div className="text-[13px] font-bold text-brand-700">{team.name} 공간 · {spaceById(db, team.spaceId)?.name}에 없는 설비</div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {missing.map((m) => <Chip key={m.facility} active={cat === m.category} onClick={() => setCat(m.category)}>{m.facility} → {m.category} 빌리기</Chip>)}
          </div>
        </div>
      )}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar mt-4 pb-2">
        {(['전체', ...RENTAL_CATEGORIES] as const).map((c) => <Chip key={c} active={cat === c} onClick={() => setCat(c)}>{c}</Chip>)}
      </div>
      {cat === '전체' ? (
        <div className="space-y-3 mt-1">
          {partners.map((p) => <PartnerCard key={p.id} db={db} partnerId={p.id} teamId={teamId} />)}
        </div>
      ) : (
        <div className="space-y-2 mt-1">
          {items.map((it) => {
            const p = db.rentalPartners.find((x) => x.id === it.partnerId)!;
            return (
              <Card key={it.id} className="p-3 flex gap-3 items-center" onClick={() => navigate({ name: 'rentalPartner', id: p.id, teamId })}>
                <Swatch hue={it.hue} pattern="grid" className="w-16 h-16 shrink-0" rounded="rounded-lg" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{it.name}</div>
                  <div className="text-[12px] text-ink-500 truncate">{p.name}</div>
                </div>
                <Price it={it} />
              </Card>
            );
          })}
          {!items.length && <Empty icon="box">이 카테고리 장비가 아직 없어요</Empty>}
        </div>
      )}
    </div>
  );
}

export function RentalsScreen({ teamId }: { teamId?: string }) {
  return (
    <div className="min-h-screen">
      <SubHeader title="장비 렌탈" />
      <div className="py-4"><RentalsBrowse teamId={teamId} /></div>
    </div>
  );
}

/** 브랜드: 렌탈 업체 상세 + 장바구니 + 예약 요청 */
export function RentalPartnerScreen({ id, teamId }: { id: string; teamId?: string }) {
  const { db, brand, role } = useMe();
  const p = db.rentalPartners.find((x) => x.id === id);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [open, setOpen] = useState(false);
  if (!p) return <Empty>업체를 찾을 수 없어요</Empty>;
  const items = db.rentalItems.filter((i) => i.partnerId === p.id && i.active);
  const r = partnerRating(db, p.id);
  const reviews = db.rentalOrders.filter((o) => o.partnerId === p.id && o.rating);
  const lines = Object.entries(cart).filter(([, q]) => q > 0).map(([itemId, qty]) => ({ itemId, qty }));
  const team = teamById(db, teamId);
  const dates = team?.period ?? { start: '2026-11-20', end: '2026-11-22' };
  const q = rentalQuote(db, p.id, lines, dates, true);
  const setQty = (itemId: string, n: number, max: number) => setCart({ ...cart, [itemId]: Math.max(0, Math.min(max, n)) });

  return (
    <div className="bg-white min-h-screen pb-36">
      <SubHeader title={p.name} />
      <div className="p-4">
        <div className="flex items-center gap-3">
          <Avatar name={p.name} hue={p.hue} size={56} />
          <div>
            <h1 className="text-xl font-extrabold">{p.name}</h1>
            <div className="text-[12px] text-ink-500">{r.avg !== null ? `★ ${r.avg.toFixed(1)} (${r.count}) · ` : ''}팝업 대여 {r.done}회</div>
          </div>
        </div>
        <p className="text-sm text-ink-700 mt-3 leading-relaxed">{p.intro}</p>
        <div className="mt-3 rounded border border-ink-300 p-3 text-[13px] space-y-0.5">
          <div><Ic n="truck" />배송 가능: {p.regions.join(', ')}</div>
          <div><Ic n="box" />왕복 배송·설치비 {won(p.deliveryFee)} · <b>{won(p.freeDeliveryOver)} 이상이면 무료</b></div>
        </div>
        <h3 className="font-bold mt-5 mb-2">대여 장비 {items.length}</h3>
        <div className="space-y-2">
          {items.map((it) => {
            const n = cart[it.id] ?? 0;
            return (
              <Card key={it.id} className="p-3">
                <div className="flex gap-3">
                  <Swatch hue={it.hue} pattern="grid" className="w-20 h-20 shrink-0" rounded="rounded-lg" label={it.category} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{it.name}</div>
                    <div className="text-[12px] text-ink-500 mt-0.5">{it.desc}</div>
                    <div className="text-[12px] text-ink-500 mt-0.5">재고 {it.stock}개</div>
                  </div>
                  <Price it={it} />
                </div>
                {role === 'brand' && (
                  <div className="flex items-center justify-end gap-2 mt-2">
                    <button className="w-8 h-8 rounded-lg border border-ink-300" onClick={() => setQty(it.id, n - 1, it.stock)}>−</button>
                    <span className="w-6 text-center font-bold tabular-nums">{n}</span>
                    <button className="w-8 h-8 rounded-lg border border-ink-300" onClick={() => setQty(it.id, n + 1, it.stock)}>+</button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
        {reviews.length > 0 && (
          <>
            <h3 className="font-bold mt-6 mb-2">브랜드 후기</h3>
            <div className="space-y-2">
              {reviews.map((o) => (
                <Card key={o.id} className="p-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[13px] font-semibold">{brandById(db, o.brandId)?.name}{o.teamId && <span className="text-ink-500 font-normal"> · {teamById(db, o.teamId)?.name}</span>}</span>
                    <Stars value={o.rating!} size="w-3.5 h-3.5" />
                  </div>
                  <p className="text-sm text-ink-700 mt-1">{o.ratingComment}</p>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
      {role === 'brand' && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-ink-100 p-3 pb-safe z-30">
          {lines.length > 0 && p.freeDeliveryOver > 0 && (
            <div className="mb-2.5">
              <div className="text-[12px] font-semibold">
                {q.partnerSum >= p.freeDeliveryOver ? <span className="text-emerald-700"><Ic n="truck" />배송·설치비 무료 적용돼요</span> : <><Ic n="truck" /><b className="text-brand-600">{won(p.freeDeliveryOver - q.partnerSum)}</b> 더 담으면 배송·설치비 {won(p.deliveryFee)} 무료</>}
              </div>
              <div className="h-1 bg-ink-100 mt-1.5 overflow-hidden"><div className={cx('h-full', q.partnerSum >= p.freeDeliveryOver ? 'bg-emerald-500' : 'bg-brand-500')} style={{ width: `${Math.min(100, (q.partnerSum / p.freeDeliveryOver) * 100)}%` }} /></div>
            </div>
          )}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="text-[12px] text-ink-500">{lines.length ? `${q.days}일 기준 · ${won(q.saved)} 아껴요` : '장비를 담아 주세요'}</div>
              <div className="font-extrabold tabular-nums">{won(q.partnerSum)}</div>
            </div>
            <Button size="lg" disabled={!lines.length || !brand} onClick={() => guard(() => setOpen(true))}>예약 요청</Button>
          </div>
        </div>
      )}
      {brand && <OrderSheet open={open} onClose={() => setOpen(false)} partnerId={p.id} lines={lines} defaultTeamId={teamId} onDone={() => { setCart({}); setOpen(false); }} />}
    </div>
  );
}

function OrderSheet({ open, onClose, partnerId, lines, defaultTeamId, onDone }: { open: boolean; onClose: () => void; partnerId: string; lines: { itemId: string; qty: number }[]; defaultTeamId?: string; onDone: () => void }) {
  const { db, brand } = useMe();
  const teams = brand ? teamsOfBrand(db, brand.id).filter((t) => t.stage !== '종료') : [];
  const [teamId, setTeamId] = useState<string | 'solo'>(defaultTeamId ?? teams[0]?.id ?? 'solo');
  const team = teamById(db, teamId === 'solo' ? undefined : teamId);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [delivery, setDelivery] = useState(true);
  const [split, setSplit] = useState(true);
  const [memo, setMemo] = useState('');
  const partner = db.rentalPartners.find((p) => p.id === partnerId)!;
  const dates = { start: start || team?.period.start || '2026-11-20', end: end || team?.period.end || '2026-11-22' };
  const q = rentalQuote(db, partnerId, lines, dates, delivery);
  const sp = spaceById(db, team?.spaceId);
  const outOfRegion = sp && !partner.regions.includes(sp.region);
  const perMember = team ? q.total / team.members.length : q.total;
  return (
    <Sheet open={open} onClose={onClose} title="대여 예약 요청">
      <Field label="누구 이름으로 빌리나요?">
        <div className="flex flex-wrap gap-1.5">
          {teams.map((t) => <Chip key={t.id} active={teamId === t.id} onClick={() => { setTeamId(t.id); setStart(''); setEnd(''); }}>팀 {t.name}</Chip>)}
          <Chip active={teamId === 'solo'} onClick={() => setTeamId('solo')}>우리 브랜드 단독</Chip>
        </div>
      </Field>
      <Field label="대여 기간" hint={sp ? `배송지: ${sp.name}` : '배송지는 채팅으로 알려 주세요'}>
        <div className="flex items-center gap-2">
          <input type="date" className={inputCls} value={dates.start} onChange={(e) => setStart(e.target.value)} />
          <span>~</span>
          <input type="date" className={inputCls} value={dates.end} onChange={(e) => setEnd(e.target.value)} />
        </div>
      </Field>
      {outOfRegion && <p className="text-[12px] text-red-500 -mt-2 mb-3">{partner.name}은(는) {sp!.region} 배송이 어려울 수 있어요. 메모로 문의해 보세요.</p>}
      <div className="flex gap-2 mb-4">
        <Chip active={delivery} onClick={() => setDelivery(true)}>배송·설치 받기</Chip>
        <Chip active={!delivery} onClick={() => setDelivery(false)}>직접 픽업</Chip>
      </div>
      {team && (
        <label className="flex items-center gap-2 text-sm mb-4">
          <input type="checkbox" checked={split} onChange={(e) => setSplit(e.target.checked)} className="w-4 h-4 accent-brand-500" />
          확정되면 팀 분담금의 공통비로 넣기 (1팀당 약 {won(perMember)})
        </label>
      )}
      <textarea className={textareaCls} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="설치 시간, 출입 방법 등 (선택)" />
      <div className="rounded bg-ink-100/60 p-3.5 mt-3 text-sm space-y-1 tabular-nums">
        <div className="flex justify-between text-ink-500"><span>일반 대여가 ({q.days}일)</span><span className="line-through">{won(q.list)}</span></div>
        <div className="flex justify-between"><span>OFF STAGE 제휴가</span><span>{won(q.partnerSum)}</span></div>
        <div className="flex justify-between"><span>배송·설치비</span><span>{q.deliveryFee ? won(q.deliveryFee) : '무료'}</span></div>
        <div className="flex justify-between font-extrabold text-base pt-1 border-t border-ink-300/60"><span>합계</span><span>{won(q.total)}</span></div>
        <div className="text-right text-[12px] font-bold text-rose-500">{won(q.list - q.partnerSum)} 절약</div>
      </div>
      <Button full size="lg" className="mt-4" onClick={() => {
        requestRental({ partnerId, teamId: team?.id, brandId: brand!.id, spaceId: team?.spaceId, lines, dates, delivery, addToTeamCost: !!team && split, memo });
        onDone();
        if (team) navigate({ name: 'team', id: team.id, sub: 'rental' });
      }}>{won(q.total)} 예약 요청</Button>
      <p className="text-[12px] text-ink-500 text-center mt-2">실제 결제는 이뤄지지 않아요 <Demo /></p>
    </Sheet>
  );
}

export function OrderSummary({ db, o, right }: { db: DB; o: RentalOrder; right?: React.ReactNode }) {
  const p = db.rentalPartners.find((x) => x.id === o.partnerId)!;
  const q = rentalQuote(db, o.partnerId, o.lines, o.dates, o.delivery);
  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="font-bold text-sm">{p.name}</div>
        <Tag tone={STATUS[o.status].tone}>{STATUS[o.status].label}</Tag>
      </div>
      <div className="text-[12px] text-ink-500 mt-0.5">{period(o.dates)} ({q.days}일) · {o.delivery ? '배송·설치' : '직접 픽업'}{o.addToTeamCost ? ' · 팀 공통비' : ''}</div>
      <div className="mt-2 space-y-0.5">
        {o.lines.map((l) => {
          const it = db.rentalItems.find((i) => i.id === l.itemId);
          return <div key={l.itemId} className="text-[13px] flex justify-between"><span>{it?.name}</span><span className="tabular-nums">× {l.qty}</span></div>;
        })}
      </div>
      <div className="flex justify-between items-end mt-2">
        <span className="text-[12px] text-rose-500 font-semibold">{won(q.saved)} 절약</span>
        <span className="font-extrabold tabular-nums">{won(q.total)}</span>
      </div>
      {o.memo && <p className="text-[12px] text-ink-500 mt-1">메모: {o.memo}</p>}
      {right}
    </div>
  );
}

/** 브랜드: 팀 공간의 렌탈 탭 */
export function TeamRentalTab({ team }: { team: Team }) {
  const { db, brand } = useMe();
  const orders = db.rentalOrders.filter((o) => o.teamId === team.id);
  const [rating, setRating] = useState<string | null>(null);
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState('');
  const spent = orders.filter((o) => o.status !== 'rejected').reduce((s, o) => s + rentalQuote(db, o.partnerId, o.lines, o.dates, o.delivery).saved, 0);
  return (
    <div>
      {orders.length > 0 && (
        <div className="rounded bg-rose-50 text-rose-700 p-3.5 mb-3 text-sm">
          우리 팀은 렌탈 제휴로 <b>{won(spent)}</b>을 아꼈어요.
        </div>
      )}
      <h3 className="font-bold mb-2">팀 렌탈 예약 {orders.length}</h3>
      {orders.length === 0 && <p className="text-sm text-ink-500 mb-3">아직 빌린 장비가 없어요.</p>}
      <div className="space-y-2 mb-5">
        {orders.map((o) => {
          const partner = db.rentalPartners.find((p) => p.id === o.partnerId)!;
          return (
            <Card key={o.id} className="p-3.5">
              <OrderSummary db={db} o={o} />
              <div className="text-[12px] text-ink-500 mt-1">신청: {brandById(db, o.brandId)?.name}</div>
              {o.status === 'requested' && (
                <Button size="sm" variant="secondary" className="mt-2" onClick={() => { switchRole('rental', partner.userId); navigate({ name: 'tab', tab: 'orders' }); }}>
                  {partner.name} 시점으로 확정하러 가기 <Demo />
                </Button>
              )}
              {o.status === 'returned' && !o.rating && o.brandId === brand?.id && (
                <Button size="sm" className="mt-2" onClick={() => { setRating(o.id); setStars(5); setComment(''); }}>업체 별점 남기기</Button>
              )}
              {o.rating && <div className="mt-2 text-[12px]">내 별점 ★ {o.rating} · {o.ratingComment}</div>}
            </Card>
          );
        })}
      </div>
      <h3 className="font-bold mb-2">장비 빌리기</h3>
      <RentalsBrowse teamId={team.id} embedded />
      <Sheet open={!!rating} onClose={() => setRating(null)} title="렌탈 업체 별점">
        <Stars value={stars} onChange={setStars} size="w-8 h-8" />
        <textarea className={textareaCls + ' mt-3'} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="장비 상태, 배송·설치는 어땠나요?" />
        <Button full className="mt-3" disabled={!comment.trim()} onClick={() => { rateRental(rating!, stars, comment); setRating(null); }}>등록</Button>
      </Sheet>
    </div>
  );
}

// ───────── 렌탈 업체 시점 ─────────
export function MyItemsTab() {
  const { db, rental } = useMe();
  if (!rental) return <Empty>렌탈 업체 계정에서 볼 수 있어요</Empty>;
  const items = db.rentalItems.filter((i) => i.partnerId === rental.id);
  const orders = db.rentalOrders.filter((o) => o.partnerId === rental.id && o.status !== 'rejected');
  const revenue = orders.reduce((s, o) => s + rentalQuote(db, o.partnerId, o.lines, o.dates, o.delivery).total, 0);
  const rentedDays = orders.reduce((s, o) => s + o.lines.reduce((x, l) => x + l.qty, 0) * rentalDays(o.dates), 0);
  const capacity = items.reduce((s, i) => s + i.stock, 0) * 30;
  const r = partnerRating(db, rental.id);
  const idle = items.filter((it) => it.active && !orders.some((o) => o.dates.end >= DEMO_TODAY && o.lines.some((l) => l.itemId === it.id)));
  // 곧 열리는 팝업 중 공간에 이 장비 종류가 없는 곳 = 잠재 수요
  const demand = (it: RentalItem) => db.popups.filter((p) => p.status === '예정' && missingForSpace(db, p.spaceId).some((m) => m.category === it.category)).length;
  return (
    <div>
      <ScreenTitle right={<Button size="sm" onClick={() => navigate({ name: 'rentalItemEdit' })}>+ 장비 등록</Button>}>내 장비</ScreenTitle>
      <div className="px-4">
        <div className="grid grid-cols-3 gap-2 mb-4 text-center">
          <div className="rounded-md bg-white border border-ink-100 py-3"><div className="text-[12px] text-ink-500">팝업 예약</div><div className="font-extrabold">{orders.length}건</div></div>
          <div className="rounded-md bg-white border border-ink-100 py-3"><div className="text-[12px] text-ink-500">예약 매출</div><div className="font-extrabold tabular-nums">{Math.round(revenue / 10000)}만원</div></div>
          <div className="rounded-md bg-white border border-ink-100 py-3"><div className="text-[12px] text-ink-500">30일 가동률</div><div className="font-extrabold">{capacity ? Math.min(100, Math.round((rentedDays / capacity) * 100)) : 0}%</div></div>
        </div>
        <p className="text-[12px] text-ink-500 mb-3">
          제휴가는 일반가보다 낮지만, 창고에 있던 장비가 팝업 일정마다 다시 나가요. {r.avg !== null && `브랜드 평점 ★ ${r.avg.toFixed(1)}`}
        </p>
        {idle.length > 0 && (
          <div className="rounded p-3.5 mb-4 border border-amber-200 bg-amber-50">
            <div className="font-bold text-[14px] mb-0.5"><Ic n="bulb" />다가오는 예약이 없는 장비 {idle.length}개</div>
            <p className="text-[12px] text-ink-700 mb-2.5">앞으로 잡힌 팝업 일정이 없어요. 제휴가를 조금 내리면 브랜드 장바구니에 먼저 담겨요.</p>
            <div className="space-y-2">
              {idle.map((it) => {
                const n = demand(it);
                return (
                  <div key={it.id} className="flex items-center gap-2.5 bg-white rounded-md p-2.5">
                    <Swatch hue={it.hue} pattern="grid" className="w-10 h-10 shrink-0" rounded="rounded-lg" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold truncate">{it.name}</div>
                      <div className="text-[12px] text-ink-500">{n > 0 ? `곧 열 팝업 ${n}곳 공간에 ${josa(it.category, "이", "가")} 없어요` : `지금 제휴가 ${won(it.partnerPrice)} · ${discountPct(it)}% 할인 중`}</div>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => lowerPartnerPrice(it.id)}>10% 내리기</Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div className="space-y-2">
          {items.map((it) => (
            <Card key={it.id} className={cx('p-3', !it.active && 'opacity-50')}>
              <div className="flex gap-3">
                <Swatch hue={it.hue} pattern="grid" className="w-16 h-16 shrink-0" rounded="rounded-lg" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{it.name}</div>
                  <div className="text-[12px] text-ink-500">{it.category} · 재고 {it.stock}개</div>
                  <div className="text-[12px] mt-0.5">{(() => { const n = orders.filter((o) => o.lines.some((l) => l.itemId === it.id)).length; return n ? <span className="text-brand-600 font-semibold">예약 {n}회</span> : <span className="text-ink-500">아직 예약 없음</span>; })()}</div>
                  <div className="flex gap-2 mt-1.5">
                    <button className="text-[12px] text-brand-600 font-semibold" onClick={() => navigate({ name: 'rentalItemEdit', id: it.id })}>수정</button>
                    <button className="text-[12px] text-ink-500" onClick={() => toggleRentalItem(it.id)}>{it.active ? '노출 중지' : '다시 노출'}</button>
                  </div>
                </div>
                <Price it={it} />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

export function RentalItemEdit({ id }: { id?: string }) {
  const { db, rental } = useMe();
  const ex = db.rentalItems.find((i) => i.id === id);
  const [d, setD] = useState<Omit<RentalItem, 'id' | 'partnerId'>>(
    ex ? { name: ex.name, category: ex.category, desc: ex.desc, dailyPrice: ex.dailyPrice, partnerPrice: ex.partnerPrice, stock: ex.stock, hue: ex.hue, active: ex.active }
      : { name: '', category: '행거', desc: '', dailyPrice: 20000, partnerPrice: 13000, stock: 5, hue: Math.floor(Math.random() * 360), active: true },
  );
  if (!rental) return <Empty>렌탈 업체 계정에서 볼 수 있어요</Empty>;
  const pct = d.dailyPrice ? Math.round((1 - d.partnerPrice / d.dailyPrice) * 100) : 0;
  const ok = d.name.trim() && d.partnerPrice > 0 && d.partnerPrice < d.dailyPrice && d.stock > 0;
  return (
    <div className="bg-white min-h-screen">
      <SubHeader title={ex ? '장비 수정' : '장비 등록'} />
      <div className="p-4">
        <Field label="장비 이름" required><input className={inputCls} value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder="예) 블랙 철제 행거" /></Field>
        <Field label="종류">
          <div className="flex flex-wrap gap-1.5">{RENTAL_CATEGORIES.map((c) => <Chip key={c} active={d.category === c} onClick={() => setD({ ...d, category: c })}>{c}</Chip>)}</div>
        </Field>
        <Field label="설명"><textarea className={textareaCls} value={d.desc} onChange={(e) => setD({ ...d, desc: e.target.value })} /></Field>
        <div className="grid grid-cols-3 gap-2">
          <Field label="일반가(1일)"><input type="number" className={inputCls} value={d.dailyPrice} onChange={(e) => setD({ ...d, dailyPrice: Number(e.target.value) })} /></Field>
          <Field label="제휴가(1일)"><input type="number" className={inputCls} value={d.partnerPrice} onChange={(e) => setD({ ...d, partnerPrice: Number(e.target.value) })} /></Field>
          <Field label="재고"><input type="number" className={inputCls} value={d.stock} onChange={(e) => setD({ ...d, stock: Number(e.target.value) })} /></Field>
        </div>
        <div className={cx('rounded-md p-3 text-sm mb-4', pct >= 20 ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800')}>
          제휴 할인율 <b>{pct}%</b> · {pct >= 20 ? '브랜드에게 잘 보여요' : '20% 이상이면 추천 목록에 더 잘 노출돼요'}
        </div>
        <Button full size="lg" disabled={!ok} onClick={() => { saveRentalItem(rental.id, d, id); back(); }}>{ex ? '저장' : '등록'}</Button>
        {d.partnerPrice >= d.dailyPrice && <p className="text-xs text-red-500 text-center mt-2">제휴가는 일반가보다 낮아야 해요</p>}
      </div>
    </div>
  );
}

export function OrdersTab() {
  const { db, rental } = useMe();
  const [tab, setTab] = useState<'new' | 'ongoing' | 'done'>('new');
  if (!rental) return <Empty>렌탈 업체 계정에서 볼 수 있어요</Empty>;
  const all = db.rentalOrders.filter((o) => o.partnerId === rental.id);
  const groups = {
    new: all.filter((o) => o.status === 'requested'),
    ongoing: all.filter((o) => o.status === 'confirmed' || o.status === 'delivered').sort((a, b) => a.dates.start.localeCompare(b.dates.start)),
    done: all.filter((o) => o.status === 'returned' || o.status === 'rejected'),
  };
  return (
    <div>
      <ScreenTitle>받은 예약</ScreenTitle>
      <div className="px-4 mb-3">
        <Segmented items={[{ key: 'new', label: `새 요청 ${groups.new.length}` }, { key: 'ongoing', label: `진행 ${groups.ongoing.length}` }, { key: 'done', label: '완료' }]} value={tab} onChange={setTab} />
      </div>
      <div className="px-4 space-y-3">
        {groups[tab].length === 0 && <Empty icon="inbox">해당하는 예약이 없어요</Empty>}
        {groups[tab].map((o) => {
          const team = teamById(db, o.teamId);
          const sp = spaceById(db, o.spaceId);
          const b = brandById(db, o.brandId)!;
          return (
            <Card key={o.id} className="p-4">
              <div className="text-[13px] mb-2">
                {o.status === 'confirmed' && <span className="text-[12px] font-black text-white bg-brand-500 px-2 py-0.5 mr-1.5">배송 {dday(o.dates.start)}</span>}
                <b>{team ? `팀 ${team.name}` : b.name}</b>
                <span className="text-ink-500"> · 신청 {b.name}{team ? ` 외 ${team.members.length - 1}곳` : ''}</span>
                {sp && <div className="text-[12px] text-ink-500"><Ic n="pin" />{sp.name} ({sp.region})</div>}
              </div>
              <OrderSummary db={db} o={o} />
              {o.status === 'requested' && (
                <div className="mt-2 rounded border border-ink-300 px-3 py-2 space-y-0.5">
                  {o.lines.map((l) => {
                    // 같은 기간에 이미 나가 있는 수량을 빼고 남는 재고
                    const it = db.rentalItems.find((x) => x.id === l.itemId);
                    if (!it) return null;
                    const out = db.rentalOrders
                      .filter((x) => x.id !== o.id && (x.status === 'confirmed' || x.status === 'delivered') && x.dates.start <= o.dates.end && o.dates.start <= x.dates.end)
                      .reduce((n, x) => n + x.lines.filter((y) => y.itemId === l.itemId).reduce((m, y) => m + y.qty, 0), 0);
                    const left = it.stock - out;
                    return (
                      <div key={l.itemId} className="flex justify-between text-[12px]">
                        <span className="text-ink-500">{it.name} 이 기간 남은 재고</span>
                        <span className={cx('font-bold', left >= l.qty ? 'text-emerald-700' : 'text-red-600')}>{left}개 {left >= l.qty ? '· 가능' : '· 부족'}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              {o.status === 'requested' && (
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <Button size="sm" variant="secondary" onClick={() => decideRental(o.id, false)}>재고 없음(거절)</Button>
                  <Button size="sm" onClick={() => decideRental(o.id, true)}>예약 확정</Button>
                </div>
              )}
              {o.status === 'confirmed' && <Button size="sm" full variant="dark" className="mt-3" onClick={() => advanceRental(o.id)}>배송·설치 완료로 바꾸기</Button>}
              {o.status === 'delivered' && <Button size="sm" full variant="dark" className="mt-3" onClick={() => advanceRental(o.id)}>반납 확인</Button>}
              {o.rating && <div className="mt-2 text-[12px] text-ink-700">★ {o.rating} · {o.ratingComment}</div>}
              {o.status !== 'returned' && o.status !== 'rejected' && (
                <button className="mt-2.5 w-full text-center text-[12px] text-ink-500" onClick={() => openDirectChat(b.userId, `${rental.name} · ${b.name}`)}>
                  {josa(o.status === "delivered" ? "반납 시간" : "설치 시간·위치", "을", "를")} {b.name}에게 물어보기 ›
                </button>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export function RentalMeCard() {
  const { db, rental } = useMe();
  if (!rental) return null;
  const r = partnerRating(db, rental.id);
  return (
    <Card className="p-4">
      <div className="font-bold">{rental.name}</div>
      <p className="text-sm text-ink-500 mt-1">{rental.intro}</p>
      <div className="text-[13px] mt-2">브랜드 평점: {r.avg !== null ? `★ ${r.avg.toFixed(1)} (${r.count})` : '아직 없음'} · 반납 완료 {r.done}건</div>
      <div className="text-[12px] text-ink-500 mt-2 mb-1">배송 지역</div>
      <div className="flex gap-1 flex-wrap">{REGIONS.map((x) => <Tag key={x} tone={rental.regions.includes(x) ? 'green' : 'gray'}>{x}</Tag>)}</div>
      <Button variant="secondary" full className="mt-3" onClick={() => navigate({ name: 'rentalPartner', id: rental.id })}>브랜드에게 보이는 내 업체 페이지</Button>
    </Card>
  );
}
