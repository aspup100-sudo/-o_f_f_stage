// 화면과 무관한 계산 로직: 신뢰 지수, 추천 점수, 분담금
import type { DB } from '@/data/mock';
import type { BrandProfile, Grade, Recruitment, Review, Team, TrustEvent, TrustScore } from '@/types';
import { PRICE_RANGES } from '@/types';
import { DEMO_TODAY } from '@/data/mock';

// ───────── 포맷 ─────────
export const won = (n: number) => `${Math.round(n).toLocaleString('ko-KR')}원`;
export const manwon = (n: number) => {
  const m = n / 10000;
  return `${m % 1 === 0 ? m.toLocaleString('ko-KR') : m.toFixed(1)}만원`;
};
export const md = (d: string) => {
  const [, m, day] = d.split('-');
  return `${Number(m)}/${Number(day)}`;
};
export const period = (p: { start: string; end: string }) => (p.start === p.end ? md(p.start) : `${md(p.start)}~${md(p.end)}`);
export const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
export const reviewAvg = (r: Pick<Review, 'scores'>) => avg(Object.values(r.scores));

// ───────── 신뢰 지수 ─────────
// 시작 50 / 인증 공동 팝업 +2 / 후기 평균 4.5 이상 +1, 4.0 미만 -1 / 노쇼 -10 / 일방적 취소 -3 / 신고 확정 -5
// 같은 작성자→같은 대상의 후기는 두 번째부터 반영치 절반
export const TRUST_RULES = [
  ['시작 점수', '50'],
  ['인증 공동 팝업 1회', '+2'],
  ['받은 후기 평균 4.5 이상', '+1'],
  ['받은 후기 평균 4.0 미만', '-1'],
  ['노쇼', '-10'],
  ['일방적 취소', '-3'],
  ['신고 확정', '-5'],
] as const;

export function gradeOf(score: number, verifiedPopups: number): Grade {
  if (verifiedPopups === 0) return '새싹';
  if (score >= 58) return '골드';
  if (score >= 55) return '실버';
  return '브론즈';
}

/** 브랜드(brandId) 또는 임대인(landlordProfileId)이 받은 업무 후기 */
export function receivedReviews(db: DB, subjectId: string): Review[] {
  const brand = db.brands.find((b) => b.id === subjectId);
  if (brand) {
    const teamIds = db.teams.filter((t) => t.members.some((m) => m.brandId === subjectId)).map((t) => t.id);
    return db.reviews.filter(
      (r) => !r.hidden && ((r.kind === 'brand_to_brand' && r.targetId === subjectId) || (r.kind === 'space_to_team' && teamIds.includes(r.targetId))),
    );
  }
  const ll = db.landlords.find((l) => l.id === subjectId);
  if (ll) return db.reviews.filter((r) => !r.hidden && r.kind === 'brand_to_space' && ll.spaceIds.includes(r.targetId));
  return [];
}

export function subjectUserId(db: DB, subjectId: string) {
  return db.brands.find((b) => b.id === subjectId)?.userId ?? db.landlords.find((l) => l.id === subjectId)?.userId;
}

export function trustEvents(db: DB, subjectId: string): TrustEvent[] {
  const uid = subjectUserId(db, subjectId);
  const out: TrustEvent[] = db.trustEvents.filter((e) => e.subjectId === subjectId);
  db.completions
    .filter((c) => c.verified && uid && c.required.includes(uid))
    .forEach((c) => {
      const p = db.popups.find((x) => x.id === c.popupId);
      out.push({ id: `c_${c.popupId}`, subjectId, type: 'completion', delta: 2, note: `인증 공동 팝업: ${p?.title ?? ''}`, at: p?.period.end ?? '' });
    });
  const seen = new Map<string, number>();
  [...receivedReviews(db, subjectId)]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .forEach((r) => {
      const a = reviewAvg(r);
      const key = `${r.authorId}>${r.targetId}`;
      const n = seen.get(key) ?? 0;
      seen.set(key, n + 1);
      const weight = n === 0 ? 1 : 0.5;
      if (a >= 4.5) out.push({ id: `r_${r.id}`, subjectId, type: 'high_review', delta: 1 * weight, note: `후기 평균 ${a.toFixed(1)}${weight < 1 ? ' (반복 후기 절반 반영)' : ''}`, at: r.createdAt });
      else if (a < 4.0) out.push({ id: `r_${r.id}`, subjectId, type: 'low_review', delta: -1 * weight, note: `후기 평균 ${a.toFixed(1)}${weight < 1 ? ' (반복 후기 절반 반영)' : ''}`, at: r.createdAt });
    });
  return out.sort((a, b) => b.at.localeCompare(a.at));
}

