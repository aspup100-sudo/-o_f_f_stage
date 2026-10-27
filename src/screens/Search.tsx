// 통합 검색. 브랜드·공간·팝업·모집글·매거진·Q&A를 한 번에 찾는다.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useMe } from '@/store/hooks';
import { back, navigate } from '@/store/store';
import { brandById, period } from '@/store/logic';
import { Icon } from '@/components/ui';
import { BrandLogo } from '@/components/common';
import type { DB } from '@/data/mock';
import type { Route } from '@/types';

const RECENT_KEY = 'offstage-recent-search';

function loadRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
}
function saveRecent(list: string[]) {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)); } catch { /* noop */ }
}

/** 공백·대소문자 무시하고 모든 단어가 들어 있으면 맞는 것으로 본다 */
function matcher(q: string) {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  return (...fields: (string | undefined)[]) => {
    const hay = fields.filter(Boolean).join(' ').toLowerCase().replace(/#/g, '');
    return words.every((w) => hay.includes(w.replace(/^#/, '')));
  };
}

type Hit = { key: string; route: Route; title: string; sub: string; lead?: ReactNode };

function search(db: DB, q: string): { label: string; hits: Hit[] }[] {
  const m = matcher(q);
  const brands: Hit[] = db.brands
    .filter((b) => m(b.name, b.intro, ...b.tags.moods, ...b.tags.categories, b.tags.price, ...b.tags.ages))
    .map((b) => ({ key: b.id, route: { name: 'brand', id: b.id }, title: b.name, sub: [b.tags.moods.map((x) => '#' + x).join(' '), b.tags.categories.join(', ')].filter(Boolean).join(' · '), lead: <BrandLogo brand={b} size={36} /> }));
  const popups: Hit[] = db.popups
    .filter((p) => {
      const team = db.teams.find((t) => t.id === p.teamId);
      const sp = db.spaces.find((s) => s.id === p.spaceId);
      return m(p.title, sp?.name, sp?.region, ...(team?.members.map((x) => brandById(db, x.brandId)?.name) ?? []));
    })
    .map((p) => {
      const sp = db.spaces.find((s) => s.id === p.spaceId);
      return { key: p.id, route: { name: 'popup', id: p.id }, title: p.title, sub: `${p.status} · ${period(p.period)} · ${sp?.region ?? ''}` };
    });
  const recruits: Hit[] = db.recruitments
    .filter((r) => m(r.title, r.intro, r.region, brandById(db, r.hostBrandId)?.name))
    .map((r) => ({ key: r.id, route: { name: 'recruit', id: r.id }, title: r.title, sub: `${r.status} · ${r.region} · ${period(r.period)}` }));
  const spaces: Hit[] = db.spaces
    .filter((s) => m(s.name, s.region, s.address, s.intro, ...(s.keywords ?? [])))
    .map((s) => ({ key: s.id, route: { name: 'space', id: s.id }, title: s.name, sub: `${s.region} · ${s.areaM2}㎡ · 1일 ${Math.round(s.dailyFee / 10000)}만원` }));
  const mags: Hit[] = db.magazines
    .filter((x) => m(x.title, x.subtitle))
    .map((x) => ({ key: x.id, route: { name: 'magazine', id: x.id }, title: x.title, sub: x.subtitle }));
  const qna: Hit[] = db.qnaPosts
    .filter((x) => !x.hidden && m(x.title, x.body, x.tag))
    .map((x) => ({ key: x.id, route: { name: 'qna', id: x.id }, title: x.title, sub: `Q&A · ${x.tag}` }));
  return [
    { label: '브랜드', hits: brands },
    { label: '팝업', hits: popups },
    { label: '모집글', hits: recruits },
    { label: '공간', hits: spaces },
    { label: '매거진', hits: mags },
    { label: 'Q&A', hits: qna },
  ].filter((g) => g.hits.length);
}

export function SearchScreen() {
  const { db } = useMe();
  const [q, setQ] = useState('');
  const [recent, setRecent] = useState<string[]>(loadRecent);
  const [more, setMore] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { input.current?.focus(); }, []);

  const query = q.trim();
  const groups = useMemo(() => (query ? search(db, query) : []), [db, query]);
  const total = groups.reduce((n, g) => n + g.hits.length, 0);

  // 자주 쓰인 무드를 추천 검색어로
  const popular = useMemo(() => {
    const count = new Map<string, number>();
    db.brands.forEach((b) => b.tags.moods.forEach((t) => count.set(t, (count.get(t) ?? 0) + 1)));
    return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([t]) => t);
  }, [db.brands]);

  const remember = (word: string) => {
    const next = [word, ...recent.filter((x) => x !== word)].slice(0, 8);
    setRecent(next);
    saveRecent(next);
  };
  const open = (h: Hit) => { if (query) remember(query); navigate(h.route); };

  return (
    <div>
      <div className="sticky top-0 z-20 bg-white border-b border-ink-100 h-14 flex items-center gap-1 px-2">
        <button onClick={back} className="w-10 h-10 flex items-center justify-center text-ink-900 shrink-0" aria-label="뒤로"><Icon name="back" /></button>
        <form className="flex-1 flex items-center h-10 px-3 rounded bg-ink-100" onSubmit={(e) => { e.preventDefault(); if (query) remember(query); input.current?.blur(); }}>
          <input
            ref={input}
            value={q}
            onChange={(e) => { setQ(e.target.value); setMore(null); }}
            placeholder="브랜드, 무드, 동네, 공간 이름"
            aria-label="검색어"
            enterKeyHint="search"
            className="flex-1 min-w-0 bg-transparent outline-none text-[15px] placeholder:text-ink-400"
          />
          {q && <button type="button" onClick={() => { setQ(''); input.current?.focus(); }} className="text-[13px] text-ink-500 pl-2" aria-label="검색어 지우기">지우기</button>}
        </form>
      </div>

      {!query && (
        <div className="p-4">
          {recent.length > 0 && (
            <div className="mb-7">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[15px] font-extrabold">최근 검색어</h3>
                <button className="text-[12px] text-ink-500" onClick={() => { setRecent([]); saveRecent([]); }}>전체 삭제</button>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-2">
                {recent.map((w) => <button key={w} onClick={() => setQ(w)} className="text-[14px] text-ink-700">{w}</button>)}
              </div>
            </div>
          )}
          <h3 className="text-[15px] font-extrabold mb-2">많이 찾는 무드</h3>
          <div className="flex flex-wrap gap-x-3 gap-y-2">
            {popular.map((t) => <button key={t} onClick={() => setQ(t)} className="text-[14px] font-semibold text-ink-900">#{t}</button>)}
          </div>
          <h3 className="text-[15px] font-extrabold mt-7 mb-2">동네</h3>
          <div className="flex flex-wrap gap-x-3 gap-y-2">
            {[...new Set(db.spaces.map((s) => s.region))].map((r) => <button key={r} onClick={() => setQ(r)} className="text-[14px] text-ink-700">{r}</button>)}
          </div>
        </div>
      )}

      {query && total === 0 && (
        <div className="px-4 py-16 text-center">
          <div className="text-[15px] font-bold">'{query}' 결과가 없어요</div>
          <div className="text-[13px] text-ink-500 mt-1">무드(#미니멀)나 동네(성수동)로 찾아보세요</div>
        </div>
      )}

      {query && total > 0 && (
        <div className="pb-8">
          <div className="px-4 pt-3 text-[12px] text-ink-500">결과 {total}개</div>
          {groups.map((g) => {
            const shown = more === g.label ? g.hits : g.hits.slice(0, 4);
            return (
              <section key={g.label} className="mt-4">
                <h3 className="px-4 text-[15px] font-extrabold mb-1">{g.label} <span className="text-ink-400 font-semibold">{g.hits.length}</span></h3>
                <div className="divide-y divide-ink-100 border-b border-ink-100">
                  {shown.map((h) => (
                    <button key={h.key} onClick={() => open(h)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
                      {h.lead}
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] font-bold truncate">{h.title}</div>
                        <div className="text-[12px] text-ink-500 truncate mt-0.5">{h.sub}</div>
                      </div>
                    </button>
                  ))}
                </div>
                {g.hits.length > shown.length && (
                  <button onClick={() => setMore(g.label)} className="w-full py-2.5 text-[13px] text-ink-700 border-b border-ink-100">{g.label} {g.hits.length - shown.length}개 더 보기</button>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
