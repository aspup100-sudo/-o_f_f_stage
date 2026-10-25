// 둘러보기 맨 위 '오늘' 영역: 내 팝업까지 남은 날과 지금 해야 할 일을 모아 보여 준다.
import { useMe } from '@/store/hooks';
import { navigate } from '@/store/store';
import { daysUntil, dday, spaceById, teamPrep, teamsOfBrand } from '@/store/logic';
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
  if (myApps) extra.push({ label: `지원한 모집글 ${myApps}건 결과 대기`, route: { name: 'tab', tab: 'recruits' } });

  if (!teams.length) {
    return (
      <section className="px-4 pt-4">
        <div className="rounded-3xl bg-ink-900 text-white p-5">
          <div className="text-[13px] text-white/60">{brand.name}님, 반가워요</div>
          <div className="text-xl font-extrabold leading-snug mt-1">아직 함께할 팀이 없어요.<br />이번 달 모집글부터 볼까요?</div>
          <button onClick={() => navigate({ name: 'tab', tab: 'recruits' })} className="mt-4 h-10 px-4 rounded-full bg-brand-500 font-bold text-sm">같이 열 팀 찾기</button>
        </div>
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