export function trustScore(db: DB, subjectId: string): TrustScore {
  const evs = trustEvents(db, subjectId);
  const score = 50 + evs.reduce((s, e) => s + e.delta, 0);
  const verifiedPopups = evs.filter((e) => e.type === 'completion').length;
  const rv = receivedReviews(db, subjectId);
  const avgRating = rv.length ? avg(rv.map(reviewAvg)) : null;
  return { subjectId, score, grade: gradeOf(score, verifiedPopups), verifiedPopups, avgRating, reviewCount: rv.length };
}

// ───────── 브랜드 추천 ─────────
const sim = (a: BrandProfile, b: BrandProfile) =>
  a.tags.moods.filter((m) => b.tags.moods.includes(m)).length + a.tags.categories.filter((c) => b.tags.categories.includes(c)).length;

export function matchScore(db: DB, me: BrandProfile, other: BrandProfile) {
  const reasons: string[] = [];
  let score = 0;
  const moods = me.tags.moods.filter((m) => other.tags.moods.includes(m));
  if (moods.length) {
    score += moods.length * 3;
    reasons.push(`무드 겹침: ${moods.join(', ')}`);
  }
  const pd = Math.abs(PRICE_RANGES.indexOf(me.tags.price) - PRICE_RANGES.indexOf(other.tags.price));
  if (pd === 0) { score += 2; reasons.push('가격대 같음'); } else if (pd === 1) score += 1;
  const ages = me.tags.ages.filter((a) => other.tags.ages.includes(a));
  if (ages.length) { score += ages.length * 1.5; reasons.push(`고객층 겹침: ${ages.join(', ')}`); }
  const diffCats = other.tags.categories.filter((c) => !me.tags.categories.includes(c));
  const sameCats = other.tags.categories.filter((c) => me.tags.categories.includes(c));
  score += diffCats.length * 2 - sameCats.length;
  if (diffCats.length) reasons.push(`서로 다른 카테고리: ${diffCats.join(', ')}`);
  // 조합 리뷰 가산점: 평점 높은 조합(x,y)에서 내가 x와 비슷하고 상대가 y와 비슷하면
  let comboBonus = false;
  db.comboReviews.filter((c) => c.good && c.rating >= 4).forEach((c) =>
    c.pairs.forEach(([x, y]) => {
      const bx = db.brands.find((b) => b.id === x);
      const by = db.brands.find((b) => b.id === y);
      if (!bx || !by) return;
      if ((sim(me, bx) >= 2 && sim(other, by) >= 2) || (sim(me, by) >= 2 && sim(other, bx) >= 2)) comboBonus = true;
    }),
  );
  if (comboBonus) { score += 2; reasons.push('방문객이 좋아한 조합과 닮았어요'); }
  return { score, reasons };
}

