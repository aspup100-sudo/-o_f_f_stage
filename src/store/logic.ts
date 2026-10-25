// 화면과 무관한 계산 로직: 신뢰 지수, 추천 점수, 분담금
import type { DB } from '@/data/mock';
import type { BrandProfile, Grade, Review, Team, TrustEvent, TrustScore } from '@/types';
import { PRICE_RANGES } from '@/types';

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
