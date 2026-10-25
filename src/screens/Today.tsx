// 둘러보기 맨 위 '오늘' 영역: 내 팝업까지 남은 날과 지금 해야 할 일을 모아 보여 준다.
import { useState } from 'react';
import { useMe } from '@/store/hooks';
import { navigate } from '@/store/store';
import { brandById, daysUntil, josa, manwon, partnerRating, rentalQuote, won, recruitUrgency, dday, md, popupById, spaceById, teamById, teamPrep, teamsOfBrand, waitCount } from '@/store/logic';
import { STAMP_GOAL, toggleWaitlist } from '@/store/actions';
import { DEMO_TODAY } from '@/data/mock';
import { cx, Icon } from '@/components/ui';
import type { Route } from '@/types';

export function ProgressBar({ pct, className }: { pct: number; className?: string }) {
  return (
    <div className={cx('h-1.5 rounded-full bg-ink-100 overflow-hidden', className)}>
      <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

function TodoRow({ label, hint, onClick, tone = 'default' }: { label: string; hint?: string; onClick: () => void; tone?: 'default' | 'hot' }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-2.5 py-2.5 text-left">
      <span className={cx('w-5 h-5 rounded-full border-2 shrink-0', tone === 'hot' ? 'border-brand-500' : 'border-ink-300')} />
      <span className="flex-1 min-w-0 text-[14px] font-semibold truncate">{label}</span>
      {hint && <span className={cx('text-[11px] shrink-0', tone === 'hot' ? 'text-brand-600 font-bold' : 'text-ink-500')}>{hint}</span>}
      <span className="text-ink-300">›</span>
    </button>
  );
}

export function TodayBrand() {
  const { db, brand } = useMe();
  if (!brand) return null;
  const teams = teamsOfBrand(db, brand.id).filter((t) => t.stage !== '종료').sort((a, b) => a.period.start.localeCompare(b.period.start));
  const proposals = db.proposals.filter((p) => p.toBrandId === brand.id && p.status === 'sent').length;
  const myApps = db.recruitApplications.filter((a) => a.brandId === brand.id && a.status === 'pending').length;

  const extra: { label: string; hint?: string; route: Route }[] = [];
  if (proposals) extra.push({ label: `받은 같이 하자 제안 ${proposals}건`, hint: '답장 기다리는 중', route: { name: 'proposals' } });
  db.recruitments
    .filter((r) => brand.savedRecruits?.includes(r.id) && recruitUrgency(r))
    .forEach((r) => extra.push({ label: `찜한 모집글: ${r.title}`, hint: `🔥 ${recruitUrgency(r)}`, route: { name: 'recruit', id: r.id } }));
  if (myApps) extra.push({ label: `지원한 모집글 ${myApps}건 결과 대기`, route: { name: 'tab', tab: 'recruits' } });

  if (!teams.length) {
    const ended = teamsOfBrand(db, brand.id).filter((t) => t.stage === '종료').sort((a, b) => b.period.end.localeCompare(a.period.end))[0];
    const hasNext = ended && db.teams.some((t) => t.name === ended.name && t.round === ended.round + 1);
    return (
      <section className="px-4 pt-4">
        {ended && !hasNext && (
          <button onClick={() => navigate({ name: 'team', id: ended.id, sub: 'wrap' })} className="w-full mb-3 rounded-3xl bg-brand-500 text-white p-5 text-left">
            <div className="text-[13px] text-white/70">{ended.name} {ended.round}회차가 끝났어요</div>
            <div className="text-xl font-extrabold leading-snug mt-1">팝업 리포트를 확인하고<br />{ended.round + 1}회차를 준비해 볼까요?</div>
            <div className="mt-3 text-[13px] font-bold">리포트 보기 ›</div>
          </button>
        )}
        <div className="rounded-3xl bg-ink-900 text-white p-5">
          <div className="text-[13px] text-white/60">{brand.name}님, 반가워요</div>
          <div className="text-xl font-extrabold leading-snug mt-1">아직 함께할 팀이 없어요.<br />이번 달 모집글부터 볼까요?</div>
          <button onClick={() => navigate({ name: 'tab', tab: 'recruits' })} className="mt-4 h-10 px-4 rounded-full bg-brand-500 font-bold text-sm">같이 열 팀 찾기</button>
        </div>
        <ProfileProgress />
        {extra.length > 0 && <ExtraList items={extra} />}
      </section>
    );
  }

  const t = teams[0];
  const prep = teamPrep(db, t, brand.id);
  const todo = prep.steps.filter((x) => !x.done).sort((a, b) => Number(!!b.mine) - Number(!!a.mine));
  const left = daysUntil(t.period.start);
  const live = t.stage === '운영 중';
  const sp = spaceById(db, t.spaceId);

  return (
    <section className="px-4 pt-4">
      <div className="rounded-3xl bg-ink-900 text-white p-5">
        <div className="flex items-center justify-between">
          <div className="text-[13px] text-white/60">{brand.name}님의 다음 팝업</div>
          <span className={cx('text-[11px] font-black px-2 py-0.5 rounded-full', live ? 'bg-emerald-400 text-ink-900' : 'bg-brand-500')}>{live ? '운영 중' : dday(t.period.start)}</span>
        </div>
        <button onClick={() => navigate({ name: 'team', id: t.id })} className="block text-left mt-1">
          <div className="text-[22px] font-extrabold leading-tight">{t.name}</div>
          <div className="text-[13px] text-white/70 mt-1">📍 {sp?.name ?? `${t.region} · 공간 미정`}</div>
        </button>
        <div className="mt-4">
          <div className="flex items-center justify-between text-[12px] mb-1.5">
            <span className="text-white/70">오픈 준비</span>
            <span className="font-bold">{prep.done}/{prep.steps.length}</span>
          </div>
          <div className="h-2 rounded-full bg-white/15 overflow-hidden">
            <div className="h-full rounded-full bg-brand-500" style={{ width: `${prep.pct}%` }} />
          </div>
          {(() => {
            const pp = popupById(db, t.popupId);
            return pp && pp.status === '예정' && waitCount(pp) > 0 ? (
              <div className="mt-3 text-[12px] font-semibold text-brand-200">🔔 벌써 {waitCount(pp)}명이 오픈 알림을 신청했어요</div>
            ) : null;
          })()}
          <div className="text-[12px] text-white/60 mt-2">
            {live ? '오늘도 매장을 지키는 중이에요. 근무표를 확인해 주세요.' : prep.done === prep.steps.length ? '준비 끝! 오픈만 남았어요 🎉' : left <= 7 ? `오픈까지 ${left}일, 남은 일을 서둘러 끝내요` : `오픈까지 ${left}일 남았어요`}
          </div>
        </div>
      </div>
      {(todo.length > 0 || extra.length > 0) && (
        <div className="mt-3 rounded-2xl bg-white border border-ink-100 px-4 py-1.5">
          <div className="flex items-center justify-between pt-2 pb-0.5">
            <span className="text-[13px] font-bold">오늘 할 일</span>
            <span className="text-[11px] text-ink-500">{todo.filter((x) => x.mine).length + extra.length}개 남음</span>
          </div>
          <div className="divide-y divide-ink-100">
            {todo.slice(0, 3).map((x) => (
              <TodoRow key={x.key} label={x.label} hint={x.mine ? '내 차례' : '팀 일'} tone={x.mine ? 'hot' : 'default'} onClick={() => navigate({ name: 'team', id: t.id, sub: x.sub })} />
            ))}
            {extra.map((e) => <TodoRow key={e.label} label={e.label} hint={e.hint} onClick={() => navigate(e.route)} />)}
          </div>
        </div>
      )}
      <ProfileProgress />
      {teams.length > 1 && (
        <button onClick={() => navigate({ name: 'tab', tab: 'myteam' })} className="mt-2 text-[12px] text-ink-500 flex items-center gap-1">
          <Icon name="team" className="w-3.5 h-3.5" /> 다른 팀 {teams.length - 1}곳도 준비 중이에요 ›
        </button>
      )}
    </section>
  );
}

function ExtraList({ items }: { items: { label: string; hint?: string; route: Route }[] }) {
  return (
    <div className="mt-3 rounded-2xl bg-white border border-ink-100 px-4 py-1 divide-y divide-ink-100">
      {items.map((e) => <TodoRow key={e.label} label={e.label} hint={e.hint} onClick={() => navigate(e.route)} />)}
    </div>
  );
}

// 앞으로 2주 동안 날짜별로 열려 있는 팝업. 주말 계획을 세우러 다시 들어올 이유가 된다.
function WeekStrip() {
  const { db } = useMe();
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(DEMO_TODAY + 'T00:00:00');
    d.setDate(d.getDate() + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { iso, dow: d.getDay(), date: d.getDate(), list: db.popups.filter((p) => p.status !== '종료' && p.period.start <= iso && iso <= p.period.end) };
  });
  const [sel, setSel] = useState(DEMO_TODAY);
  const day = days.find((d) => d.iso === sel)!;
  return (
    <div className="mt-3 rounded-2xl bg-white border border-ink-100 p-4">
      <div className="text-[14px] font-bold">날짜별 팝업 캘린더</div>
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar mt-2.5 -mx-1 px-1">
        {days.map((d) => (
          <button key={d.iso} onClick={() => setSel(d.iso)} className={cx('w-11 shrink-0 rounded-xl py-1.5 flex flex-col items-center', sel === d.iso ? 'bg-ink-900 text-white' : 'bg-ink-100/70')}>
            <span className={cx('text-[10px]', sel !== d.iso && (d.dow === 0 ? 'text-red-500' : d.dow === 6 ? 'text-blue-500' : 'text-ink-500'))}>{d.iso === DEMO_TODAY ? '오늘' : '일월화수목금토'[d.dow]}</span>
            <span className="text-[15px] font-bold leading-tight">{d.date}</span>
            <span className={cx('w-1.5 h-1.5 rounded-full mt-0.5', d.list.length ? 'bg-brand-500' : 'bg-transparent')} />
          </button>
        ))}
      </div>
      <div className="mt-2.5">
        {day.list.length === 0 && <div className="text-[13px] text-ink-500 py-1">이날 열린 공동 팝업이 없어요</div>}
        {day.list.map((p) => (
          <button key={p.id} onClick={() => navigate({ name: 'popup', id: p.id })} className="w-full flex items-center justify-between py-1.5 text-left">
            <span className="min-w-0">
              <span className="block text-[13px] font-semibold truncate">{p.title}</span>
              <span className="block text-[11px] text-ink-500">{spaceById(db, p.spaceId)?.name} · {p.hours}</span>
            </span>
            <span className="text-[11px] text-brand-600 font-bold shrink-0">{p.period.end === day.iso ? '마지막 날' : p.period.start === day.iso ? '첫날' : ''} ›</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function TodayVisitor() {
  const { db, visitor, userId } = useMe();
  if (!visitor) return null;
  const open = db.popups.filter((p) => p.status === '진행 중');
  const soon = db.popups.filter((p) => p.status === '예정').sort((a, b) => a.period.start.localeCompare(b.period.start));
  const stamp = db.stamps.find((x) => x.userId === userId);
  const got = stamp?.popupIds.length ?? 0;
  // 팔로우한 브랜드가 지금 열린(또는 곧 열릴) 팝업에 있으면 맨 위에 알려 준다
  const followed = [...open, ...soon]
    .map((p) => ({ p, b: teamById(db, p.teamId)?.members.map((m) => brandById(db, m.brandId)!).find((b) => visitor.following.includes(b.id)) }))
    .find((x) => x.b);

  return (
    <section className="px-4 pt-4">
      <div className="rounded-3xl bg-ink-900 text-white p-5">
        <div className="text-[13px] text-white/60">{visitor.nickname}님, 오늘은 어디 갈까요?</div>
        <div className="text-xl font-extrabold leading-snug mt-1">
          지금 열린 공동 팝업 <span className="text-brand-400">{open.length}곳</span>
          {soon.length > 0 && <>,<br />곧 열릴 팝업 {soon.length}곳</>}
        </div>
        {followed && (
          <button onClick={() => navigate({ name: 'popup', id: followed.p.id })} className="mt-4 w-full rounded-2xl bg-white/10 p-3 text-left flex items-center gap-3">
            <span className="text-2xl">💌</span>
            <span className="flex-1 min-w-0">
              <span className="block text-[13px] font-bold">팔로우한 {josa(followed.b!.name, '이', '가')} {followed.p.status === '진행 중' ? '지금 팝업 중이에요' : `${md(followed.p.period.start)}에 팝업을 열어요`}</span>
              <span className="block text-[12px] text-white/60 truncate">{followed.p.title} · {spaceById(db, followed.p.spaceId)?.name} · ~{md(followed.p.period.end)}</span>
            </span>
            <span className="text-white/40">›</span>
          </button>
        )}
        <button onClick={() => navigate({ name: 'tab', tab: 'stamps' })} className="mt-3 w-full text-left">
          <div className="flex items-center justify-between text-[12px] mb-1.5">
            <span className="text-white/70">스탬프 {Math.min(got, STAMP_GOAL)}/{STAMP_GOAL}</span>
            <span className="font-bold text-brand-200">{got >= STAMP_GOAL ? '혜택 배지를 받을 수 있어요 ›' : `${STAMP_GOAL - got}곳만 더 가면 혜택 배지 ›`}</span>
          </div>
          <div className="h-2 rounded-full bg-white/15 overflow-hidden">
            <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.min(100, (got / STAMP_GOAL) * 100)}%` }} />
          </div>
        </button>
      </div>
      <WeekStrip />
      {(() => {
        // 다녀왔는데 아직 리뷰를 안 쓴 팝업
        const todo = db.visits
          .filter((v) => v.userId === userId)
          .map((v) => popupById(db, v.popupId)!)
          .filter((p) => p && !db.comboReviews.some((c) => c.popupId === p.id && c.authorId === userId) && !db.reviews.some((r) => r.popupId === p.id && r.authorId === userId));
        if (!todo.length) return null;
        const p = todo[0];
        return (
          <button onClick={() => navigate({ name: 'popup', id: p.id })} className="mt-3 w-full rounded-2xl bg-brand-50 border border-brand-100 p-4 text-left flex items-center gap-3">
            <span className="text-2xl">✍️</span>
            <span className="flex-1 min-w-0">
              <span className="block text-[14px] font-bold truncate">{p.title} 어땠나요?</span>
              <span className="block text-[12px] text-ink-700">어떤 브랜드 조합이 좋았는지 남기면 다음 팝업 구성에 반영돼요</span>
            </span>
            <span className="text-ink-300">›</span>
          </button>
        );
      })()}
      {(() => {
        const feed = visitor.following
          .flatMap((id) => { const b = brandById(db, id); return (b?.news ?? []).map((n) => ({ b: b!, n })); })
          .sort((a, b) => b.n.at.localeCompare(a.n.at))
          .slice(0, 3);
        if (!feed.length) return null;
        return (
          <div className="mt-3 rounded-2xl bg-white border border-ink-100 px-4 py-1">
            <div className="text-[13px] font-bold pt-2.5">📣 팔로우한 브랜드 소식</div>
            <div className="divide-y divide-ink-100">
              {feed.map(({ b, n }) => (
                <button key={n.id} onClick={() => navigate({ name: 'brand', id: b.id })} className="w-full text-left py-2.5">
                  <span className="text-[12px] font-bold text-brand-600">{b.name}</span>
                  <span className="text-[11px] text-ink-500"> · {n.at.slice(5, 10).replace('-', '/')}</span>
                  <span className="block text-[14px] mt-0.5">{n.text}</span>
                </button>
              ))}
            </div>
          </div>
        );
      })()}
      {soon.length > 0 && (
        <div className="mt-3 rounded-2xl bg-white border border-ink-100 px-4 py-1 divide-y divide-ink-100">
          {soon.map((p) => {
            const on = !!p.waiters?.includes(userId);
            return (
              <div key={p.id} className="flex items-center gap-3 py-3">
                <span className="w-11 text-center shrink-0">
                  <span className="block text-[11px] font-black text-brand-600">{dday(p.period.start)}</span>
                  <span className="block text-[11px] text-ink-500">{md(p.period.start)}</span>
                </span>
                <button onClick={() => navigate({ name: 'popup', id: p.id })} className="flex-1 min-w-0 text-left">
                  <span className="block text-[14px] font-bold truncate">{p.title}</span>
                  <span className="block text-[12px] text-ink-500">{waitCount(p)}명이 기다려요</span>
                </button>
                <button onClick={() => toggleWaitlist(p.id, userId)} className={cx('h-8 px-3 rounded-full text-[12px] font-bold shrink-0', on ? 'bg-brand-50 text-brand-600' : 'bg-ink-900 text-white')}>
                  {on ? '🔔 켜짐' : '알림 받기'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function TodayLandlord() {
  const { db, landlord } = useMe();
  if (!landlord) return null;
  // 데모 기준일의 다음 달을 본다
  const today = DEMO_TODAY;
  const month = '2026-11';
  const open = db.availability.filter((a) => landlord.spaceIds.includes(a.spaceId) && a.status === 'open' && a.date > today && a.date.startsWith(month));
  const potential = open.reduce((sum, a) => sum + (spaceById(db, a.spaceId)?.dailyFee ?? 0), 0);
  const pending = db.spaceApplications.filter((a) => landlord.spaceIds.includes(a.spaceId) && a.status === 'pending' && a.direction === 'team').length;
  const seeking = db.recruitments.filter((r) => r.status !== '마감' && !r.spaceConfirmed).length + db.teams.filter((t) => t.confirmed && t.stage === '준비 중' && !t.spaceId).length;
  const next = db.popups.filter((p) => landlord.spaceIds.includes(p.spaceId) && p.status !== '종료').sort((a, b) => a.period.start.localeCompare(b.period.start))[0];

  return (
    <section className="px-4 pt-4">
      <div className="rounded-3xl bg-ink-900 text-white p-5">
        <div className="text-[13px] text-white/60">{landlord.name}님의 11월 · 공간 {landlord.spaceIds.length}곳 합계</div>
        <div className="text-xl font-extrabold leading-snug mt-1">
          비는 날 <span className="text-brand-400">{open.length}일</span>
          {potential > 0 && <><br />채우면 최대 {manwon(potential)}</>}
        </div>
        <div className="grid grid-cols-2 gap-2 mt-4">
          <button onClick={() => navigate({ name: 'tab', tab: 'inbox' })} className="rounded-2xl bg-white/10 p-3 text-left">
            <div className="text-[11px] text-white/60">공간을 찾는 팀</div>
            <div className="text-lg font-extrabold">{seeking}팀 ›</div>
          </button>
          <button onClick={() => navigate({ name: 'tab', tab: 'inbox' })} className="rounded-2xl bg-white/10 p-3 text-left">
            <div className="text-[11px] text-white/60">대기 중인 지원</div>
            <div className="text-lg font-extrabold">{pending}건 ›</div>
          </button>
        </div>
        {next && (
          <button onClick={() => navigate({ name: 'popup', id: next.id })} className="mt-3 w-full text-left text-[12px] text-white/70">
            {next.status === '진행 중' ? '🟢 지금 운영 중' : `📅 ${dday(next.period.start)}`} · {next.title} ({spaceById(db, next.spaceId)?.name}) ›
          </button>
        )}
      </div>
    </section>
  );
}

/** 새 브랜드용 프로필 완성도. 다 채울수록 추천에 더 잘 걸린다는 이유를 준다. */
export function ProfileProgress() {
  const { db, brand, user } = useMe();
  if (!brand) return null;
  const steps = [
    { label: '브랜드 소개 쓰기', done: brand.intro.trim().length >= 10 },
    { label: '무드·카테고리 태그 고르기', done: brand.tags.moods.length > 0 && brand.tags.categories.length > 0 },
    { label: '룩북 3장 이상 올리기', done: brand.lookbook.length >= 3 },
    { label: '인스타그램 연결', done: !!brand.instagram },
    { label: '팝업 가능 기간 정하기', done: brand.availability.length > 0 },
    { label: '사업자 인증', done: user?.verifyStatus === 'verified' },
  ];
  const done = steps.filter((x) => x.done).length;
  if (done === steps.length) return null;
  const next = steps.find((x) => !x.done)!;
  return (
    <button onClick={() => navigate({ name: 'tab', tab: 'me' })} className="mt-3 w-full rounded-2xl bg-white border border-ink-100 p-4 text-left">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-bold">프로필 완성도 {Math.round((done / steps.length) * 100)}%</span>
        <span className="text-[12px] text-brand-600 font-semibold">채우러 가기 ›</span>
      </div>
      <ProgressBar pct={(done / steps.length) * 100} className="mt-2" />
      <div className="text-[12px] text-ink-500 mt-2">다음: <b className="text-ink-900">{next.label}</b> · {user?.verifyStatus === 'verified' ? '태그와 룩북을 채울수록 궁합 추천이 정확해져요' : '사업자 인증이 끝나면 다른 브랜드 목록에 내 브랜드가 보여요'}</div>
    </button>
  );
}

export function TodayRental() {
  const { db, rental } = useMe();
  if (!rental) return null;
  const orders = db.rentalOrders.filter((o) => o.partnerId === rental.id);
  const requested = orders.filter((o) => o.status === 'requested').length;
  const active = orders.filter((o) => o.status === 'confirmed' || o.status === 'delivered');
  const earned = orders
    .filter((o) => o.status !== 'requested' && o.status !== 'rejected')
    .reduce((sum, o) => sum + rentalQuote(db, o.partnerId, o.lines, o.dates, o.delivery).total, 0);
  const items = db.rentalItems.filter((i) => i.partnerId === rental.id && i.active);
  const out = new Set(active.flatMap((o) => o.lines.map((l) => l.itemId)));
  const r = partnerRating(db, rental.id);
  // 아직 렌탈 예약이 없는, 곧 열리는 팀 = 영업 기회
  const prospects = db.teams.filter((t) => t.stage === '준비 중' && !db.rentalOrders.some((o) => o.teamId === t.id)).length;

  return (
    <section className="px-4 pt-4">
      <div className="rounded-3xl bg-ink-900 text-white p-5">
        <div className="text-[13px] text-white/60">{rental.name} · 지금까지 제휴 매출</div>
        <div className="text-2xl font-extrabold mt-1">{won(earned)}</div>
        <div className="text-[12px] text-white/60 mt-1">완료 {r.done}건{r.avg !== null ? ` · 평점 ★ ${r.avg.toFixed(1)}` : ''} · 수수료 0원</div>
        <div className="grid grid-cols-3 gap-2 mt-4">
          <button onClick={() => navigate({ name: 'tab', tab: 'orders' })} className="rounded-2xl bg-white/10 p-3 text-left">
            <div className="text-[11px] text-white/60">새 요청</div>
            <div className={cx('text-lg font-extrabold', requested > 0 && 'text-brand-400')}>{requested}건</div>
          </button>
          <button onClick={() => navigate({ name: 'tab', tab: 'orders' })} className="rounded-2xl bg-white/10 p-3 text-left">
            <div className="text-[11px] text-white/60">대여 중</div>
            <div className="text-lg font-extrabold">{active.length}건</div>
          </button>
          <button onClick={() => navigate({ name: 'tab', tab: 'myitems' })} className="rounded-2xl bg-white/10 p-3 text-left">
            <div className="text-[11px] text-white/60">쉬는 장비</div>
            <div className="text-lg font-extrabold">{items.filter((i) => !out.has(i.id)).length}종</div>
          </button>
        </div>
      </div>
      {active.length > 0 && (
        <div className="mt-3 rounded-2xl bg-white border border-ink-100 p-4">
          <div className="text-[14px] font-bold mb-1">다가오는 {active.some((o) => o.delivery) ? '배송·회수' : '대여'} 일정</div>
          {[...active].sort((a, b) => a.dates.start.localeCompare(b.dates.start)).slice(0, 3).map((o) => {
            const started = o.dates.start <= DEMO_TODAY;
            const who = o.teamId ? teamById(db, o.teamId)?.name : brandById(db, o.brandId)?.name;
            return (
              <button key={o.id} onClick={() => navigate({ name: 'tab', tab: 'orders' })} className="w-full flex items-center gap-3 py-2 text-left border-t border-ink-100 first:border-t-0">
                <span className="w-12 shrink-0 text-center rounded-lg bg-brand-50 text-brand-600 text-[12px] font-extrabold py-1">{dday(started ? o.dates.end : o.dates.start)}</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[13px] font-semibold truncate">{who}</span>
                  <span className="block text-[11px] text-ink-500">{started ? `${o.delivery ? '회수' : '반납'} ${md(o.dates.end)}` : `${o.delivery ? '배송' : '수령'} ${md(o.dates.start)}`} · 장비 {o.lines.reduce((n, l) => n + l.qty, 0)}개</span>
                </span>
                <span className="text-ink-300">›</span>
              </button>
            );
          })}
        </div>
      )}
      {prospects > 0 && (
        <div className="mt-3 rounded-2xl bg-white border border-ink-100 p-4">
          <div className="text-[14px] font-bold">곧 팝업을 여는 팀 {prospects}곳이 아직 장비를 안 빌렸어요</div>
          <p className="text-[12px] text-ink-500 mt-1">이 팀들의 렌탈 탭에 내 장비가 보이고 있어요. 제휴가와 재고를 미리 점검해 두세요.</p>
          <button onClick={() => navigate({ name: 'tab', tab: 'myitems' })} className="mt-2 text-[13px] font-bold text-brand-600">내 장비 가격 보기 ›</button>
        </div>
      )}
    </section>
  );
}