export function recommendations(db: DB, me: BrandProfile, limit = 5) {
  return db.brands
    .filter((b) => b.id !== me.id && isListedBrand(db, b))
    .map((b) => ({ brand: b, ...matchScore(db, me, b) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function isListedBrand(db: DB, b: BrandProfile) {
  const u = db.users.find((x) => x.id === b.userId);
  return !!u && u.verifyStatus === 'verified' && !u.hidden;
}

// ───────── 분담금 ─────────
export function slotShare(totalBudget: number, slots: { hangers: number }[], slotHangers = 1, mode: 'category' | 'hanger' = 'category') {
  if (!slots.length) return 0;
  if (mode === 'category') return totalBudget / slots.length;
  const total = slots.reduce((s, x) => s + x.hangers, 0) || 1;
  return (totalBudget * slotHangers) / total;
}

export function teamCost(db: DB, team: Team) {
  const split = db.costSplits.find((c) => c.teamId === team.id);
  if (!split) return { total: 0, shares: {} as Record<string, number>, split };
  const total = split.spaceFee + split.commonItems.reduce((s, c) => s + c.amount, 0);
  const shares: Record<string, number> = {};
  const totalHangers = team.members.reduce((s, m) => s + m.hangers, 0) || 1;
  team.members.forEach((m) => {
    shares[m.brandId] = split.mode === 'equal' ? total / team.members.length : (total * m.hangers) / totalHangers;
  });
  return { total, shares, split };
}

// ───────── 조회 도우미 ─────────
export const brandById = (db: DB, id?: string) => db.brands.find((b) => b.id === id);
export const userById = (db: DB, id?: string) => db.users.find((u) => u.id === id);
export const spaceById = (db: DB, id?: string) => db.spaces.find((s) => s.id === id);
export const teamById = (db: DB, id?: string) => db.teams.find((t) => t.id === id);
export const popupById = (db: DB, id?: string) => db.popups.find((p) => p.id === id);
export const brandOfUser = (db: DB, userId?: string) => db.brands.find((b) => b.userId === userId);
export const landlordOfUser = (db: DB, userId?: string) => db.landlords.find((l) => l.userId === userId);
export const displayName = (db: DB, userId: string) => {
  const u = userById(db, userId);
  if (!u) return '알 수 없음';
  return u.name;
};
export const teamsOfBrand = (db: DB, brandId: string) => db.teams.filter((t) => t.members.some((m) => m.brandId === brandId));

// ───────── 렌탈 ─────────
export const rentalDays = (d: { start: string; end: string }) => Math.max(1, Math.round((new Date(d.end).getTime() - new Date(d.start).getTime()) / 86400000) + 1);

export function rentalQuote(db: DB, partnerId: string, lines: { itemId: string; qty: number }[], dates: { start: string; end: string }, delivery: boolean) {
  const days = rentalDays(dates);
  const partner = db.rentalPartners.find((p) => p.id === partnerId);
  let list = 0;
  let partnerSum = 0;
  lines.forEach((l) => {
    const it = db.rentalItems.find((i) => i.id === l.itemId);
    if (!it) return;
    list += it.dailyPrice * l.qty * days;
    partnerSum += it.partnerPrice * l.qty * days;
  });
  const deliveryFee = delivery && partner && partnerSum < partner.freeDeliveryOver ? partner.deliveryFee : 0;
  return { days, list, partnerSum, deliveryFee, total: partnerSum + deliveryFee, saved: list - partnerSum };
}

export const discountPct = (it: { dailyPrice: number; partnerPrice: number }) => Math.round((1 - it.partnerPrice / it.dailyPrice) * 100);

export function partnerRating(db: DB, partnerId: string) {
  const rs = db.rentalOrders.filter((o) => o.partnerId === partnerId && o.rating).map((o) => o.rating!);
  return { avg: rs.length ? avg(rs) : null, count: rs.length, done: db.rentalOrders.filter((o) => o.partnerId === partnerId && o.status === 'returned').length };
}

/** 공간 설비 중 빠진 것 → 렌탈 카테고리 추천 */
export const FACILITY_TO_RENTAL: Record<string, import('@/types').RentalCategory> = { 행거: '행거', 전신거울: '전신거울', 피팅룸: '피팅룸 텐트', 조명: '조명' };
export function missingForSpace(db: DB, spaceId?: string) {
  const sp = db.spaces.find((s) => s.id === spaceId);
  if (!sp) return [];
  return Object.entries(FACILITY_TO_RENTAL).filter(([f]) => !sp.facilities.includes(f as any)).map(([f, c]) => ({ facility: f, category: c }));
}

// ───────── 준비 체크리스트 · D-day ─────────
/** 오늘(데모 기준일)부터 날짜까지 남은 일수. 지났으면 음수. */
export const daysUntil = (date: string) => Math.round((new Date(date).getTime() - new Date(DEMO_TODAY).getTime()) / 86400000);
export const dday = (date: string) => {
  const n = daysUntil(date);
  return n > 0 ? `D-${n}` : n === 0 ? 'D-DAY' : `D+${-n}`;
};

export interface PrepStep {
  key: string;
  label: string;
  done: boolean;
  sub: string; // 팀 화면의 탭
  mine?: boolean; // 내가 해야 하는 일
}

/** 팝업 오픈까지 팀이 끝내야 할 일. 데이터에서 바로 계산한다. */
export function teamPrep(db: DB, team: Team, myBrandId: string): { steps: PrepStep[]; done: number; pct: number } {
  const ag = db.agreements.find((a) => a.teamId === team.id);
  const split = db.costSplits.find((c) => c.teamId === team.id);
  const mood = db.moodboards.find((m) => m.teamId === team.id);
  const shift = db.shifts.find((x) => x.teamId === team.id);
  const slots = shift ? shift.dates.length * shift.timeSlots.length : 0;
  const filled = shift ? Object.values(shift.assign).filter(Boolean).length : 0;
  const steps: PrepStep[] = [
    { key: 'agree', label: ag?.agreedBy.includes(myBrandId) ? `약속서 전원 동의 (${ag?.agreedBy.length ?? 0}/${team.members.length})` : '약속서 읽고 동의하기', done: team.confirmed, sub: 'agreement', mine: !ag?.agreedBy.includes(myBrandId) },
    { key: 'space', label: '공간 확정', done: !!team.spaceId, sub: 'space' },
    { key: 'pay', label: split ? `분담금 내기 (기한 ${md(split.dueDate)})` : '분담금 내기', done: !!split?.paid.includes(myBrandId), sub: 'cost', mine: true },
    { key: 'mood', label: '무드보드에 룩북 3장 고르기', done: (mood?.picks[myBrandId]?.length ?? 0) >= 3, sub: 'moodboard', mine: true },
    { key: 'shift', label: `근무표 채우기 (${filled}/${slots})`, done: slots > 0 && filled >= slots, sub: 'shift' },
    { key: 'promo', label: '홍보 같은 날 게시 체크', done: team.promoChecked.includes(myBrandId), sub: 'promo', mine: true },
  ];
  const done = steps.filter((x) => x.done).length;
  return { steps, done, pct: Math.round((done / steps.length) * 100) };
}

export const waitCount = (p: { waiters?: string[]; waitBase?: number }) => (p.waitBase ?? 0) + (p.waiters?.length ?? 0);

/** 받침에 맞춰 '이/가' 같은 조사를 붙인다. josa('소금상점', '이', '가') → '소금상점이' */
export const josa = (word: string, withBatchim: string, without: string) => {
  const c = word.charCodeAt(word.length - 1);
  const has = c >= 0xac00 && c <= 0xd7a3 ? (c - 0xac00) % 28 !== 0 : false;
  return word + (has ? withBatchim : without);
};

// ───────── 모집글 맞춤 · 마감 임박 ─────────
const overlaps = (a: { start: string; end: string }, b: { start: string; end: string }) => a.start <= b.end && b.start <= a.end;

/** 내 브랜드가 이 모집글에 얼마나 잘 맞는지. 빈자리·일정·모집자와의 궁합을 본다. */
export function recruitFit(db: DB, me: BrandProfile, r: Recruitment) {
  const reasons: string[] = [];
  let score = 0;
  const empty = r.slots.filter((s) => s.status === '비어 있음');
  if (!empty.length || r.status === '마감' || r.hostBrandId === me.id || r.slots.some((s) => s.brandId === me.id)) return { score: -1, reasons };
  const catSlot = empty.find((s) => s.category && me.tags.categories.includes(s.category));
  if (r.slotMode === 'hanger') { score += 2; reasons.push('행거 단위라 어떤 카테고리든 OK'); }
  else if (catSlot) { score += 4; reasons.push(`${catSlot.label} 자리가 비어 있어요`); }
  if (me.availability.some((a) => overlaps(a, r.period))) { score += 3; reasons.push('내 팝업 가능 기간과 겹쳐요'); }
  const host = db.brands.find((b) => b.id === r.hostBrandId);
  if (host) {
    const m = matchScore(db, me, host);
    score += m.score / 3;
    const mood = m.reasons.find((x) => x.startsWith('무드'));
    if (mood) reasons.push(mood.replace('무드 겹침', '모집자와 무드 겹침'));
  }
  return { score, reasons };
}

/** 마감 임박 이유. 없으면 undefined */
export function recruitUrgency(r: Recruitment) {
  if (r.status === '마감') return undefined;
  const empty = r.slots.filter((s) => s.status === '비어 있음').length;
  if (empty === 1) return '마지막 1자리';
  const d = daysUntil(r.period.start);
  if (d >= 0 && d <= 14 && empty > 0) return `오픈 ${d}일 전`;
  return undefined;
}
